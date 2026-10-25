# 編集制約

この文書は、エージェントが編集してよいパス、保護するパス、人間の承認が要る操作と、それらをどの仕組みで守るかを並べる。承認の基準は [承認](./human-approval.md) と [セキュリティ](./security.md) に従い、この文書はそれをサービスのリポジトリに当てはめる。パスは [構造](./principles.md) の、採った規模のディレクトリ構成を前提とする。

## 作業の種類ごとの編集範囲

**必須**

- エージェントは作業の開始時に作業の種類を決め、その範囲の外のファイルを編集する必要が出たら、編集する前にユーザーに確認する。

| 作業 | 編集してよい範囲 |
| --- | --- |
| 機能の追加 | 対象の feature(小規模は `src/features/<feature>/`、中規模以上は `src/components/features/<feature>/`、`src/api/features/<feature>/`、`src/shared/features/<feature>/`)、`src/app/` の該当する入口 |
| バグの修正 | 原因のある feature と、その再現テスト |
| リファクタリング | 対象の feature の中だけ。公開 API(`index.ts`)を変えるときは確認する |
| テストの追加 | `*.test.ts` とテスト用のヘルパー。実装は変えない |

## 保護パス

**必須**

- 次のパスは、ユーザーが明示的に許可したときだけ編集する。

| パス | 理由 |
| --- | --- |
| `db/migrations/**` | 適用済みのマイグレーションを書き換えると、環境ごとにスキーマが食い違う。新規の追加も確認する |
| `src/shared/auth/**`(中規模以上は `src/api/auth/**`) | 認証・認可の誤りは、そのまま情報漏えいになる |
| `src/generated/**` | 生成し直すと手の変更が消える。生成元を直す |
| `infra/**`、`.github/**`、`Dockerfile` | 本番環境とデプロイの経路、CI のガードレールを変える |
| `.env*` | 機密情報を含む |
| `package.json` の依存、ロックファイル | 依存の追加はライセンスと供給網のリスクを伴う |
| `tsconfig.json`、`vitest.config.ts`、`.oxfmtrc.json` | 型、カバレッジの閾値、整形の基準を緩められる |
| `Makefile`(と `makefile`、`GNUmakefile`、`*.mk`) | コマンドの入口。`make check` の中身を変えると、完了の条件と CI が弱まる([規約](./coding-conventions.md#コマンドは-make-で叩く)) |
| `.npmrc`、`pnpm-workspace.yaml` | 依存の取得元(Takumi Guard)と供給網の検査(`trustPolicy` など)を外せる([セキュリティ](./security.md#依存の供給網)) |
| `src/shared/ui/ds/**`(デザインシステムの B / C を選んだとき) | 取り込んだ部品を手で書き換えると、取り込み直したときに消え、デザインシステムの検証からも外れる([デザインシステム](./design-system.md)) |
| `src/styles/foundation/` の生成物(`tokens.css`、`tailwind-theme.css`、`tokens.json`、`tw-merge-config.ts`、`tokens/primitive/color.tokens.json`)と `tokens/contrast.rules.json`(デザインシステムの D を選んだとき) | 生成物を手で直すと元と食い違う。コントラストの基準を緩めるとアクセシビリティの検証が弱まる([デザインシステム](./design-system.md#d-8341-ui-をカスタマイズしてプロダクトに組み込む)) |
| `.cursor/**`、`.claude/**`(設定、エージェントの役割、フック、コマンド)、`scripts/guard-paths.sh`、`scripts/check-edited-file.sh`、`lefthook.yml`、`.dependency-cruiser.cjs`、`.oxlintrc.json`、`CODEOWNERS`、`AGENTS.md`、`CLAUDE.md`、`docs/factory/**`、`scripts/factory/**`、`.git/**` | ガードレール自体を弱める変更になりうる。週次の改善ジョブ(GitHub Actions かルーティン)だけは、規則を強める下書き PR のために `.dependency-cruiser.cjs`、`.oxlintrc.json`、`AGENTS.md` を編集できる |

- 保護パスは、指示(Cursor ルール、AGENTS.md)だけで守らない。下の表の、強制する仕組みのうち二つ以上で守る。雛形では、エージェントのフック(`scripts/guard-paths.sh`)と CODEOWNERS + ブランチ保護の二つで守るので、この表のパスは両方に書く。
  - 理由: 指示はエージェントが読み落とすことがあり、強制にならない。

## 人間の承認が要る操作

**必須**

- 次の操作は、実行する前にユーザーの承認を得る。テスト環境のデータベースへの変更は、[承認](./human-approval.md#承認が要らない操作) のとおり承認なしでよい。
  - 本番や共有環境へのマイグレーションの適用、データの削除
  - 本番環境へのデプロイ
  - メール、チャット、外部サービスへの送信やコメント
  - 権限、課金、シークレット、Webhook の設定変更
  - 保護パスの編集

## 制約を実装する仕組み

| 仕組み | 置き場所 | 強さ |
| --- | --- | --- |
| Cursor ルール | `.cursor/rules/*.mdc` | 指示。`globs` に合うファイルを扱うときに読み込まれる |
| feature の AGENTS.md | 中規模以上の `src/api/features/<feature>/AGENTS.md` | 指示 |
| Cursor のフック | `.cursor/hooks.json` | エージェントの操作をブロックする。`preToolUse` で保護パスへの `Write` と `Delete` を、`beforeShellExecution` で危険なコマンドを拒否できる |
| Claude Code のフック | `.claude/settings.json` | エージェントの操作をブロックする。`PreToolUse` で保護パスへの `Edit` と `Write` を拒否し、`PostToolUse` で整形と依存ルールの検査結果をエージェントに返せる |
| Git フック | `lefthook.yml`(lefthook) | 手元のコミットを止める。`--no-verify` で回避できる |
| 依存ルール | dependency-cruiser | CI で境界違反を止める |
| CODEOWNERS とブランチ保護 | `.github/CODEOWNERS` | マージの前に、指定した担当者の承認を必須にする |

この表の例は、サービスのリポジトリに置くものである。雛形は `templates/harness/` にある。使うエージェント(Cursor、Claude Code、両方)に合わせてフックを置く。保護パスの判定は `scripts/guard-paths.sh` を共有し、両方のフックから呼ぶ。

### Cursor ルールの例

```markdown
---
description: マイグレーションの扱い
globs: db/migrations/**
alwaysApply: false
---
既存のマイグレーションは編集しない。スキーマの変更は新しいファイルで行い、追加する前にユーザーに確認する。
```

### Cursor のフックの例

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      { "command": "scripts/guard-paths.sh", "matcher": "Write|Delete", "failClosed": true }
    ]
  }
}
```

`guard-paths.sh` は、標準入力で受け取った対象のパスが保護パスに当たるとき、終了コード 2 で終わる。`failClosed` を付けないと、フックが異常終了したときに操作が通る。

### CODEOWNERS の例

```
/db/migrations/       @org/backend-leads
/src/shared/auth/     @org/security
/src/api/auth/     @org/security
/.github/             @org/platform
/.cursor/             @org/platform
```

ブランチ保護で「コードオーナーのレビューを必須にする」を有効にしないと、CODEOWNERS はレビュー依頼を出すだけで、マージを止めない。
