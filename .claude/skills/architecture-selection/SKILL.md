---
name: architecture-selection
description: 新規サービスのアーキテクチャと技術スタックを選定し、ARCHITECTURE.md・ディレクトリ構成・ハーネス雛形(型/lint/依存ルール/テスト/フック)・ADRを出力する。既存の ARCHITECTURE.md の調整や、コードベースの構造レビューにも使う。フルスタックTypeScriptを既定とし、構造を規模で小規模/中規模以上の2段階から選び(どちらも feature で分け、ワークスペースは使わない)、性能要件があるときだけ Effect / Worker / WebAssembly / Go の順に検討する。画面があるときはデザインシステムを 8341-ui を使わない / 使う / 作って共有する / カスタマイズしてプロダクトに組み込む から選ぶ。Use when choosing architecture or tech stack, scaffolding a codebase for AI-driven development, or reviewing a codebase's structure.
---

# アーキテクチャ選定スキル

要件を聞き取り、**要件を満たす中で最も単純な構造**を選び、境界を機械で守る雛形まで出力する。ルールの本文は `references/` にある。最初に `references/README.md` を読み、作業に要る文書だけを読む。

## 出力

| 出力 | 置き場所(対象リポジトリ) | 雛形 |
| --- | --- | --- |
| 技術スタック、アーキテクチャ、ディレクトリ構成の要約 | `ARCHITECTURE.md` | `templates/ARCHITECTURE.md` |
| 決定とその理由 | `docs/adr/NNNN-<title>.md` | `templates/adr.md` |
| 画面の設計の前提(デザインシステムを使うとき) | `DESIGN.md` | 8341-ui の `templates/PRODUCT-DESIGN.md` |
| ディレクトリ構成 | 実ディレクトリ(空のものは `.gitkeep`)と各 feature の `README.md`・`AGENTS.md`(AGENTS.md は中規模以上) | `references/principles.md`、`templates/feature-AGENTS.md` |
| ハーネス | リポジトリ直下の設定ファイル群 | `templates/harness/` |

ARCHITECTURE.md には採った値と外した理由だけを書き、ルールの本文は書き写さない。決定の経緯は ADR に書き、ARCHITECTURE.md からリンクする。

## ルールの優先順位

承認とセキュリティのルール(`references/human-approval.md`、`references/security.md`)、編集制約、品質ゲート、それ以外の文書の順で採る。各ルールの「必須」は原則として採り、外すときは理由を ARCHITECTURE.md と ADR に書く。

## 作業モード

### モード 1: 新規作成

1. **ヒアリング**(`references/hearing.md`)。リポジトリから分かることを先に調べ、推測できない項目だけを一度にまとめて質問する。回答を要約して確認してから先に進む。
2. **構造の段階**(`references/scale-selection.md`)。小規模か中規模以上かを判定する。境界上でどちらも同程度に妥当なときは、ユーザーに確認する。
3. **技術スタック**(`references/tech-selection.md`)。既定から外れる項目を決める。採用するライブラリは、公式ドキュメントで現行のリリースと導入手順を確認してから書く。記憶で版や設定を書かない。依存は `make add pkg="<名前>"`(中身は `pnpm add`)で最新の安定版を入れ、プレリリース(`-rc`、`-beta`、`canary` など)を選ばない。依存を入れる前に、ハーネスの `.npmrc`(Takumi Guard)と `pnpm-workspace.yaml`(`trustPolicy: no-downgrade`)を置く(`references/security.md` の「依存の供給網」)。
4. **性能**(`references/performance-ladder.md`)。性能の要件があるときだけ、必要な段階を決める。段階 4(WebAssembly)と 5(Go)は、ユーザーに確認してから採る。
5. **デザインシステム**(`references/design-system.md`)。画面があるときだけ、8341-ui を使わない / 使う / 作って共有する / カスタマイズしてプロダクトに組み込む、から選ぶ。見た目を変えたいとき、複数のプロダクトで共有するなら作って共有する(新しいリポジトリを作る前にユーザーの承認を得る)、そのプロダクトだけなら組み込む(リポジトリもワークスペースも作らず、部品は `src/components/ui/`、トークンは `src/styles/foundation/` に置く。写す範囲を示して確認を得る)。使う・作る・組み込む場合は、DESIGN.md を置く。
6. **構造と CQS**(`references/principles.md`、`references/cqs.md`)。採った段階のディレクトリを作り、feature の一覧と所有するテーブルを決める。画面があれば、`ui/` は `references/component-structure.md` に従う。
7. **ハーネス**(`references/quality-gates.md`、`references/testing-strategy.md`、`references/editing-constraints.md`)。`templates/harness/README.md` の手順で雛形を置く。コマンドはすべて `Makefile` のターゲットにし、人もエージェントも CI も `make` で叩く(`references/coding-conventions.md` の「コマンドは make で叩く」)。
8. **ADR と ARCHITECTURE.md**。ADR は最低限、次の 2 本を書く。段階 3 以上の性能対策、Go の採用、デザインシステムの選択(画面があるとき)、既定のスタックからの逸脱は、それぞれ別の ADR にする。
   - `0001-structure-tier.md`(構造の段階と、昇格・降格の条件)
   - `0002-tech-stack.md`(技術スタックと、既定から外した理由)
9. **検証**。依存を入れたら `make check-versions` を実行し、依存、Node.js、GitHub Actions、デザインシステムのレジストリが最新の安定版であることを確かめる(雛形の版は書いた時点のものなので、古くなっている可能性がある)。古いものは上げ、上げない理由があれば ADR に書く。次に `make check` を実行し、空の雛形で通ることを確かめる。境界違反のファイルを一時的に置き、`make lint-deps` が失敗することも確かめてから消す。最後に `references/review-checklist.md` で点検する。

### モード 2: 既存の ARCHITECTURE.md を調整する

1. ヒアリングの回答のうち、変わった前提を確認する。
2. 変わった前提に関係する文書だけを読み直す。段階を変えるときは `references/scale-selection.md` の昇格・降格の目安を確かめる。
3. 新しい ADR を書き(古い ADR は「置換」にする)、ARCHITECTURE.md の該当する節と変更履歴を更新する。依存ルールなどのハーネスも合わせて変える。

### モード 3: 既存のコードベースを評価・レビューする

1. 依存ルールの違反、公開 API を通らない import、行数上限を超えるファイルを、ツール(dependency-cruiser、oxlint)で洗い出す。ハーネスがなければ、雛形の設定を一時的に当てて調べる。
2. CQS の必須を満たさない箇所を挙げる。Command と Query を混ぜていないか、コマンドがドメインデータを返していないか、command を他の feature から呼んでいないかを見る。中規模以上では、業務ルールが `entity.ts` の純粋関数に、DB の読み書きが `repository.ts` にまとまっているか、`src/shared/` にドメインモデルを置いていないかも見る。
3. 現在の構造が、実態(開発人数、業務領域の数、ルールの複雑さ)に対して重すぎないか、軽すぎないかを `references/scale-selection.md` で判定する。
4. CI に品質ゲートの必須ステージがそろっているか、保護パスが二つ以上の仕組みで守られているかを確認する。
5. 指摘は、必須の違反、外した理由が書かれていない項目、推奨からの提案の順に並べる。

## 質問すべき場面

次の場合は推測せず、ユーザーに確認する。
- 構造の段階が境界上にあり、どちらも同程度に妥当なとき
- 性能対策の段階 4(WebAssembly)以上が候補になったとき
- 既存の ADR と矛盾する選択になるとき
- Oxc エコシステムのうち oxlint と oxfmt 以外のツール(Rolldown など)を採るかどうか
- 保護パスの編集や、承認が要る操作(`references/editing-constraints.md`)

ヒアリングに回答がない項目は、既定のスタックで進め、仮定として ARCHITECTURE.md の「前提条件」に書く。仮定を見直す条件も添える。

## 次の工程

構造とハーネスを置いたら、工程・エージェントの役割・ガードレール・改善ループを載せるために `software-factory` スキルを使う。

## フィードバック

- 対象リポジトリでの指摘は、`docs/feedback/LESSONS.md` に記録し、同じ指摘が 2 回出たら機械的なルール(型、依存ルール、lint、テスト、フック)に昇格させる。
- このスキル自体のルールに、ギャップ、曖昧なルール、合わなかったルール、繰り返される例外が見つかったら、ユーザーに伝え、`FEEDBACK.md` に記録し、このスキルの正本リポジトリ(`tkc310/system-factory`)への具体的な編集案を示す。編集は、ユーザーの承認を得てから PR で行う。サービス固有の例外は、共有のルールではなく、そのサービスの ARCHITECTURE.md に書く。
