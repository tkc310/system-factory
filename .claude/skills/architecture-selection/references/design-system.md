# デザインシステムの選択

画面を持つサービスでは、デザインシステムの扱いを次の 4 つから選ぶ。画面を持たないサービス(API だけ、バッチだけ)では選ばない。

| 選択 | 内容 | 向いている案件 |
| --- | --- | --- |
| A. 8341-ui を使わない | デザインシステムを導入しない。組織の既存のデザインシステムがあればそれを使う | 組織の標準がある、画面がごく少ない、React 以外の画面 |
| B. 8341-ui を使う | [8341-ui](https://github.com/tkc310/8341-ui) のトークンとコンポーネントを shadcn のレジストリで取り込む | 新規のサービスで、アクセシビリティを担保した部品を早くそろえたい |
| C. デザインシステムを作って共有する | 8341-ui をひな形に、組織のデザインシステムのリポジトリを作り、レジストリで配って B と同じ方法で取り込む | ブランドのキーカラーや見た目の性格が決まっていて、**複数のプロダクトで共有する** |
| D. 8341-ui をカスタマイズしてプロダクトに組み込む | 8341-ui をひな形に色調などを変えたデザインシステムを生成し、リポジトリもワークスペースも作らず、**プロダクトのソースの一部**(部品は `src/components/ui/`、トークンと土台は `src/styles/foundation/`)として置く | 見た目を 8341-ui から変えたいが、**そのプロダクトでしか使わない**(1 人や少人数の開発、流用の予定がない) |

8341-ui は、[デジタル庁デザインシステム(DADS)](https://design.digital.go.jp/dads/) のアクセシビリティ基準(WCAG 2.2 AA)を土台にしたデザインシステムで、トークン(W3C DTCG)、Base UI + Tailwind CSS v4 のコンポーネント、Storybook、画面設計のルール(design-principles)を持つ。

## 選び方

**必須**

- ヒアリングの「画面とデザインシステム」([hearing.md](./hearing.md))の回答で選ぶ。選んだものと理由を ARCHITECTURE.md と ADR に書く。
- B、C、D は、画面が React(19 以上)で、Tailwind CSS v4(4.1 以上)を使える場合に限る。どちらかを満たさないときは A にする。
  - 理由: 8341-ui の部品は React と Base UI で書かれ、スタイルは Tailwind v4 のテーマに依存する。
- 8341-ui の見た目(キーカラー、中立色、書体)を変えたいときは C か D にする。複数のプロダクトで共有するなら C、そのプロダクトだけで使うなら D にする。迷ったら D にし、2 つ目のプロダクトで使うことになったら C に切り出す(見直し条件に書く)。
  - 理由: C の配布の仕組み(リポジトリ、レジストリ、リリース、取り込み直し)は、使う側が 1 つなら手間だけが残る。D から C への切り出しは、置き場所を移すだけで済む。
- C は、デザインシステムのリポジトリを新しく作るので、作る前にユーザーの承認を得る([承認](./human-approval.md))。D はリポジトリを作らないが、多くのファイルをプロダクトに足すので、写す範囲(下の対応表)を示して確認を得る。
- 回答が得られないときは A にし、B、C、D に移る条件(画面が増えた、ブランドが決まった)を ADR の見直し条件に書く。
  - 理由: 外部のデザインシステムへの依存は、後から足せる。

**推奨**

- 組織のデザインシステムがなく、React で画面を作るなら、B を勧める。部品ごとのアクセシビリティの検証と、画面設計のルールが最初からそろう。
- D を選んでも、ワークスペース(トークン、部品、Storybook を別のパッケージにする形)は作らない。トークンをビルドしてから部品とアプリが読む順番や、パッケージごとの設定が増えるだけで、1 つのプロダクトでは得るものがない。

## A. 8341-ui を使わない

- 組織のデザインシステムがあれば、その導入手順に従い、名前と版を ARCHITECTURE.md に書く。
- なければ、画面のフレームワークの標準的な部品(shadcn/ui など)を使う。アクセシビリティの基準(WCAG 2.2 AA)は [品質ゲート](./quality-gates.md) とテストで守る。

## B. 8341-ui を使う

### 取り込み方

部品のコードをプロジェクトに取り込む shadcn 方式を使う(8341-ui は npm にも公開できるが、使わない)。

1. 8341-ui の [GitHub Releases](https://github.com/tkc310/8341-ui/releases) で最新の版(タグ `8341-ui@<版>`)を確かめ、その版を固定したレジストリを `components.json` に登録する。版は記憶で書かない。

   ```json
   {
     "registries": { "@8341": "https://tkc310.github.io/8341-ui/r/v<版>/{name}.json" }
   }
   ```

   - 理由: 版のない URL(`/r/{name}.json`)は常に 8341-ui の main の最新を返すので、取り込み直すたびに部品が変わりうる。版を固定すると、更新を自分で選べる。
   - `make check-versions` は、固定した版がリリースの最新より古いか、版を固定していないときに知らせる([ハーネス](../templates/harness/README.md) の「版の確認」)。

2. 土台と、使う部品を取り込む。

   shadcn の CLI は `make add-dev-exact pkg=shadcn` で版を固定して開発用の依存に入れ(`make check-versions` で鮮度を見られる)、`make ui-add` で取り込む。

   ```bash
   make ui-add name="@8341/8341-base @8341/button @8341/form-field @8341/text-field"
   ```

3. 全体の CSS でテーマを読み込む。

   ```css
   @import 'tailwindcss';
   @import './styles/8341-ui.css';
   ```

4. テーマの切り替えは `<html class="dark">` か `<html data-theme="dark">` で行う。どちらもなければ OS の設定に従う。

部品の一覧は、導入時に 8341-ui の README と `packages/ui/registry.json` で確かめる。

### 置き場所と構造

- 取り込んだ部品は、段階によらず `src/shared/ui/ds/` に置き、feature の `ui/`(中規模以上は `src/components/features/<feature>/`)から import する。自分で書く共通の部品(`src/shared/ui/` の PascalCase のディレクトリ)と分けるため([コンポーネントの構造](./component-structure.md))。
- `components.json` の `aliases.ui` を `src/shared/ui/ds/` に、`aliases.lib` を `src/shared/lib/` に合わせる(8341-ui の `tv` などの共通処理が入る)。
- 取り込んだ部品のファイルは手で書き換えない。直したいときは、8341-ui に Issue を出すか、プロジェクト側で包む部品を作る。
- 部品を更新するときは、8341-ui の CHANGELOG(Releases の本文)で利用側の修正が要る変更(0.x では minor)を確かめ、`components.json` の URL の版を上げて、取り込んだ部品をすべて `make ui-update name="@8341/<name> …"` で取り込み直す。版を ARCHITECTURE.md にも書く。
  - 理由: 手で書き換えると、取り込み直したときに変更が消え、8341-ui の検証(アクセシビリティ、コントラスト)からも外れる。
- `src/shared/ui/ds/` を保護パスに加える。`scripts/guard-paths.sh` の case と `.github/CODEOWNERS` に足し、ARCHITECTURE.md の編集制約に書く([編集制約](./editing-constraints.md#保護パス))。

### DESIGN.md

- リポジトリ直下に DESIGN.md を置く。8341-ui の `templates/PRODUCT-DESIGN.md` を写して埋める(プロダクトの概要、画面領域ごとの UI の方向性とサービス種別、採用したルール、外した必須とその理由、8341-ui からの拡張)。
- 8341-ui 側の仕様(トークン、部品、Do / Don't)は写さず、8341-ui の DESIGN.md を参照する。
- 画面を作るエージェントは、作業の前にプロジェクトの DESIGN.md と 8341-ui の DESIGN.md を読む。この指示を AGENTS.md に書く。

### 守ること

**必須**

- アクセシビリティの目標は WCAG 2.2 AA から緩めない。
- 色、余白、文字の大きさは、8341-ui のトークン(CSS 変数と Tailwind のテーマ)だけで指定する。任意の値(`#123456`、`p-[13px]` など)を書かない。
- プロダクト固有のトークンや部品を足したら、DESIGN.md の「8341-ui からの拡張」に書く。他のプロダクトでも使えそうなら 8341-ui に Issue で提案する。

## C. デザインシステムを作って共有する

8341-ui は、新しいデザインシステムのリポジトリを作るファクトリー(`ds-factory` スキル)を持つ。デザインシステムを作る作業は 8341-ui のリポジトリで行い、このスキルでは結果を取り込むところまでを扱う。

1. ユーザーの承認を得る(新しいリポジトリを作るため)。
2. 8341-ui を手元に複製し、そのリポジトリで Claude Code を開いて `/ds-factory` を実行する。手順は 8341-ui の `docs/factory.md` と `.claude/skills/ds-factory/SKILL.md` に従う。ヒアリングで、名前、接頭辞、キーカラーなどを決め、位置づけは「共有の基盤」にする。
3. 生成したデザインシステムのリポジトリで、その AGENTS.md の手順で道具を入れて検査を通し、GitHub に公開して、レジストリ(GitHub Pages)を配信する。
4. 最初の版をリリースする。手順はそのリポジトリの `docs/releasing.md` にあり、権限のある人が手元で行う。これで版を固定したレジストリ `r/v<版>/` と GitHub Releases ができる。
5. このサービスでは、B と同じ方法で、版を固定して取り込む。レジストリの名前空間と URL は、生成したものに置き換える(例: `@acme`、`https://<owner>.github.io/<リポジトリ名>/r/v<版>/{name}.json`)。
6. 作ったデザインシステムのリポジトリ名、レジストリの URL、接頭辞を ARCHITECTURE.md と ADR に書く。

## D. 8341-ui をカスタマイズしてプロダクトに組み込む

8341-ui の ds-factory で、色調などを変えたデザインシステムを生成し、その中身をプロダクトのソースに写す。新しいリポジトリ、ワークスペース、レジストリ、リリースは作らない。部品のビルドもしない。実例は [tkc310/bouzu](https://github.com/tkc310/bouzu) の ADR-0015 にある。

### 手順

1. 写す範囲(下の対応表と「外すもの」)をユーザーに示して確認を得る。
2. 8341-ui を作業用の場所に複製し、そのリポジトリで Claude Code を開いて `/ds-factory` を実行する。ヒアリングで、名前、接頭辞、キーカラー、中立色、書体を決め、位置づけは「専用」にする。生成したものは GitHub に公開しない(作業用の場所は、写し終えたら消してよい)。
3. 生成した側で、依存なしで動く検査(コントラスト、DESIGN.md の自動の表)を通す。キーカラーが状態色(エラー、警告、フォーカス)の色相に近いときは、状態色の色相をずらして見分けを保つ(OKLab の色差で確かめる)。
4. 下の対応表のとおりにプロダクトへ写し、スクリプトと文書の中のパスを写した先に合わせて直す。
5. トークンの生成物を作ってコミットし、検査を通す(下の「ハーネスに足すもの」)。
6. ARCHITECTURE.md と ADR に書く(この文書の最後の節)。

### 置き場所(対応表)

**必須**

| ds-factory の生成物(ひな形の置き場所) | プロダクトでの置き場所 |
| --- | --- |
| `packages/ui/src/components/ui/<Name>/` | `src/components/ui/<Name>/`(本体 `index.tsx`、テスト、ストーリー、フック) |
| `packages/ui/src/components/COMPONENT_STRUCTURE.md` | `src/components/ui/README.md` |
| `AGENTS.md`(デザインシステムの作業ガイド) | `src/components/ui/AGENTS.md`(プロダクトの置き場所とコマンドに書き直す) |
| `packages/ui/src/lib/`(`tv.ts`、`focus.ts`、`tw-merge-config.ts`) | `src/styles/foundation/` |
| `packages/ui/src/styles/theme.css` の `@utility` と `@layer base` | `src/styles/foundation/utilities.css`(トークンの `@import` は外す) |
| `packages/tokens/src/`(DTCG、Resolver、`palette.config.json`、`contrast.rules.json`) | `src/styles/foundation/tokens/` |
| トークンのビルドの出力(`dist/css/tokens.css`、`dist/css/tailwind.css`、`dist/tokens.json`) | `src/styles/foundation/tokens.css`、`tailwind-theme.css`、`tokens.json`(**コミットする**) |
| `packages/ui/src/test/a11y.ts`、`vitest.setup.ts` | `src/test/` |
| `packages/tokens/scripts/`、`packages/ui/scripts/`(構造とクラスの監査)、`scripts/sync-product-design.ts` | `scripts/design/` |
| `apps/storybook/.storybook/` | リポジトリ直下の `.storybook/`(ストーリーは部品の隣のまま) |
| `DESIGN.md`、`docs/`(rulebook、decisions、improvement、assets) | `docs/design-system/` |
| `docs/design-principles/` | `docs/design-principles/`(スキルの `references` のシンボリックリンクがこの場所を指す) |
| `.claude/skills/`(design-principles、design-adjust、design-review、ds-build-ui、ds-improve) | `.claude/skills/` |
| `templates/PRODUCT-DESIGN.md` | 写さない。原則の要約は、プロダクトの `DESIGN.md` の「デザイン原則」に直接生成する |

- CSS の入口は `src/styles/global.css` に 1 つだけ置き、`tailwindcss`、`foundation/tokens.css`、`foundation/tailwind-theme.css`、`foundation/utilities.css` の順に読む。画面のルートで一度だけ読み込む。
- 画面は部品を `@/components/ui/<Name>/index` から import する。全部品をまとめて export する入口(`src/index.ts`)は作らない。
- 部品の中の import は、`@/lib/*` を `@/styles/foundation/*` に書き換える。`@/components/ui/*` と `@/test/*` はそのまま使える(プロダクトの `@/` が `src/` を指すとき)。
- このプロダクトの題材に依る部品は `src/components/ui/` に置かず、[コンポーネントの構造](./component-structure.md) のとおり `src/shared/ui/` か feature の `ui/`(中規模以上は `src/components/features/<feature>/`)に置く。

### 外すもの

**必須**

流用のための仕組みは写さない。

| 外すもの | 理由 |
| --- | --- |
| ワークスペース(`pnpm-workspace.yaml` の `packages`、各パッケージの `package.json`、`tsconfig`、`vite.config.ts`)、catalog | パッケージを 1 つにする。依存はプロダクトの `package.json` に直接書く |
| 部品のビルド(`vp pack`)、ビルド済みの `styles.css`、`packages/ui/src/index.ts` | アプリのソースとして直接 import する |
| shadcn のレジストリ(`registry.json`、生成スクリプト)、GitHub Pages のレジストリ、`components.json` | 配らない |
| リリース(Changesets、`docs/releasing.md`、`scripts/release.mjs`)、npm への公開、`CHANGELOG.md`、`LICENSE` と `SECURITY.md`(プロダクトのものを使う) | 配らない |
| デザインシステムの CI、Makefile、`CLAUDE.md`、`CONTRIBUTING.md`、`docs/operations.md` | プロダクトのハーネスに統合する |
| `templates/`、`design-init` スキル、スキルの目録の検査(`check-skills`) | プロダクトに DESIGN.md は 1 つだけ |

**推奨**

使わないなら、次も外す。外したものは ADR に書き、戻す条件を見直し条件に書く。

| 外してよいもの | 戻す条件 |
| --- | --- |
| Figma(Variables の書き出し、Code Connect の `index.figma.ts`) | Figma で画面を作るようになった |
| VRT(`*.vrt.test.tsx`)、ストーリーを実ブラウザで描くテスト(addon-vitest)、Storybook の e2e | 見た目の退行が繰り返し起きた。外す間は、部品のテストの axe(happy-dom で構造の規則)と、Storybook の a11y パネル(手動)で確かめる |
| スライド(`ds-slides`) | 発表用のスライドをトークンで作りたくなった |

### ハーネスに足すもの

**必須**

- トークンの生成物はコミットし、アプリにビルドの手順を足さない。生成のスクリプトに `--check` を持たせ、生成物が元と一致しないときに失敗させる。
  - 理由: 生成を開発サーバーとビルドの前提にすると、手順と依存の順番が増える。トークンの変更は少ない。
  - トークンのビルドのスクリプトは、出力先のディレクトリを消さない(ひな形は `dist/` を消してから書く。`src/styles/foundation/` にはほかのファイルもある)。途中の出力は一時ディレクトリに置く。
  - 生成物に日時を入れない(2 回続けて生成して差分が出ないこと)。
- コマンドの入口(`make` か `vp run`)に 2 つ足す。
  - `ds-generate`: トークンの CSS と JSON、tw-merge の設定、`docs/design-system/DESIGN.md` の自動の表、プロダクトの `DESIGN.md` の原則を生成し直す
  - `ds-check`: 生成物の鮮度(`--check`)、コントラスト、部品の構造、クラスの監査。`check`(完了の条件と CI)に含める
- 保護パスに、生成物(`tokens.css`、`tailwind-theme.css`、`tokens.json`、`tw-merge-config.ts`、`tokens/primitive/color.tokens.json`)と検査の基準(`tokens/contrast.rules.json`)を足す([編集制約](./editing-constraints.md#保護パス))。
- dependency-cruiser に次を足す。
  - `src/styles/foundation/` は `src/` のほかの場所を import しない
  - `src/components/ui/` が使えるのは、ほかの部品と `src/styles/foundation/` だけ(テストとストーリーは `src/test/` も)。アプリのコード(feature、`src/shared/`、`src/api/`、入口)を import しない
  - 部品同士と、アプリから部品へは、各ディレクトリの `index.tsx` を通す
  - Base UI(`@base-ui/react`)は `src/components/ui/` の中だけで使う
  - `src/shared/ui/` の import してよい先に、`src/components/ui/` と `src/styles/foundation/` を足す
- 自動生成の範囲の印(`<!-- auto:x -->`)は、行の全体に一致するものだけを拾う。本文の中で印の名前を書くと、そこから置き換えられて本文が消える。

**推奨**

- lint は、デザインシステムの範囲(`src/components/ui/`、`src/styles/foundation/`、`scripts/design/`、`.storybook/`)にだけ、ひな形の規則(行数の上限なし)を `overrides` で掛ける。整形の型(引用符、行の幅)は、ひな形に合わせてリポジトリ全体でそろえると差分が小さい。
- 部品は、プロダクトの tsconfig(`exactOptionalPropertyTypes` などがひな形より厳しいことがある)で初めて型検査される。誤りは部品の側を直し、設定を緩めない。
- Storybook を公開するなら、検査と別のワークフローで、`main` への push だけで動かし、公開のジョブ(`pages: write`、`id-token: write`)はコードを実行しない形にする。秘密は使わない。CI でデプロイしない方針の例外として ADR に書く。

### DESIGN.md

- プロダクトの `DESIGN.md` は B と同じく、コードから読み取れない考え方だけを書く。トークンと部品の仕様は `docs/design-system/DESIGN.md` を参照する。
- 「デザイン原則」の範囲は `ds-generate` が `docs/design-principles/` から書き出す。手で書かない。
- 画面を作るエージェントは、プロダクトの `DESIGN.md` と `docs/design-system/DESIGN.md` を読む。デザインシステムを変えるエージェントは `src/components/ui/AGENTS.md` を読む。この指示を AGENTS.md に書く。

### 守ること

**必須**

- アクセシビリティの目標は WCAG 2.2 AA から緩めない。キーカラーや中立色を変えたら、コントラストの検査(全組み合わせ、ライトとダーク)を通す。
- 色、余白、文字の大きさは、トークンだけで指定する。値を変えるときは元(`tokens/` の DTCG、`palette.config.json`)を直して `ds-generate` を実行する。生成物を手で直さない。
- 8341-ui の改善を取り込むときは、差分を手で当て、`ds-check` を通す。8341-ui に役立つ変更(足した部品、見つけた不具合)は 8341-ui に Issue で提案する。

## ARCHITECTURE.md と ADR に書くこと

- 選択(A / B / C / D)と理由
- B と C: レジストリの URL(固定した版を含む)、名前空間、取り込んだ部品、DESIGN.md の場所
- C: 作ったデザインシステムのリポジトリ
- D: ひな形にした 8341-ui のコミット、変えたもの(キーカラー、中立色、状態色、書体)、置き場所、外したもの、生成物をコミットすること
- 見直し条件(A から B / C / D に移る条件、D から C に切り出す条件など)
