# 出力の自己点検

出力を渡す前にすべて確認する。満たせない項目は、理由をユーザーに伝える。

## 前提と判定
- [ ] ヒアリングの回答と、推測・仮定した項目(見直す条件つき)が ARCHITECTURE.md の「前提条件」にある
- [ ] 構造の段階の判定に使った回答(人数、業務領域の数、ルールの複雑さと変更頻度)が ADR にある
- [ ] 要件を満たす中で単純な段階を選んでいる。`modules/`、`domain/`、`ports.ts`、feature の外のリポジトリ層、DI を作っていない
- [ ] ワークスペースを使っていない(`package.json` はリポジトリ直下の 1 つだけ、`apps/` と `packages/` がない、`pnpm-workspace.yaml` に `packages` と `catalog` がない)
- [ ] 中規模以上では、1 つの機能が `src/components/features/`、`src/api/features/`、`src/shared/features/` で同じ feature 名になっている
- [ ] 昇格と降格の条件が ADR にある

## 技術スタックと性能
- [ ] 採用するライブラリの現行リリースと保守状況を公式の情報で確認した。版は ARCHITECTURE.md にだけ書いた
- [ ] `.npmrc` の `registry` が `https://npm.flatt.tech/`(Takumi Guard)で、`pnpm-workspace.yaml` に `trustPolicy: no-downgrade` がある。どちらにもトークンがなく、どちらも保護パスと CODEOWNERS にある。`packageManager` の pnpm が 10.21 以上
- [ ] コマンドの入口が `Makefile` にあり、AGENTS.md・CI・lefthook・権限の規則が `make <ターゲット>` を指している。`pnpm` や各ツールを直接叩く手順が文書に残っていない。値を渡すターゲットは値を環境変数で受け、形を確かめている
- [ ] `make check-versions` で、依存、Node.js(LTS)、GitHub Actions に古いものとプレリリースがない。最新にしないものは理由が ADR にある
- [ ] 既定から外した項目には、測定の結果か要件上の理由がある
- [ ] 性能対策の段階を上げた場合、各段階の根拠(測定結果か測定の計画)がある
- [ ] 段階 4 以上と、oxlint・oxfmt 以外の Oxc ツールの採用は、ユーザーに確認した
- [ ] 画面があるとき、デザインシステムの選択(A / B / C / D)と理由が ADR にある。B と C では、レジストリの URL と名前空間を導入時に確かめ、DESIGN.md を置き、取り込んだ部品の置き場所を保護パスにした。D では、ワークスペースもリポジトリも作らず、部品を `src/components/ui/`、トークンを `src/styles/foundation/` に置き、生成物をコミットして `ds-check` を `check` に含め、生成物を保護パスにした
- [ ] C を選んだとき、新しいリポジトリを作る前にユーザーの承認を得た
- [ ] Effect を使う場合、範囲が段階 2 の対象に限られ、公開 API に Effect の型が出ていない

## 構造とハーネス
- [ ] ディレクトリ構成と `.dependency-cruiser.cjs` の段階が一致している
- [ ] 画面があるとき、`ui/` が [コンポーネントの構造](./component-structure.md) に沿っている(PascalCase のディレクトリ、`index.tsx`、親子の入れ子、`shared/ui/` と `shared/ui/ds/`、D のときは `components/ui/` の分け方)
- [ ] 各 feature に `README.md` がある。中規模以上では加えて `AGENTS.md` と、所有するテーブルの一覧がある
- [ ] 空の雛形で `make check` が通る
- [ ] 境界違反のファイルを置くと `make lint-deps` が失敗する(確認後に削除した)
- [ ] CI に品質ゲートの必須ステージ(フォーマット、lint と依存ルール、型、テストとカバレッジ、生成コードの差分、ビルド)がある
- [ ] 保護パスが二つ以上の仕組み(フック、CODEOWNERS とブランチ保護など)で守られている
- [ ] `AGENTS.md` には、機械で強制できないルールだけが書かれている
- [ ] `docs/feedback/LESSONS.md` と、指摘をルールに昇格させる運用がある

## ADR
- [ ] 1 本の ADR に 1 つの決定。段階 3 以上の性能対策、Go、デザインシステムの選択、既定からの逸脱は別の ADR にした
- [ ] 検討した代替案と、採らなかった理由がある
- [ ] 状態(提案 / 承認 / 置換 / 廃止)と日付がある
