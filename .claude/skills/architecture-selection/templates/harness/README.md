# ハーネスの雛形

対象リポジトリに置く、境界と秩序を機械で守るための設定。どの仕組みが何を守るかは [品質ゲート](../../references/quality-gates.md) と [編集制約](../../references/editing-constraints.md) にある。

雛形の角括弧(`[サービス名]`、`[org/platform]` など)は、置くときに埋める値である。山括弧(`<名前>` など)は、コマンドを使うときに埋める値である。

## 置き方

| 雛形 | 置き場所 | 手順 |
| --- | --- | --- |
| `Makefile` | リポジトリ直下 | コマンドの入口([規約](../../references/coding-conventions.md#コマンドは-make-で叩く))。採らないターゲット(デザインシステムの B / C を使わないなら `ui-*`)は消す。D を選んだら `ds-generate` と `ds-check` を足し、`check` に `ds-check` を含める([デザインシステム](../../references/design-system.md#ハーネスに足すもの))。よく使うターゲットは AGENTS.md のコマンドの表にも書く |
| `AGENTS.md`、`CLAUDE.md` | リポジトリ直下 | 角括弧を埋める。`CLAUDE.md` は `@AGENTS.md` を読み込むだけ |
| `pnpm-workspace.yaml`、`.npmrc` | リポジトリ直下 | 依存の供給網の対策(`trustPolicy: no-downgrade`、`minimumReleaseAge`、`blockExoticSubdeps`、Takumi Guard)。依存を入れる前に、そのまま置く。`pnpm-workspace.yaml` は pnpm の設定を書くためだけに置き、`packages` を足さない(段階によらずワークスペースを使わない。[構造](../../references/principles.md#ワークスペースを使わない共通))。どちらにもトークンを書かない([セキュリティ](../../references/security.md#依存の供給網)) |
| `package.scripts.json` | `package.json` | 下の「package.json の作り方」に従う。ファイル自体は置かない |
| `.node-version` | リポジトリ直下 | 新しく作り、最新の LTS の major(`make check-versions` で確かめる)を書く。CI もこの版を使う |
| `tsconfig.json` | リポジトリ直下 | フレームワークの既定の設定があれば、`strict` 系のオプションをそちらに統合する |
| `.oxlintrc.json`、`.oxfmtrc.json` | リポジトリ直下 | 置いたら `make lint` と `make format-check` を実行し、未対応のルール名や設定がないか確かめる。型情報を使うルール(`typescript/no-floating-promises`)が効いているかは、違反を一時的に置いて確かめる |
| `dependency-cruiser/<段階>.cjs` | `.dependency-cruiser.cjs` | 採った段階(小規模は `small`、中規模以上は `medium`)の 1 つだけを置く。ディレクトリ自体はコピーしない |
| `vitest.config.ts` | リポジトリ直下 | `coverage.include` を採った段階のものにし、閾値を ARCHITECTURE.md に合わせる |
| `lefthook.yml` | リポジトリ直下 | `make hooks` |
| `.github/workflows/ci.yml` | 同じパス | ジョブ `check`(6 つのステージを含む)をブランチ保護の必須チェックに指定する |
| `.github/CODEOWNERS` | 同じパス | 担当者を埋め、ブランチ保護で「コードオーナーのレビューを必須にする」を有効にする。保護パスを足したら、`scripts/guard-paths.sh` と両方に足す |
| `scripts/guard-paths.sh`、`scripts/check-edited-file.sh` | 同じパス | `chmod +x`。どちらも `jq` を使う |
| `scripts/check-versions.mjs` | 同じパス | 依存、Node.js、GitHub Actions、デザインシステムのレジストリが最新の安定版かを調べる。`make check-versions` で実行する(下の「版の確認」) |
| `.claude/settings.json` | 同じパス | Claude Code を使う場合。パッケージマネージャーの直接の実行と保護パスの編集を拒否し、編集後に検査する。software-factory を載せるときは、その `settings.json` に置き換える |
| `.cursor/hooks.json` | 同じパス | Cursor を使う場合。保護パスの拒否 |
| `docs/feedback/LESSONS.md` | 同じパス | 置いて、表の記入例の行(L-001)を消す |

保護パスは、指示だけでなく二つ以上の仕組みで守る。既定では、エージェントのフック(Claude Code と Cursor の両方、または使う方)と CODEOWNERS + ブランチ保護の二つで守る。

## package.json の作り方

1. `package.json` に `packageManager`(`"pnpm@<最新の安定版>"`)と `engines.pnpm`(`">=10.21.0"`)を書く。
   - 理由: pnpm/action-setup は `packageManager` の版を使う。`trustPolicy` より古い pnpm は、この設定を黙って無視する。
2. `package.scripts.json` の `scripts` を統合する。
3. `devDependencies` の一覧を、`make add-dev pkg="<一覧を空白で区切ったもの>"` で入れる。画面がなければ `@testing-library/react`、`@testing-library/dom`、`happy-dom` は入れない。oxfmt だけは、1.0 前で整形の結果が変わりうるので `make add-dev-exact pkg=oxfmt` で版を固定する([品質ゲート](../../references/quality-gates.md#リンターとフォーマッター))。

## 版の確認

雛形の版は、書いた時点のもの。置いたら、依存を入れた後に必ず `make check-versions` を実行し、古いものとプレリリースを直す。

| 調べるもの | 比べる相手 |
| --- | --- |
| `package.json` の依存と `packageManager` | npm の `latest`(安定版)。指定がプレリリース(`-rc` など)なら知らせる |
| Node.js(`.tool-versions`、`.nvmrc`、`.node-version`、`engines`) | 最新の LTS |
| `.github/workflows/*.yml` の `uses: owner/repo@vN` | 各 Action の最新のリリースの major |
| `components.json` の GitHub Pages のレジストリ(8341-ui など) | そのリポジトリの最新のリリース。URL に版(`/r/v<版>/`)がなければ知らせる |

- 終了コード 0 はすべて最新、1 は古いもの、プレリリース、版の指定がないものがある、2 は取得できなかったものだけがある。取得できなかったものは、公式の情報で手で確かめる。
- 最新の安定版にしない場合(互換性の問題、組織の標準)は、理由を ADR に書く。
- GitHub Actions の major を上げるときは、その Action のリリースノートで入力の変更を確かめる。デザインシステムの版を上げるときは [デザインシステム](../../references/design-system.md) の更新の手順に従う。
- 調べないものは `make check-versions args="--no-node --no-actions --no-registries"` のように外せる。`args="--json"` で JSON を出す。
- ネットワークに出られない環境では、`NPM_REGISTRY`、`NODE_DIST_URL`、`GITHUB_API` で問い合わせ先を変えられる。

## 置いた後の確認

1. `make setup` の後、`src/` を作って(中身は空でよい)、`make check` が通る。`make check-versions` で古いものとプレリリースがない。
2. 次の境界違反を一時的に置き、`make lint-deps` が失敗することを確かめてから消す。
   - 小規模: `src/app/` から `src/features/<f>/queries/` を直接 import する
   - 小規模で画面があるとき: feature の `ui/` から同じ feature の `queries/` を import する(`ui-scope`)
   - 中規模以上: ある feature の query から、別の feature の `tables.ts` を import する。`src/shared/features/<f>/` から `drizzle-orm` か `node:fs` を import する
   - 中規模以上で画面があるとき: `src/components/features/<f>/` から `src/server/features/<f>/index.ts` を import する(`components-no-server`)
   - 画面があるとき: `make lint` では、3 階層以上さかのぼる相対パスの import(`../../../`)が失敗することも確かめる
3. `echo '{"tool_input":{"file_path":"db/migrations/0001.sql"}}' | scripts/guard-paths.sh` が終了コード 2 で終わる。`.npmrc`、`pnpm-workspace.yaml`、`Makefile` でも同じく 2 で終わる。
4. `make doctor` の registry が `https://npm.flatt.tech/` になっている。リポジトリの外の空のディレクトリで `npm view @panda-guard/test-malicious --registry=https://npm.flatt.tech/` を実行し、403 になる(Takumi Guard の検査用のパッケージ)。

## 段階を変えたとき

`.dependency-cruiser.cjs` を新しい段階の雛形(`small.cjs` か `medium.cjs`)に差し替え、`vitest.config.ts` の `coverage.include` と ARCHITECTURE.md の構造の節を更新する。ディレクトリの移し方は [構造の段階の選び方](../../references/scale-selection.md#段階の変更) に従う。
