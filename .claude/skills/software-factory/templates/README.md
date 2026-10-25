# 雛形の置き方

architecture-selection のハーネスを置いた後に置く。形式(A: GitHub Actions、B: lefthook + ルーティン)は、このスキルの `references/guardrails.md` の「実行の形式」で選ぶ。

## 両方の形式で置くもの

| 雛形 | 置き場所 | 手順 |
| --- | --- | --- |
| `docs/factory/README.md`、`docs/factory/improve.md` | 同じパス | 角括弧を埋め、採った形式の行だけを残す |
| `docs/specs/TEMPLATE.md` | 同じパス | 編集してよいパスの例を構造の段階に合わせる(小規模では `src/features/<feature>/` だけにする) |
| `claude/agents/*.md` | `.claude/agents/` | そのまま |
| `claude/skills/*/SKILL.md` | `.claude/skills/<name>/SKILL.md` | そのまま |
| `claude/hooks/*.sh` | `.claude/hooks/` | `chmod +x`。`jq` を使う |
| `claude/settings.json` | `.claude/settings.json` | ハーネスの `.claude/settings.json` を**置き換える**(ハーネスのフックも含んでいる)。許可リストをプロジェクトのコマンドに合わせる |
| `scripts/factory/*.sh` | `scripts/factory/` | `chmod +x`。無人ジョブだけが使える(`FACTORY_JOB` で制限) |
| `github/workflows/secrets-scan.yml` | `.github/workflows/` | 組織のリポジトリでは `GITLEAKS_LICENSE` が要る |
| `github/pull_request_template.md` | `.github/pull_request_template.md` | そのまま |
| `AGENTS.factory.md` | `AGENTS.md` の末尾に追記 | ファイル自体は置かない |
| `lefthook.factory.yml` の `pre-commit` | `lefthook.yml` に統合 | ファイル自体は置かない |

## 形式 A: GitHub Actions

| 雛形 | 置き場所 | 手順 |
| --- | --- | --- |
| `github/workflows/agent-review.yml`、`factory-improve.yml` | `.github/workflows/` | シークレット `ANTHROPIC_API_KEY` が要る |

## 形式 B: lefthook + ルーティン

| 雛形 | 置き場所 | 手順 |
| --- | --- | --- |
| `lefthook.factory.yml` の `pre-push` | `lefthook.yml` に統合 | 開発者の手元に Claude Code(サブスクリプションでログイン)が要る |
| `routines/*.prompt.md` | ルーティンの Instructions | `routines/README.md` の手順で 2 つのルーティンを作る。リポジトリには置かない |

## 置いた後に人が行うこと

権限の変更なので、エージェントは行わない。

1. Claude の GitHub アプリをリポジトリに入れる。
2. 形式 A: GitHub のシークレットに `ANTHROPIC_API_KEY` を登録する。形式 B: `routines/README.md` の手順でクラウド環境とルーティンを作る。
3. 必要なら `GITLEAKS_LICENSE` を登録する。
4. ブランチ保護(ルールセット)を設定する。
   - 必須チェック: 品質ゲート(`ci` のジョブ `check`)、`secrets-scan`、`factory/review`。形式 A では `factory/review` の発行元を GitHub Actions に固定する
   - コードオーナーのレビューを必須にする
   - `main` への直接の push と強制 push を禁止する
   - 迂回を許すリスト(Bypass list)を空にする(管理者も迂回できないようにする)

## 既存の工場を更新するとき

形式 A のレビューは、比較元(base)の版のフックと `scripts/factory/` で動く。そのため、`post-review.sh` やフックの呼び方を変える更新は、それを含む PR 自体のレビューが古い版で動いて失敗する。フックとスクリプトの更新を先にマージするか、その PR だけ人が `factory/review` を確かめてから付ける。初めて導入する PR も同じで、比較元に `scripts/factory/` がないので、人が確かめる。

## 動作の確認

```sh
# 危険なコマンドとフックの回避が拒否される(終了コード 2)
echo '{"tool_input":{"command":"git push --force"}}' | .claude/hooks/guard-bash.sh; echo $?
echo '{"tool_input":{"command":"git commit --no-verify -m x"}}' | .claude/hooks/guard-bash.sh; echo $?
# 無人ジョブ用のスクリプトは手元では使えない(終了コード 2)
echo '{"tool_input":{"command":"scripts/factory/post-review.sh 1 0123456789abcdef0123456789abcdef01234567 approve"}}' | .claude/hooks/guard-bash.sh; echo $?
# 保護パスが拒否される(終了コード 2)
echo '{"tool_input":{"file_path":".claude/agents/reviewer.md"}}' | scripts/guard-paths.sh; echo $?
```

Claude Code で `/spec` と打ち、コマンドが候補に出ることと、`/agents` で 4 つの役割が見えることを確かめる。最後に小さな PR を作り、`factory/review` のステータスが付くまでマージできないことを確かめる。
