/**
 * 構造「小規模」の依存ルール。references/principles.md の「依存の向き」の表をそのまま設定にしたもの。
 * 対象リポジトリでは `.dependency-cruiser.cjs` として置く。
 * @type {import('dependency-cruiser').IConfiguration}
 */
const U = "^src/features/";

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存を作らない。",
      from: {},
      to: { circular: true },
    },
    {
      name: "public-api-only",
      severity: "error",
      comment: "他の feature は index.ts からだけ使う。内部のファイルやテーブル定義を import しない。",
      from: { path: `${U}([^/]+)/` },
      to: { path: `${U}[^/]+/`, pathNot: [`${U}$1/`, `${U}[^/]+/index\\.ts$`] },
    },
    {
      name: "outside-public-api-only",
      severity: "error",
      comment: "features/ の外(app/ を除く)からは index.ts だけを使う。",
      from: { pathNot: [U, "^src/app/"] },
      to: { path: `${U}[^/]+/`, pathNot: `${U}[^/]+/index\\.ts$` },
    },
    {
      name: "app-entry-points",
      severity: "error",
      comment: "app/ が使えるのは index.ts、commands/、ui/ だけ。",
      from: { path: "^src/app/" },
      to: { path: `${U}[^/]+/`, pathNot: `${U}[^/]+/(index\\.ts$|commands/|ui/)` },
    },
    {
      name: "index-does-not-export-commands",
      severity: "error",
      comment: "index.ts は command を公開しない。command は app/ からだけ呼ぶ。",
      from: { path: `${U}[^/]+/index\\.ts$` },
      to: { path: `${U}[^/]+/commands/` },
    },
    {
      name: "command-query-scope",
      severity: "error",
      comment: "commands/ と queries/ が同じ feature の中で使えるのは services/ と、自分と同じディレクトリだけ。",
      from: { path: `${U}([^/]+)/(commands|queries)/` },
      to: { path: `${U}$1/`, pathNot: [`${U}$1/$2/`, `${U}$1/services/`] },
    },
    {
      name: "service-scope",
      severity: "error",
      comment: "services/ が同じ feature の中で使えるのは services/ だけ。",
      from: { path: `${U}([^/]+)/services/` },
      to: { path: `${U}$1/`, pathNot: [`${U}$1/services/`] },
    },
    {
      name: "ui-scope",
      severity: "error",
      comment: "ui/ が同じ feature の中で使えるのは ui/ と index.ts だけ。データは app/ から props で受け取る(component-structure.md)。",
      from: { path: `${U}([^/]+)/ui/` },
      to: { path: `${U}$1/`, pathNot: [`${U}$1/ui/`, `${U}$1/index\\.ts$`] },
    },
    {
      name: "ui-no-server",
      severity: "error",
      comment: "ui/ は DB や認証などのサーバーの処理を import しない。",
      from: { path: `${U}[^/]+/ui/` },
      to: { path: "^src/shared/(db|auth)/" },
    },
    {
      name: "shared-ui-scope",
      severity: "error",
      comment: "shared/ui/ は共通の部品だけ。shared/ui/ と shared/lib/(デザインシステムの D のときは src/components/ui/ と src/styles/foundation/ も)以外を import しない。",
      from: { path: "^src/shared/ui/" },
      to: { path: "^src/", pathNot: ["^src/shared/(ui|lib)/", "^src/components/ui/", "^src/styles/foundation/"] },
    },
    // ---- デザインシステムの D(8341-ui をカスタマイズしてプロダクトに組み込む)を選んだとき。B / C / A では該当するファイルがないので効かない ----
    {
      name: "ds-foundation-is-leaf",
      severity: "error",
      comment: "src/styles/foundation/(トークンの生成物、tv、focus)は src/ のほかの場所を import しない。",
      from: { path: "^src/styles/foundation/" },
      to: { path: "^src/", pathNot: "^src/styles/foundation/" },
    },
    {
      name: "ds-components-scope",
      severity: "error",
      comment: "デザインシステムの部品(src/components/ui/)が使えるのは、ほかの部品と src/styles/foundation/ だけ。テストとストーリーは src/test/ も使える。",
      from: { path: "^src/components/ui/", pathNot: "\\.(stories|test)\\.tsx?$" },
      to: { path: "^(src|app)/", pathNot: ["^src/components/ui/", "^src/styles/foundation/"] },
    },
    {
      name: "ds-components-via-index",
      severity: "error",
      comment: "部品同士とアプリから部品へは、各ディレクトリの index.tsx を通す。子の部品とフックは親の中だけで使う。",
      from: { path: "^src/components/ui/([^/]+)/" },
      to: { path: "^src/components/ui/[^/]+/(?!index\\.tsx$)", pathNot: "^src/components/ui/$1/" },
    },
    {
      name: "ds-app-via-index",
      severity: "error",
      comment: "アプリは部品を index.tsx から使う。",
      from: { pathNot: ["^src/components/ui/", "^\\.storybook/"] },
      to: { path: "^src/components/ui/[^/]+/(?!index\\.tsx$)" },
    },
    {
      name: "ds-base-ui-only-in-components",
      severity: "error",
      comment: "Base UI はデザインシステムの部品の中だけで使い、画面から直接使わない(D のとき)。",
      from: { path: "^(src|app)/", pathNot: "^src/components/ui/" },
      to: { path: "node_modules/@base-ui/react" },
    },
    {
      name: "shared-is-leaf",
      severity: "error",
      comment: "shared/ は技術的な共通処理だけ。app/ と features を import しない。",
      from: { path: "^src/shared/" },
      to: { path: "^src/(app|features)/" },
    },
    {
      name: "no-test-imports-in-prod",
      severity: "error",
      comment: "本番コードからテストコードを import しない。",
      from: { pathNot: "\\.test\\.tsx?$" },
      to: { path: "\\.test\\.tsx?$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
