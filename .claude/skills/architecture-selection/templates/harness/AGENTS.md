# [サービス名]

<!-- ここには機械で強制できないルールだけを書く。型、lint、依存ルール、テスト、フックで守れるものは、そちらに書く。 -->

## 最初に読むもの

- `ARCHITECTURE.md`: 構造の段階([小規模 / 中規模以上])、技術スタック、feature の一覧
- `docs/adr/`: 決定とその理由。ADR と矛盾する変更をするときは、先に新しい ADR を提案する
- 作業する feature の `README.md` と `AGENTS.md`(中規模以上は `src/api/features/<feature>/`)
- 画面を作るとき: `DESIGN.md` と、使っているデザインシステムの DESIGN.md(ARCHITECTURE.md の「技術スタック」のデザインシステムの行に書いた場所)

## コマンド

コマンドはすべて `make` で叩く。`pnpm`、`npx`、各ツールを直接叩かない。一覧は `make help`。足りないターゲットは、`Makefile`(保護パス)に足すことを提案する。

| 目的 | コマンド |
| --- | --- |
| 初回の準備 / 依存を入れる | `make setup` / `make install` |
| 開発サーバー | `make dev` |
| 完了前に必ず通す | `make check` |
| 整形 | `make format` |
| lint / 依存ルール | `make lint` / `make lint-deps` |
| 型チェック | `make typecheck` |
| テスト | `make test` |
| E2E(手動) | `make test-e2e` |
| 生成コードの更新(スキーマや契約を変えた後) | `make generate` |
| 依存の追加と削除(承認が要る) | `make add pkg="<名前>"` / `make add-dev pkg="<名前>"` / `make add-dev-exact pkg="<名前>"` / `make remove pkg="<名前>"` |
| 版の鮮度 | `make check-versions` |
| デザインシステムの部品の取り込み(承認が要る。使うときだけ) | `make ui-add name="<名前>"` / `make ui-update name="<名前>"` |

## 作業の進め方

- 作業の開始時に作業の種類(機能の追加、バグの修正、リファクタリング、テストの追加)を決め、その範囲の外のファイルを編集する必要が出たら、編集する前に確認する。
- 期待する振る舞いをテストに先に書き、それを満たす実装を書く。
- `make check` が通らない状態で完了と報告しない。
- 検査を通すためにルールを無効化しない(lint の無効化コメント、依存ルールの除外、型アサーション)。必要なら理由を添えて確認する。
- `modules/` や技術の層(`domain/`、`application/`、`infrastructure/`、`ports.ts`、feature の外のリポジトリ層)を作らない。ドメインモデルを `src/shared/` に置かない(中規模以上は `src/api/features/<feature>/entity.ts`)。ワークスペース(`apps/`、`packages/`、`pnpm-workspace.yaml` の `packages`)も作らない。必要に感じたら ADR の昇格条件を確かめ、提案する。

## 書き方

- コードには How、テストには What、コミットログには Why、コードコメントには Why not を書く。
- コミットメッセージは Conventional Commits に従う。

## 承認が要る操作

- 本番や共有環境へのマイグレーションの適用、データの削除、本番へのデプロイ
- メール、チャット、外部サービスへの送信やコメント
- 権限、課金、シークレット、Webhook の設定変更
- 保護パスの編集(`ARCHITECTURE.md` の「編集制約」を参照)

## 間違いを見つけたら

自分や他のエージェントの誤りに気づいたら、`docs/feedback/LESSONS.md` に記録する。
