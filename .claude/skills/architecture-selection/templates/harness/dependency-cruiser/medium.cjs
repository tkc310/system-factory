/**
 * 構造「中規模以上」の依存ルール。references/principles.md の「依存の向き」の表をそのまま設定にしたもの。
 * feature を src/components/features/(画面)、src/api/features/(サーバー)、src/shared/features/(画面とサーバーで共用するバリデーション・オブジェクト・定数)に
 * 同じ名前で置く形に効く。対象リポジトリでは `.dependency-cruiser.cjs` として置く。
 * @type {import('dependency-cruiser').IConfiguration}
 */
const A = "^src/api/features/";
const C = "^src/components/features/";
const P = "^src/shared/features/";

/** entity.ts、src/shared/features/、src/shared/lib/ が import してよい npm パッケージ(I/O を行わないもの)。必要に応じて足す。 */
const PURE_PACKAGES = ["zod", "neverthrow"];

/** ORM と DB ドライバー。feature の中では repository.ts と tables.ts だけが使う。採ったものに合わせる。 */
const ORM_PACKAGES = ["drizzle-orm", "postgres", "pg"];

const NPM_TYPES = ["npm", "npm-dev", "npm-peer", "npm-optional", "npm-no-pkg", "npm-unknown", "core"];

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "循環依存を作らない。",
      from: {},
      to: { circular: true },
    },
    // ---- サーバー(src/api/features/) ----
    {
      name: "public-api-only",
      severity: "error",
      comment: "他の feature のサーバーの処理は index.ts からだけ使う。entity.ts、repository.ts、テーブル定義などの内部を import しない。",
      from: { path: `${A}([^/]+)/` },
      to: { path: `${A}[^/]+/`, pathNot: [`${A}$1/`, `${A}[^/]+/index\\.ts$`] },
    },
    {
      name: "outside-public-api-only",
      severity: "error",
      comment: "src/api/features/ の外(app/ を除く)からは index.ts だけを使う。",
      from: { pathNot: [A, "^src/app/"] },
      to: { path: `${A}[^/]+/`, pathNot: `${A}[^/]+/index\\.ts$` },
    },
    {
      name: "app-entry-points",
      severity: "error",
      comment: "app/ が src/api/features/ で使えるのは index.ts と commands/ だけ。",
      from: { path: "^src/app/" },
      to: { path: `${A}[^/]+/`, pathNot: `${A}[^/]+/(index\\.ts$|commands/)` },
    },
    {
      name: "index-exports-public-only",
      severity: "error",
      comment: "index.ts は command、repository.ts、tables.ts を公開しない。command は app/ からだけ呼ぶ。",
      from: { path: `${A}[^/]+/index\\.ts$` },
      to: { path: `${A}[^/]+/(commands/|repository\\.ts$|tables\\.ts$)` },
    },
    {
      name: "command-query-scope",
      severity: "error",
      comment: "commands/ と queries/ が同じ feature の中で使えるのは services/、entity.ts、repository.ts と、自分と同じディレクトリだけ。テーブル定義は repository.ts を通す。",
      from: { path: `${A}([^/]+)/(commands|queries)/` },
      to: { path: `${A}$1/`, pathNot: [`${A}$1/$2/`, `${A}$1/services/`, `${A}$1/(entity|repository)\\.ts$`] },
    },
    {
      name: "service-scope",
      severity: "error",
      comment: "services/ が同じ feature の中で使えるのは services/、entity.ts、repository.ts だけ。",
      from: { path: `${A}([^/]+)/services/` },
      to: { path: `${A}$1/`, pathNot: [`${A}$1/services/`, `${A}$1/(entity|repository)\\.ts$`] },
    },
    {
      name: "repository-scope",
      severity: "error",
      comment: "repository.ts が同じ feature の中で使えるのは entity.ts と tables.ts だけ。",
      from: { path: `${A}([^/]+)/repository\\.ts$` },
      to: { path: `${A}$1/`, pathNot: `${A}$1/(entity|tables)\\.ts$` },
    },
    {
      name: "entity-is-pure",
      severity: "error",
      comment: "entity.ts(ドメインモデル)が使えるのは、同じ feature の src/shared/features/ と src/shared/lib/ だけ。",
      from: { path: `${A}([^/]+)/entity\\.ts$` },
      to: { path: "^src/", pathNot: [`${P}$1/`, "^src/shared/lib/"] },
    },
    {
      name: "entity-no-io-libraries",
      severity: "error",
      comment: "entity.ts は I/O を行うライブラリと Node.js の組み込みモジュールを使わない。",
      from: { path: `${A}[^/]+/entity\\.ts$` },
      to: { dependencyTypes: NPM_TYPES, pathNot: `node_modules/(${PURE_PACKAGES.join("|")})/` },
    },
    {
      name: "orm-only-in-repository",
      severity: "error",
      comment: "feature の中で ORM と DB 接続を使うのは repository.ts と tables.ts だけ。読み書きは repository.ts を通す。",
      from: { path: A, pathNot: [`${A}[^/]+/(repository|tables)\\.ts$`, "\\.test\\.tsx?$"] },
      to: { path: [`node_modules/(${ORM_PACKAGES.join("|")})/`, "^src/api/db/"] },
    },
    {
      name: "api-own-shared-feature",
      severity: "error",
      comment: "サーバーの feature が使える src/shared/features/ は、同じ名前の feature だけ。",
      from: { path: `${A}([^/]+)/` },
      to: { path: P, pathNot: `${P}$1/` },
    },
    {
      name: "api-no-components",
      severity: "error",
      comment: "src/api/ は画面のコード(src/components/)と app/ を import しない。",
      from: { path: "^src/api/" },
      to: { path: "^src/(app|components)/" },
    },
    {
      name: "api-infra-scope",
      severity: "error",
      comment: "src/api/db/ と src/api/auth/ は feature を import しない。使えるのは src/api/db/、src/api/auth/、src/shared/lib/ だけ。",
      from: { path: "^src/api/(db|auth)/" },
      to: { path: "^src/", pathNot: ["^src/api/(db|auth)/", "^src/shared/lib/"] },
    },
    // ---- 画面(src/components/features/) ----
    {
      name: "components-no-api",
      severity: "error",
      comment: "画面は src/api/ を import しない。データは app/ から props で受け取る(component-structure.md)。",
      from: { path: "^src/components/" },
      to: { path: "^src/api/" },
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
    // ---- 共用(src/shared/) ----
    {
      name: "shared-is-leaf",
      severity: "error",
      comment: "src/shared/ は画面とサーバーで共用するコードだけ。app/、src/api/、src/components/features/ を import しない。",
      from: { path: "^src/shared/" },
      to: { path: "^src/(app|api|components/features)/" },
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
      to: { dependencyTypes: NPM_TYPES, pathNot: `node_modules/(${PURE_PACKAGES.join("|")})/` },
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
