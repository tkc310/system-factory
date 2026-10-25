# 構造の段階の選び方

構造は「小規模」と「中規模以上」の 2 段階から選ぶ。決め手は画面数やテーブル数ではなく、**開発人数**と**独立した業務領域の数**である。要件を満たす中で単純な方を選ぶ。どちらの段階も、コードを機能(feature)で分け、モジュール(`modules/`)や技術の層(`domain/`、`application/`、`infrastructure/`)では分けない。

| 段階 | 形 | 層 | 典型的な案件(判定は下の「判定」に従う) |
| --- | --- | --- | --- |
| 小規模 | `src/features/<feature>/` の Vertical Slice + CQS。1 つの feature の画面とサーバーの処理を 1 つのディレクトリに置く | なし。command / query から ORM を直接使う | 1〜2 人、業務領域が 2 つ以下 |
| 中規模以上 | `src/components/features/`、`src/server/features/`、`src/shared/features/` の 3 か所に、同じ名前の feature を置く。テーブルの所有と feature ごとの `AGENTS.md` を加える | なし。小規模と同じく ORM を直接使う | 3 人以上、または独立した業務領域が 3 つ以上 |

- どちらの段階でも、モノレポのワークスペース(pnpm の `packages`、`apps/` と `packages/` への分割)を使わない。1 つのリポジトリを 1 つのパッケージにする([構造](./principles.md#ワークスペースを使わない共通))。

## 判定

**必須**

1. 次の**どちらか**に当たるなら **中規模以上**。
   - 3 人以上で開発する
   - 独立して変化する業務領域(会員、請求、在庫など)が 3 つ以上ある
2. 当たらなければ **小規模**。

- 判定に使った回答と、選んだ段階を ARCHITECTURE.md と ADR に書く。
- 境界上にあり、どちらも同程度に妥当なときは、ユーザーに確認する。回答が得られないときは小規模を選び、昇格の条件を ADR に書く。
  - 理由: ディレクトリの分け方は後から広げられるが、使われない区分けを畳む変更は影響範囲が広い。
- 業務ルールが複雑(状態遷移、不変条件、計算)なことは、段階を上げる理由にしない。ルールは純粋関数に集め、段階に応じた置き場所に置く(小規模は `services/`、中規模以上は `src/shared/features/<feature>/`)。
  - 理由: ルールの複雑さに効くのは層の数ではなく、I/O から切り離した純粋関数とそのテストである。

## 段階による違い

| 項目 | 小規模 | 中規模以上 |
| --- | --- | --- |
| feature の置き場所 | `src/features/<feature>/` の 1 か所 | 画面は `src/components/features/<feature>/`、サーバーの処理は `src/server/features/<feature>/`、両方で使う型・スキーマ・純粋関数は `src/shared/features/<feature>/` |
| 公開 API(`index.ts`) | `src/features/<feature>/index.ts`。query と service | `src/server/features/<feature>/index.ts`。query と service、入出力の型 |
| 他の feature の command を呼ぶ | 不可(`app/` からだけ) | 不可(`app/` からだけ) |
| テーブル | 書き込みは自分の feature が所有するテーブルだけ。query の JOIN は可 | 自分の feature のテーブルだけを読み書きする。他の feature への JOIN と外部キーは作らない |
| テーブル定義の置き場所 | `src/shared/db/schema/` | `src/server/features/<feature>/tables.ts` |
| DB 接続と認証 | `src/shared/db/`、`src/shared/auth/` | `src/server/db/`、`src/server/auth/` |
| 業務ルール(純粋関数) | `services/` | `src/shared/features/<feature>/` |
| feature ごとの `AGENTS.md` | 不要 | 必須(`src/server/features/<feature>/AGENTS.md`) |
| エラー処理 | 判別可能なユニオン | 判別可能なユニオン。期待される失敗が多い feature では neverthrow を検討([技術選定](./tech-selection.md#エラー処理の方針)) |
| 依存ルール | `templates/harness/dependency-cruiser/small.cjs` | `templates/harness/dependency-cruiser/medium.cjs` |

中規模以上で画面とサーバーの処理を分けて置くのは、クライアントに届くコードとサーバーだけで動くコードの境界を、ディレクトリと依存ルールで示すためである。3 か所の feature は同じ名前にするので、ある機能に関係するファイルは名前で検索すれば漏れなく見つかる。

中規模以上でテーブルの所有を必須にするのは、複数人が並行して変更しても影響範囲が feature に収まり、後で [Go のサービスへ切り出せる状態](./tech-selection.md#go-のサービスへ切り出せる状態を保つ) を保てるからである。

## 段階の変更

**必須**

- 段階を変えるときは、新しい ADR を書き、ARCHITECTURE.md の変更履歴に残す。

**昇格の目安**

| 変更 | 目安 |
| --- | --- |
| 小規模 → 中規模以上 | 開発者が 3 人以上になった。業務領域が 3 つ以上になった。feature 間の query の JOIN が増え、どの feature がどのテーブルを変えるか追えなくなった |

- 昇格では、各 feature の `ui/` を `src/components/features/<feature>/` に、それ以外を `src/server/features/<feature>/` に移し、画面とサーバーの両方で使う型・スキーマ・純粋関数を `src/shared/features/<feature>/` に切り出す。テーブル定義は所有する feature の `tables.ts` に分ける。

**降格の目安**

| 変更 | 目安 |
| --- | --- |
| 中規模以上 → 小規模 | 開発者が 2 人以下になり、業務領域も 2 つ以下に減った |
