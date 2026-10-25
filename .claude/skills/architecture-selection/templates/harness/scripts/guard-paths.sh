#!/usr/bin/env bash
# 保護パスへの書き込みと削除を拒否する。Cursor の preToolUse と Claude Code の PreToolUse の両方から呼ぶ。
# 標準入力の JSON から対象のパスを取り出し、保護パスに当たれば終了コード 2 で止める。
# 保護パスを変えるときは、.github/CODEOWNERS と ARCHITECTURE.md の「編集制約」も更新する。
set -uo pipefail
# パスの * や [ ] を glob として展開させない(展開されると正規化の結果がずれ、保護パスを避けられる)。macOS の bash 3.2 でも効くよう全体で切る
set -f

block() {
  printf '%s\n' "$1" >&2
  exit 2
}

# jq がなければ判定できないので、通さずに止める(fail closed)
command -v jq >/dev/null 2>&1 || block "jq が見つからないため、編集先を検査できません。jq を入れてください。"

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.path // .tool_input.notebook_path // .file_path // .path // empty' 2>/dev/null) \
  || block "フックの入力を読めませんでした。"
[ -z "$path" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-$PWD}}"

# パスを正規化する(. と .. と連続する / を解消する)。src/../.claude/x のような書き方で保護パスを避けられないようにする。
normalize() {
  local p="$1" part out=() IFS=/
  for part in $p; do
    case "$part" in
      ''|.) ;;
      ..) [ ${#out[@]} -gt 0 ] && unset 'out[${#out[@]}-1]' ;;
      *) out+=("$part") ;;
    esac
  done
  printf '/%s' "${out[*]}"
}
case "$path" in
  /*) abs=$(normalize "$path") ;;
  *)  abs=$(normalize "$root/$path") ;;
esac
root_abs=$(normalize "$root")

# 大文字と小文字を区別しないファイルシステム(macOS の既定)でも避けられないよう、区別せずに照合する
shopt -s nocasematch

# 利用者の Claude Code と Cursor の設定(フックを無効にできる)も保護する
home_abs=$(normalize "${HOME:-/nonexistent}")
case "$abs" in
  "$home_abs"/.claude/*|"$home_abs"/.cursor/*)
    block "${abs} は利用者のエージェント設定です。エージェントは編集しません。" ;;
esac

case "$abs" in
  "$root_abs"/*) rel="${abs#"$root_abs"/}" ;;
  *) exit 0 ;; # リポジトリの外は、このフックの対象外
esac

# 週次の改善ジョブ(software-factory の GitHub Actions かルーティン)だけは、規則を強める変更のために
# lint と依存ルールの設定、AGENTS.md を編集できる。変更は下書き PR になり、CODEOWNERS の承認を経てマージされる。
# FACTORY_JOB はジョブの実行環境が設定する値で、エージェントが Bash で設定してもこのフックには届かない。
if [ "${FACTORY_JOB:-}" = "improve" ]; then
  case "$rel" in
    .dependency-cruiser.cjs|.oxlintrc.json|AGENTS.md) exit 0 ;;
  esac
fi

case "$rel" in
  src/generated/*)
    printf '%s は生成コードです。手で編集せず、生成元を直して make generate を実行してください。\n' "$rel" >&2
    exit 2
    ;;
esac

case "$rel" in
  db/migrations/*|src/shared/auth/*|src/api/auth/*|\
  infra/*|.github/*|Dockerfile|.env|.env.*|*/.env|*/.env.*|\
  package.json|pnpm-lock.yaml|package-lock.json|yarn.lock|.npmrc|pnpm-workspace.yaml|\
  .cursor/*|.claude/*|scripts/guard-paths.sh|scripts/check-edited-file.sh|lefthook.yml|\
  Makefile|makefile|GNUmakefile|*.mk|\
  tsconfig.json|vitest.config.ts|.oxfmtrc.json|\
  .dependency-cruiser.cjs|.oxlintrc.json|CODEOWNERS|AGENTS.md|CLAUDE.md|docs/factory/*|scripts/factory/*|.git/*)
    printf '%s は保護パスです。編集する前にユーザーの明示的な許可を得てください(ARCHITECTURE.md の「編集制約」)。\n' "$rel" >&2
    exit 2
    ;;
esac

exit 0
