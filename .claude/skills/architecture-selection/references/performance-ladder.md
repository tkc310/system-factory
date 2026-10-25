# 性能対策の段階

[技術選定](./tech-selection.md#typescript-の中で性能を上げる段階) の「TypeScript の中で性能を上げる段階」を、実施の手順まで書き下したもの。**上の段階から順に試し、測定で不足が確認できたときだけ次へ進む。** 段階は前の段階を置き換えず、積み重ねる。

**必須**

- 各段階に進んだ根拠(測定の結果)を ARCHITECTURE.md の「性能対策の段階」に書く。段階 3 以上は ADR も書く。
- 段階 4 と 5 は、ビルドの工程と保守する言語が増えるので、エージェントが自分で決めず、ユーザーに確認する。

## まずボトルネックの種類を見分ける

| 症状 | 種類 | 効く段階 |
| --- | --- | --- |
| 外部 API や DB の待ちが長い、同時接続が多い | I/O の待ち | 1、2 |
| CPU 使用率が張り付く、イベントループが止まる | CPU 処理 | 1、3、4 |
| メモリや GC の停止が要件に合わない、長時間動く大量の並行処理 | 実行環境の特性 | 3、5 |

Effect の Fiber は**一つのスレッドで動く軽量な並行処理**であり、CPU を複数コアで並列に使うものではない。CPU 処理を速くするには段階 3 か 4 が要る。

## 1. 基本の対策(常に最初)

- 測定: OpenTelemetry のトレース、DB のスロークエリログ、負荷試験(k6 など)、プロファイラ。
- 対策: インデックス、N+1 の解消、ページング、キャッシュ(HTTP、CDN)、重い処理のジョブ(BullMQ)への分離、水平スケール。
- ほとんどの案件はこの段階で要件を満たす。次へ進むときは測定結果を残す。

## 2. I/O の並行処理(Effect)

- 対象: 多数の外部呼び出しの並行実行、タイムアウト、再試行、キャンセル、流量の制御、ストリーム処理。
- 手段: Effect の Fiber による構造化された並行処理、並行数の上限、`Stream`(背圧つき)、`Schedule`(再試行)。
- 範囲: Effect は該当する command / query の中だけで使う。公開 API の境界では Promise と Zod のスキーマを持つプレーンなデータに戻し、他の feature に Effect の型を漏らさない。エラー処理の方針(判別可能なユニオン、採用したサービスでは neverthrow)は変えない。
  - 理由: 導入範囲を性能の要る箇所に限れば、学習コストと書き方の混在を抑えられる。
- Effect は版によって API 名が変わる(v4 は 2026 年 9 月に安定版)。導入時に公式ドキュメントで現行の書き方を確認する。

## 3. CPU の並列処理(Worker)

- 対象: 画像処理、集計、パースなど、イベントループを止める CPU 処理。
- 手段: Node.js の `worker_threads`(Effect の Worker、Piscina などのプール)。常時重いなら、ジョブとして別プロセスのワーカーに逃がす。
- 構成: Worker の入口は `src/workers/` に置き、メッセージの形を Zod のスキーマで定義する。依存の表と `.dependency-cruiser.cjs` に `src/workers/` のルールを足す。

## 4. WebAssembly(ホットパスだけ)

- 対象: Worker に移しても遅い計算の中心部分(数値計算、圧縮、暗号、パーサなど)。
- 手段: Rust と wasm-bindgen(wasm-pack)を既定とする。TypeScript に近い書き方を優先するなら AssemblyScript。
- 原則:
  - WebAssembly にするのは**純粋な計算関数**だけ。I/O と業務ルールは TypeScript に残す。
  - Rust のソースは `wasm/<name>/` に置き、wasm-pack の出力を `src/generated/wasm-<name>/` に書き出す。別の npm パッケージやワークスペースにはしない([構造](./principles.md#ワークスペースを使わない共通))。TypeScript の薄いラッパーで包んで、外からは普通の関数に見せる。
  - TypeScript の実装と結果が一致するかを確かめるテスト(差分テスト)と、ベンチマークを置く。

## 5. Go(該当する feature だけ切り出す)

- 条件: 段階 1〜4 で要件を満たせないことを測定で示せる。または、単一バイナリでの配布など、運用上の明確な理由がある。
- 原則([技術選定](./tech-selection.md#go-を選ぶとき) に従う):
  - 切り出すのは、測定で特定した feature だけ。サービス全体を置き換えない。
  - TypeScript との境界は OpenAPI で定義し、双方の型を生成する(openapi-typescript、oapi-codegen など)。手書きの型を作らない。
  - ルーティングは標準の `net/http` から始める。DB アクセスは sqlc と pgx。
  - Go 側にもハーネスを置く: gofumpt、golangci-lint、`go test -race`、OpenAPI に対する契約テスト。Go のコマンドも同じ `Makefile` のターゲットにし(`make check` から Go の検査も呼ぶ)、入口を一つに保つ。
- 構成:

```
contracts/openapi.yaml       # 契約の正本
src/generated/<name>-client/ # 生成した TypeScript クライアント。手で編集しない
services/<name>/             # Go のサービス
  cmd/<name>/main.go
  internal/
  go.mod
  .golangci.yml
```

- 切り出しを容易にするため、中規模以上では、切り出し候補の feature が他の feature とテーブルやトランザクションを共有しない状態を保つ([技術選定](./tech-selection.md#go-のサービスへ切り出せる状態を保つ))。
