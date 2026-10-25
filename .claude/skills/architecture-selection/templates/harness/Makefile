# プロジェクトのコマンドの入口(architecture-selection スキルの references/coding-conventions.md)。保護パス(ARCHITECTURE.md の「編集制約」)。
# 人もエージェントも CI も、pnpm や各ツールを直接叩かず、ここのターゲットを使う。package.json の scripts は実装の詳細。
# よく使うターゲットは、AGENTS.md のコマンドの表にも書く。
#
# 値を渡すターゲット(add、remove、why、ui-add、ui-update、check-versions)は、値を make の変数としてではなく
# 環境変数($pkg、$name、$args)として受け取り、形を確かめてから使う。値に書いたシェルのコードは実行されない。

# コマンドラインの値は make に展開させない($(shell …) などを書かれても、ただの文字列として扱う)
override pkg := $(value pkg)
override name := $(value name)
override args := $(value args)
export pkg name args

SHELL := bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-builtin-rules --no-print-directory

# 依存の名前(scope と版の指定を許す)と、shadcn のレジストリの部品の名前
# 先頭の - を許さない(--global などのオプションを名前として渡せないようにする)
PKG_RE := ^(@[a-z0-9][a-z0-9._~-]*/)?[a-z0-9][a-z0-9._~-]*(@[0-9A-Za-z.^~*<>=+-]+)?$$
UI_RE := ^(@[a-z0-9][a-z0-9-]*/)?[a-z0-9][a-z0-9-]*$$
VERSIONS_ARGS_RE := ^--(json|no-node|no-actions|no-registries)$$

# $(call require,<変数名>,<正規表現>,<例>)
define require
	@test -n "$${$(1):-}" || { echo '$(1)= を指定する(例: $(3))' >&2; exit 2; }
	@set -f; for v in $${$(1)}; do printf '%s\n' "$$v" | grep -Eq '$(2)' || { echo "$(1) として読めない: $$v" >&2; exit 2; }; done
endef

.PHONY: help
help: ## ターゲットの一覧
	@grep -hE '^[a-z][a-z0-9-]*:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{ printf "  make %-20s %s\n", $$1, $$2 }'

# ---- 準備 ----
.PHONY: setup install hooks doctor
setup: install hooks ## 初回の準備(依存と Git のフック)
install: check-supply-chain ## 依存を入れる(ロックファイルのとおり)
	pnpm install --frozen-lockfile
hooks: ## Git のフックを入れる
	pnpm exec lefthook install
doctor: check-supply-chain ## 道具と取得元を表示する
	@node --version; pnpm --version; printf 'registry: '; pnpm config get registry

# ---- 依存(エージェントが使うときは承認が要る) ----
.PHONY: add add-dev add-dev-exact remove why outdated
add: check-supply-chain ## 依存を足す(make add pkg="zod")
	$(call require,pkg,$(PKG_RE),make add pkg=zod)
	@set -f; pnpm add $$pkg
add-dev: check-supply-chain ## 開発用の依存を足す(make add-dev pkg="vitest")
	$(call require,pkg,$(PKG_RE),make add-dev pkg=vitest)
	@set -f; pnpm add -D $$pkg
add-dev-exact: check-supply-chain ## 開発用の依存を版を固定して足す(make add-dev-exact pkg="oxfmt")
	$(call require,pkg,$(PKG_RE),make add-dev-exact pkg=oxfmt)
	@set -f; pnpm add -D -E $$pkg
remove: ## 依存を外す(make remove pkg="zod")
	$(call require,pkg,$(PKG_RE),make remove pkg=zod)
	@set -f; pnpm remove $$pkg
why: ## 依存が入っている理由(make why pkg="react")
	$(call require,pkg,$(PKG_RE),make why pkg=react)
	@set -f; pnpm why $$pkg
outdated: ## 古い依存の一覧
	pnpm outdated

# ---- 開発 ----
.PHONY: dev build generate
dev: ## 開発サーバー
	pnpm dev
build: ## ビルド
	pnpm build
generate: ## 生成コード(openapi-typescript、drizzle-kit など)
	pnpm generate

# ---- 検査(make check が完了の条件) ----
.PHONY: check format format-check lint lint-deps typecheck test test-watch test-coverage test-e2e generate-check
check: ## 完了前に必ず通す(整形、lint、依存ルール、型、テスト)
	pnpm check
format: ## 整形する
	pnpm format
format-check: ## 整形を確かめる
	pnpm format:check
lint: ## lint
	pnpm lint
lint-deps: ## 依存ルール(dependency-cruiser)
	pnpm lint:deps
typecheck: ## 型チェック
	pnpm typecheck
test: ## 単体テスト
	pnpm test
test-watch: ## 単体テストを監視して実行する
	pnpm test:watch
test-coverage: ## カバレッジの閾値つきのテスト
	pnpm test:coverage
test-e2e: ## E2E(手動、都度)
	pnpm test:e2e
generate-check: ## 生成コードに差分がないか
	pnpm generate:check

# ---- 版と供給網 ----
.PHONY: check-versions check-supply-chain audit
check-versions: ## 依存、Node.js、GitHub Actions、レジストリが最新の安定版か(make check-versions args="--no-node")
	@set -f; if [ -n "$${args:-}" ]; then for v in $$args; do printf '%s\n' "$$v" | grep -Eq '$(VERSIONS_ARGS_RE)' || { echo "args として読めない: $$v" >&2; exit 2; }; done; fi
	@set -f; node scripts/check-versions.mjs $${args:-}
check-supply-chain: ## 依存の供給網の設定(.npmrc と pnpm-workspace.yaml)が外されていないか。ワークスペースを使っていないか
	@grep -Eq '^registry=https://npm\.flatt\.tech/?$$' .npmrc || { echo '.npmrc の registry が Takumi Guard ではない' >&2; exit 1; }
	@grep -Eq '^trustPolicy:[[:space:]]*no-downgrade[[:space:]]*$$' pnpm-workspace.yaml || { echo 'pnpm-workspace.yaml に trustPolicy: no-downgrade がない' >&2; exit 1; }
	@grep -Eq '^minimumReleaseAge:[[:space:]]*[1-9][0-9]*[[:space:]]*$$' pnpm-workspace.yaml || { echo 'pnpm-workspace.yaml に minimumReleaseAge がない' >&2; exit 1; }
	@grep -Eq '^blockExoticSubdeps:[[:space:]]*true[[:space:]]*$$' pnpm-workspace.yaml || { echo 'pnpm-workspace.yaml に blockExoticSubdeps: true がない' >&2; exit 1; }
	@! grep -Eq '^(packages|catalogs?):' pnpm-workspace.yaml || { echo 'pnpm-workspace.yaml に packages か catalog がある。ワークスペースは使わない(references/principles.md)' >&2; exit 1; }
audit: ## 脆弱性の照会(Takumi Guard は取得専用なので npm の公式に問い合わせる)
	pnpm audit --prod --registry=https://registry.npmjs.org/

# ---- デザインシステム(B / C を選んだときだけ。make add-dev-exact pkg=shadcn で入れておく。使わないなら消す) ----
.PHONY: ui-add ui-update
ui-add: ## 部品を取り込む(make ui-add name="@8341/8341-base @8341/button")
	@test -f components.json || { echo 'components.json がない(ARCHITECTURE.md の「技術スタック」のデザインシステムの行)' >&2; exit 2; }
	$(call require,name,$(UI_RE),make ui-add name=@8341/button)
	@set -f; pnpm exec shadcn add $$name
ui-update: ## 取り込んだ部品を取り込み直す(make ui-update name="@8341/button")
	@test -f components.json || { echo 'components.json がない(ARCHITECTURE.md の「技術スタック」のデザインシステムの行)' >&2; exit 2; }
	$(call require,name,$(UI_RE),make ui-update name=@8341/button)
	@set -f; pnpm exec shadcn add --overwrite $$name

# ---- デザインシステムの D を選んだときだけ(references/design-system.md の「ハーネスに足すもの」)。使わないなら消す ----
# 生成物(src/styles/foundation/ の tokens.css など)はコミットする。ds-check を check の中で呼ぶ(package.json の check に足す)
.PHONY: ds-generate ds-check
ds-generate: ## トークン、tw-merge の設定、DESIGN.md の自動の範囲を生成し直す
	node scripts/design/build-tokens.ts
	node scripts/design/generate-tw-merge.ts
	node scripts/design/sync-design-md.ts
	node scripts/design/sync-product-design.ts
ds-check: ## 生成物の鮮度、コントラスト、部品の構造、クラスの監査
	node scripts/design/build-tokens.ts --check
	node scripts/design/check-contrast.ts
	node scripts/design/generate-tw-merge.ts --check
	node scripts/design/sync-design-md.ts --check
	node scripts/design/sync-product-design.ts --check
	node scripts/design/check-structure.ts
	node scripts/design/audit-classes.ts
