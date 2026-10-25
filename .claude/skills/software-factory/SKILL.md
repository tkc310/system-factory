---
name: software-factory
description: AI 駆動開発のソフトウェアファクトリー(工程、エージェントの役割、ガードレール、PR のレビュー、改善ループ)を Claude Code 向けに生成する。無人ジョブは GitHub Actions(API キー)かルーティン(サブスクリプション)から選ぶ。architecture-selection で決めた構造とハーネスの上に置く。工場の新規構築、調整、成熟度の監査に使う。Use when setting up an AI-driven development workflow with Claude Code subagents, commands, guardrail hooks, CI review and a self-improvement loop.
---

# ソフトウェアファクトリー構築スキル

変更を「仕様化 → 計画 → 実装 → 検証 → 独立レビュー → 振り返り → マージ」の工程に通し、週に一度、失敗から規則を足す工場を、対象リポジトリに生成する。対象は Claude Code。

## 前提

- 対象リポジトリに `ARCHITECTURE.md` と、architecture-selection のハーネス(`Makefile` と `make check`、`.dependency-cruiser.cjs`、`scripts/guard-paths.sh`、`docs/feedback/LESSONS.md`)があること。なければ先に architecture-selection を実行する。
- 工場は、ハーネスが機械で保証することを前提に、人とエージェントの役割分担と、その間の受け渡しを決める。ハーネスの規則を工場の側で書き直さない。

## 読むもの

| 文書 | 内容 |
| --- | --- |
| `references/stations.md` | 7 つの工程、準備完了と完了の定義、仕様の状態 |
| `references/roles.md` | エージェントの役割(planner、implementer、reviewer、retro)と人の役割 |
| `references/guardrails.md` | 6 つの層、`--no-verify` への対策、実行の形式(A / B)、権限、危険なコマンド、完了前の検査、秘密情報、外部から入る文章、依存の追加 |
| `references/improvement-loop.md` | PR ごとの振り返りと週次の改善、自己改善の歯止め |
| `references/audit-checklist.md` | 工場の監査と、生成後の点検 |

## 生成物

| 生成物 | 置き場所(対象リポジトリ) | 雛形 |
| --- | --- | --- |
| 工場の運用手順 | `docs/factory/README.md`、`docs/factory/improve.md` | `templates/docs/factory/` |
| 仕様の雛形 | `docs/specs/TEMPLATE.md` | `templates/docs/specs/` |
| エージェントの役割 | `.claude/agents/*.md` | `templates/claude/agents/` |
| 工程のコマンド(`/spec`、`/build`、`/review`、`/retro`) | `.claude/skills/<name>/SKILL.md` | `templates/claude/skills/` |
| 権限とフック | `.claude/settings.json`、`.claude/hooks/*.sh` | `templates/claude/` |
| 無人ジョブ用のスクリプト | `scripts/factory/*.sh` | `templates/scripts/factory/` |
| 秘密情報の検出(両形式) | `.github/workflows/secrets-scan.yml` | `templates/github/workflows/` |
| 形式 A: Claude の無人ジョブ | `.github/workflows/agent-review.yml`、`factory-improve.yml` | `templates/github/workflows/` |
| 形式 B: Claude の無人ジョブ | ルーティン `factory-review`、`factory-improve` と、lefthook の pre-push | `templates/routines/`、`templates/lefthook.factory.yml` |
| PR の雛形 | `.github/pull_request_template.md` | `templates/github/` |
| `AGENTS.md` への追記 | `AGENTS.md` の末尾 | `templates/AGENTS.factory.md` |

置き方の手順は `templates/README.md` にある。

## 作業モード

### モード 1: 新規構築

1. 前提を確かめる。足りなければ architecture-selection を先に実行するよう伝える。
2. 次をユーザーに確認する(リポジトリから分かるものは聞かない)。
   - 工程を省いてよい変更の範囲(`references/stations.md` の「工程を省いてよい場合」の既定でよいか)
   - Claude の無人ジョブ(PR のレビューと週次の改善)をどちらの形式で動かすか(`references/guardrails.md` の「実行の形式」)
     - 形式 A: GitHub Actions + API キー。ツールを機械的に絞れるので安全性が高い。従量課金
     - 形式 B: lefthook + ルーティン。サブスクリプションの利用枠で動く。安全のための設定が多い
     - 決まらなければ形式 A を勧める
   - 秘密情報の検出に gitleaks を使えるか(組織のリポジトリではライセンスキーが要る)
3. `templates/README.md` の手順で雛形を置く。角括弧を埋め、ARCHITECTURE.md の構造の段階(小規模 / 中規模以上)に合わせて、役割の定義の「読むもの」を調整する。
4. ARCHITECTURE.md の「編集制約」に、工場が追加した保護パスと強制の仕組みを書く。工場の導入を ADR に書く。
5. 点検する(`references/audit-checklist.md` の「生成後の点検」)。
6. ブランチ保護の設定(必須チェック、コードオーナーのレビュー、迂回の禁止)、シークレットの登録、ルーティンの作成は、権限の変更なので人に依頼する。手順(`templates/README.md`、形式 B では `templates/routines/README.md`)を示して、人が行う。

### モード 2: 調整

1. 何を変えたいか(工程、役割、ガードレール、改善ループ)を確かめ、関係する文書だけを読む。
2. ガードレールを緩める変更は、理由と代わりの対策を ADR に書き、人の承認を得てから行う。
3. `docs/factory/README.md` と ARCHITECTURE.md を更新する。

### モード 3: 監査

1. `references/audit-checklist.md` の項目を、対象リポジトリで確かめる。
2. 直近の `docs/feedback/LESSONS.md`、CI の失敗、レビューの指摘から、工場がどこで誤りを取りこぼしているかを示す。
3. 指摘は、ガードレールの穴、工程の抜け、改善ループの停滞の順に並べる。

## 質問すべき場面

- ガードレールを緩める、または保護パスを外すとき
- 外部へ送信する操作や、本番環境に触れる操作を工程に組み込むとき
- 形式を変えるとき(A から B へ、B から A へ)
- 工程を省く範囲を既定より広げるとき

## フィードバック

このスキル自体の改善点は `FEEDBACK.md` に記録し、正本リポジトリ(`tkc310/system-factory`)への編集案を示す。編集はユーザーの承認を得てから PR で行う。
