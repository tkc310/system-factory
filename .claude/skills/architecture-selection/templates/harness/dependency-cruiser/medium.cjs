/**
 * 構造「中規模以上」の依存ルール。references/principles.md の「依存の向き」の表をそのまま設定にしたもの。
 * feature を src/components/features/(画面)、src/server/features/(サーバー)、src/shared/features/(両方で使う純粋なコード)に
 * 同じ名前で置く形に効く。対象リポジトリでは `.dependency-cruiser.cjs` として置く。
 * @type {import('dependency-cruiser').IConfiguration}
 */
const S = "^src/server/features/";
const C = "^src/components/features/";
const P = "^src/shared/features/";

/** src/shared/features/ と src/shared/lib/ が import してよい npm パッケージ(I/O を行わないもの)。必要に応じて足す。 */
const PURE_PACKAGES = ["zod", "neverthrow"];

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存を作らない。",
      from: {},
      to: { circular: true },
    },
    // ---- サーバー(src/server/features/) ----
    {
      name: "public-api-only",
      severity: "error",
      comment: "他の feature のサーバーの処理は index.ts からだけ使う。内部のファイルやテーブル定義を import しない。",
      from: { path: `${S}([^/]+)/` },
      to: { path: `${S}[^/]+/`, pathNot: [`${S}$1/`, `${S}[^/]+/index\\.ts$`] },
    },
    {
      name: "outside-public-api-only",
      severity: "error",
      comment: "src/server/features/ の外(app/ を除く)からは index.ts だけを使う。",
      from: { pathNot: [S, "^src/app/"] },
      to: { path: `${S}[^/]+/`, pathNot: `${S}[^/]+/index\\.ts$` },
    },
    {
      name: "app-entry-points",
      severity: "error",
      comment: "app/ が src/server/features/ で使えるのは index.ts と commands/ だけ。",
      from: { path: "^src/app/" },
      to: { path: `${S}[^/]+/`, pathNot: `${S}[^/]+/(index\\.ts$|commands/)` },
    },
    {
      name: "index-does-not-export-commands",
      severity: "error",
      comment: "index.ts は command を公開しない。command は app/ からだけ呼ぶ。",
      from: { path: `${S}[^/]+/index\\.ts$` },
      to: { path: `${S}[^/]+/commands/` },
    },
    {
      name: "command-query-scope",
      severity: "error",
      comment: "commands/ と queries/ が同じ feature の中で使えるのは services/ と tables.ts と、自分と同じディレクトリだけ。",
      from: { path: `${S}([^/]+)/(commands|queries)/` },
      to: { path: `${S}$1/`, pathNot: [`${S}$1/$2/`, `${S}$1/services/`, `${S}$1/tables\\.ts$`] },
    },
    {
      name: "service-scope",
      severity: "error",
      comment: "services/ が同じ feature の中で使えるのは services/ と tables.ts だけ。",
      from: { path: `${S}([^/]+)/services/` },
      to: { path: `${S}$1/`, pathNot: [`${S}$1/services/`, `${S}$1/tables\\.ts$`] },
    },
    {
      name: "server-own-shared-feature",
      severity: "error",
      comment: "サーバーの feature が使える src/shared/features/ は、同じ名前の feature だけ。",
      from: { path: `${S}([^/]+)/` },
      to: { path: P, pathNot: `${P}$1/` },
    },
    {
      name: "server-no-components",
      severity: "error",
      comment: "src/server/ は画面のコード(src/components/)と app/ を import しない。",
      from: { path: "^src/server/" },
      to: { path: "^src/(app|components)/" },
    },
    {
      name: "server-infra-scope",
      severity: "error",
      comment: "src/server/db/ と src/server/auth/ は feature を import しない。使えるのは src/server/db/、src/server/auth/、src/shared/lib/ だけ。",
      from: { path: "^src/server/(db|auth)/" },
      to: { path: "^src/", pathNot: ["^src/server/(db|auth)/", "^src/shared/lib/"] },
    },
    // ---- 画面(src/components/features/) ----
    {
      name: "components-no-server",
      severity: "error",
      comment: "画面は src/server/ を import しない。データは app/ から props で受け取る(component-structure.md)。",
      from: { path: "^src/components/" },
      to: { path: "^src/server/" },
    },
    {
      name: "components-feature-scope",
      severity: "error",
      comment: "feature の画面は、他の feature の画面を import しない。複数の feature で使う部品は src/shared/ui/ に移す。",
      from: { path: `${C}([^/]+)/` },
      to: { path: C, pathNot: `${C}$1/` },
    },
    {
      name: "components-own-shared-feature",
      severity: "error",
      comment: "feature の画面が使える src/shared/features/ は、同じ名前の feature だけ。",
      from: { path: `${C}([^/]+)/` },
      to: { path: P, pathNot: `${P}$1/` },
    },
    // ---- 共有(src/shared/) ----
    {
      name: "shared-is-leaf",
      severity: "error",
      comment: "src/shared/ は画面とサーバーの両方で使うコードだけ。app/、src/server/、src/components/features/ を import しない。",
      from: { path: "^src/shared/" },
      to: { path: "^src/(app|server|components/features)/" },
    },
    {
      name: "shared-feature-scope",
      severity: "error",
      comment: "src/shared/features/<feature>/ が使えるのは、同じ feature の src/shared/features/ と src/shared/lib/ だけ。",
      from: { path: `${P}([^/]+)/` },
      to: { path: "^src/", pathNot: [`${P}$1/`, "^src/shared/lib/"] },
    },
    {
      name: "shared-pure-no-io-libraries",
      severity: "error",
      comment: "src/shared/features/ と src/shared/lib/ は I/O を行うライブラリと Node.js の組み込みモジュールを使わない(テストを除く)。",
      from: { path: "^src/shared/(features|lib)/", pathNot: "\\.test\\.tsx?$" },
      to: {
        dependencyTypes: ["npm", "npm-dev", "npm-peer", "npm-optional", "npm-no-pkg", "npm-unknown", "core"],
        pathNot: `node_modules/(${PURE_PACKAGES.join("|")})/`,
      },
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
