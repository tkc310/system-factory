# system-factory

AI 駆動開発で使い回すための、設計と開発工程のボイラープレート。2 つのスキルで、新しいサービスのリポジトリに「アーキテクチャ」と「ソフトウェアファクトリー」を生成する。

- フルスタック TypeScript を既定とし、性能が足りないと測定で分かったときだけ Effect → Worker → WebAssembly → Go の順に進む
- 構造は、開発人数と業務領域の数で「小規模」と「中規模以上」の 2 段階から選ぶ。どちらもコードを feature で分け、モジュールや技術の層(ドメイン層、リポジトリ層)では分けない
- 規模によらず、モノレポのワークスペース(`apps/`、`packages/`)を使わず、1 リポジトリ 1 パッケージにする
- 画面があるときは、デザインシステムを「[8341-ui](https://github.com/tkc310/8341-ui) を使わない / 使う / ひな形に作って共有する / カスタマイズしてプロダクトに組み込む」から選ぶ
- 境界は文章ではなく、型・oxlint・dependency-cruiser・テスト・フックで機械的に守る
- コマンドの入口は `Makefile` に一つにし、人もエージェントも CI も `make` で叩く
- 依存の供給網は、既定で pnpm の `trustPolicy: no-downgrade` と [Takumi Guard](https://shisho.dev/docs/t/guard/quickstart/npm/) のレジストリで守る
- 指摘を記録し、繰り返すものを機械的なルールに昇格させて自己改善する

## 使い方

### 1. スキルを入れる

Claude Code で使う。2 つのスキルは互いを参照するので、同じディレクトリに並べて置く。

```sh
git clone https://github.com/tkc310/system-factory.git
cd system-factory

# すべてのプロジェクトで使う(個人のスキル)
mkdir -p ~/.claude/skills
cp -r .claude/skills/architecture-selection .claude/skills/software-factory ~/.claude/skills/

# 特定のリポジトリだけで使う
cp -r .claude/skills/architecture-selection .claude/skills/software-factory <対象のリポジトリ>/.claude/skills/
```

更新したら同じコマンドで上書きする。

### 2. アーキテクチャを決める(architecture-selection)

対象のリポジトリ(空でもよい)で Claude Code を開き、次のように頼む。

```
新しいサービスのアーキテクチャを選定して、ARCHITECTURE.md とハーネスを作って
```

スキルは次の順に進む。途中の質問には、分かる範囲で答える。答えられない項目は既定値で進み、仮定として記録される。

1. ヒアリング(目的、利用者、負荷、画面の有無、開発人数、業務領域の数、ルールの複雑さなど)
2. 構造の段階(小規模 / 中規模以上)の判定
3. 技術スタックと、性能の要件があれば性能対策の段階
4. 画面があれば、デザインシステムの選択(下の表)
5. ディレクトリ構成、ハーネス(oxlint、oxfmt、dependency-cruiser、Vitest、lefthook、CI)、ARCHITECTURE.md、ADR の生成
6. `make check` で検証(コマンドはすべて `Makefile` のターゲットにし、`make` で叩く)

| デザインシステム | 行うこと |
| --- | --- |
| A. 8341-ui を使わない | 組織の既存のデザインシステムか、画面のフレームワークの標準的な部品を使う |
| B. 8341-ui を使う | 8341-ui の部品とトークンを shadcn のレジストリで取り込み、DESIGN.md を置く |
| C. デザインシステムを作って共有する | 8341-ui のリポジトリで `/ds-factory` を実行して組織のデザインシステムを作り(新しいリポジトリを作るので、事前に承認を求められる)、B と同じ方法で取り込む |
| D. カスタマイズして組み込む | `/ds-factory` で色調などを変えたデザインシステムを生成し、リポジトリもワークスペースも作らずに、部品を `src/components/ui/`、トークンと土台を `src/styles/foundation/` に写す。トークンの生成物はコミットし、`ds-check` で鮮度とコントラストを検査する |

既存の ARCHITECTURE.md を見直すときは「ARCHITECTURE.md を調整して」、構造を点検するときは「このリポジトリの構造をレビューして」と頼む。

### 3. 開発の工場を載せる(software-factory)

アーキテクチャを決めた後に、次のように頼む。

```
このリポジトリに AI 駆動開発の工場を作って
```

途中で、Claude の無人ジョブ(PR ごとのレビューと週次の改善)をどちらで動かすか聞かれる。

| 形式 | 動かす場所 | 費用 |
| --- | --- | --- |
| A(推奨) | GitHub Actions | API キーの従量課金 |
| B | 手元の lefthook とルーティン | サブスクリプションの利用枠 |

生成した後、次は人が行う(権限の変更なので、エージェントは行わない)。

- 形式 A ではシークレット `ANTHROPIC_API_KEY` の登録、形式 B ではルーティンの作成
- ブランチ保護(必須チェック、コードオーナーのレビュー、迂回の禁止)
- Claude の GitHub アプリの導入

手順は、生成された `docs/factory/README.md` と、software-factory の `templates/README.md` にある。

### 4. 工場で開発する

| 工程 | 行うこと |
| --- | --- |
| `/spec <Issue 番号>` | 仕様と計画を書く。人が読んで、仕様の状態を「承認」にする |
| `/build <仕様のパス>` | 承認済みの仕様を実装し、検査を通して PR を作る |
| `/review <仕様のパス>` | 仕様と差分だけを渡して、独立にレビューさせる |
| `/retro <PR 番号>` | マージの前に、防げたはずの誤りを `docs/feedback/LESSONS.md` に記録する |
| (人) | 必須チェックがそろったら、内容を確かめてマージする |

毎週、改善ジョブが記録・CI の失敗・レビューの指摘を集計し、規則を強める下書き PR を作る。読んで採るものを「Ready for review」にする。

### 5. スキルを直す

スキルが合わなかった点は、各スキルの `FEEDBACK.md` に記録する。同じ種類が 2 回出たら、このリポジトリのスキルを直す PR を出す。サービス固有の例外は、スキルではなく、そのサービスの ARCHITECTURE.md に書く。

## スキル

[architecture-selection](.claude/skills/architecture-selection/SKILL.md) は、ヒアリングから ARCHITECTURE.md、ディレクトリ構成、ハーネスの雛形、ADR までを出力する。既存の ARCHITECTURE.md の調整と、コードベースの構造レビューにも使う。

| 段階 | 形 | 典型的な案件 |
| --- | --- | --- |
| 小規模 | `src/features/<feature>/` の Vertical Slice + CQS。層なし | 1〜2 人、業務領域が 2 つ以下 |
| 中規模以上 | `src/components/features/`(画面)、`src/server/features/`(サーバー)、`src/shared/features/`(両方で使う純粋なコード)に同じ名前の feature を置く。テーブルの所有。層なし([yorozuya](https://github.com/tkc310/yorozuya) の構成) | 3 人以上、または業務領域が 3 つ以上 |

[software-factory](.claude/skills/software-factory/SKILL.md) は、architecture-selection の出力の上に、Claude Code 向けのソフトウェアファクトリーを載せる。

| 層 | 生成するもの |
| --- | --- |
| 工程 | 仕様化 → 計画 → 実装 → 検証 → 独立レビュー → 振り返り → マージ。準備完了と完了の定義、仕様の雛形 |
| 役割 | サブエージェント `planner` / `implementer` / `reviewer` / `retro` と、コマンド `/spec` `/build` `/review` `/retro` |
| ガードレール | 権限の allow / ask / deny、危険なコマンドの拒否、保護パス、検査を通さない完了の阻止、秘密情報の検出、CODEOWNERS |
| 無人ジョブ | PR ごとのエージェントのレビューと週次の改善。形式 A: GitHub Actions + API キー、形式 B: lefthook + ルーティン(サブスクリプション)から選ぶ。レビュー結果は必須チェック `factory/review` になり、`--no-verify` で回避してもマージできない |
| 改善ループ | PR ごとの振り返り(LESSONS.md)と、週次で規則を強める下書き PR。規則を緩める変更は自動では提案しない |

## 構成

```
.claude/skills/architecture-selection/
├── SKILL.md                    # 作業モードと手順
├── FEEDBACK.md                 # スキル自体の改善記録
├── references/                 # ルールの本文(README.md から読む)
│   ├── human-approval.md       # 承認が要る操作(最優先)
│   ├── security.md             # 秘密情報と外から入る文章(最優先)
│   ├── hearing.md              # 前提条件のヒアリング
│   ├── scale-selection.md      # 小規模 / 中規模以上の判定と昇格・降格
│   ├── tech-selection.md       # 技術選定と Go・Flutter の条件
│   ├── performance-ladder.md   # 性能対策の段階
│   ├── design-system.md        # デザインシステムの選択(8341-ui を使わない / 使う / 作って共有する / 組み込む)
│   ├── principles.md           # 段階別の構造と依存ルール
│   ├── component-structure.md  # 画面のコンポーネントの置き場所、名前、入れ子、import
│   ├── cqs.md                  # コマンドとクエリ
│   ├── quality-gates.md        # 機械に保証させる項目と CI
│   ├── testing-strategy.md
│   ├── coding-conventions.md
│   ├── editing-constraints.md  # 保護パスと承認
│   └── review-checklist.md
└── templates/
    ├── ARCHITECTURE.md
    ├── adr.md
    ├── feature-AGENTS.md
    └── harness/                # Makefile / AGENTS.md / oxlint / oxfmt / dependency-cruiser(小規模・中規模以上)/ Vitest / lefthook / CI / CODEOWNERS / 供給網(.npmrc、pnpm-workspace.yaml)/ 版の確認 / Claude Code と Cursor のフック

.claude/skills/software-factory/
├── SKILL.md
├── references/                 # stations / roles / guardrails / improvement-loop / audit-checklist
└── templates/
    ├── claude/                 # agents / skills(/spec /build /review /retro)/ hooks / settings.json
    ├── github/                 # 形式 A の agent-review / factory-improve、secrets-scan、PR テンプレート
    ├── routines/               # 形式 B のルーティンのプロンプトと設定手順
    ├── scripts/factory/        # 無人ジョブ用: レビュー結果の投稿、下書き PR と Issue の作成、push 前の手元のレビュー
    └── docs/                   # factory/README.md, factory/improve.md, specs/TEMPLATE.md
```
