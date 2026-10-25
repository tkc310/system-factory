# コンポーネントの構造

この文書は、画面を持つサービスの React コンポーネントの置き場所、名前、ディレクトリの入れ子、import の書き方を定める。ディレクトリの階層を見れば、そのコンポーネントをどこから使ってよいか(スコープ)が分かるようにする。構造の段階(小規模 / 中規模以上)の全体は [構造](./principles.md) にあり、この文書は feature の画面のディレクトリ(小規模は `src/features/<feature>/ui/`、中規模以上は `src/components/features/<feature>/`。以下、まとめて「feature の `ui/`」と呼ぶ)の中身を決める。

## 置き場所

**必須**

| 置き場所 | 置くもの | import してよい先 |
| --- | --- | --- |
| `src/shared/ui/` | どの画面でも使う共通の部品 | `src/shared/ui/` と `src/shared/lib/` だけ(D のときは `src/components/ui/` と `src/styles/foundation/` も) |
| `src/shared/ui/ds/` | デザインシステムから取り込んだ部品([デザインシステム](./design-system.md) の B / C)。手で編集しない | 取り込んだときのまま |
| `src/components/ui/` | プロダクトに組み込んだデザインシステムの部品([デザインシステム](./design-system.md) の D)。題材に依らない部品だけ | ほかの部品と `src/styles/foundation/` だけ |
| `src/styles/foundation/` | D のトークン(元と生成物)と、部品が共有する処理(`tv`、フォーカス表示) | `src/styles/foundation/` だけ |
| `src/shared/layouts/` | 全画面に共通する枠(ヘッダー、パンくずリスト)。ルーターに依存してよい | `src/shared/` |
| 小規模: `src/features/<feature>/ui/` | その feature の画面と、画面だけが使う部品。`app/` のルートから描く | 同じ feature の `ui/` と `index.ts`、`src/shared/ui/`、`src/shared/lib/` |
| 中規模以上: `src/components/features/<feature>/` | その feature の画面と、画面だけが使う部品。`app/` のルートから描く | 同じ feature の `src/components/features/<feature>/` と `src/shared/features/<feature>/`、`src/shared/ui/`、`src/shared/lib/` |

- feature の `ui/` は、command、query、service、テーブル定義を直接 import しない(中規模以上では `src/server/` のすべてを import しない)。表示するデータは `app/` のルートが query で取得して props で渡し、変更の操作は `app/` が用意した関数(サーバーアクションやハンドラー)を props で受け取る。
  - 理由: 「command は `app/` からだけ呼ぶ」([構造](./principles.md#公開-api))を画面でも保てる。画面は props だけで描けるので、Storybook とテストでデータの層を用意しなくて済む。
- feature の `ui/` はルーターに依存しない。パンくずリストの名前やパラメーターなど、ルートから得る値は `app/` のルートから props で渡す。ルーターに依存してよいのは `app/` と `src/shared/layouts/` だけにする。
- 他の feature の `ui/` を import しない(既存の依存ルールで止まる)。複数の feature で使う部品は `src/shared/ui/` に移す。

## 名前

**必須**

- `ui/` の下のコンポーネントのディレクトリは、PascalCase にする(`src/shared/ui/Button/`、小規模の `src/features/order/ui/OrderForm/`、中規模以上の `src/components/features/order/OrderForm/`)。[構造の命名](./principles.md#命名共通) の kebab-case の例外である。
  - 理由: ディレクトリ名とコンポーネント名が一致し、検索と import の書き方から迷わずに場所が分かる。
- コンポーネントの本体は、そのディレクトリの `index.tsx` に書き、ディレクトリ名と同じ名前で名前付き export する(`export function OrderForm`)。default export は使わない。
- 同じディレクトリに置くファイルの名前は次のとおり。

| ファイル | 名前 |
| --- | --- |
| 本体 | `index.tsx` |
| テスト | `index.test.tsx` |
| Storybook のストーリー(Storybook を使うとき) | `index.stories.tsx` |
| カスタムフック | `useXxx.ts`(`useOrderCommands.ts`) |
| それ以外の補助の関数 | kebab-case(`format-price.ts`) |

- 例外: フレームワークがファイル名に意味を持たせる場所(ファイルベースのルーティングなど)は、フレームワークの規則に従う。`app/` のルートは小文字の kebab-case のままにする。
- feature のディレクトリ自体(`src/features/order/`、`src/components/features/order/`)は、構造の命名のとおり kebab-case のままにする。中規模以上では、`src/server/features/` と `src/shared/features/` と同じ feature 名にする。

## ディレクトリの入れ子

**必須**

- 関連するファイル(本体、テスト、ストーリー、フック)は、同じディレクトリに置く。
- 親子関係は、ディレクトリの入れ子で表す。子のコンポーネントは、親のディレクトリの中に置く。

```
src/features/skill-sheet/ui/       # 中規模以上は src/components/features/skill-sheet/
└── SkillSheet/             # ルートが描く画面
    ├── index.tsx
    ├── index.stories.tsx
    ├── useSheetCommands.ts # 画面のフック
    ├── Form/               # SkillSheet だけが使う子
    │   ├── index.tsx
    │   ├── index.stories.tsx
    │   └── CareerDialog/   # Form だけが使う子
    │       └── index.tsx
    └── Preview/            # SkillSheet だけが使う子
        ├── index.tsx
        └── index.stories.tsx
```

- 子は、親とその子孫からだけ使う。兄弟や別の枝から使う必要が出たら、使う側すべての共通の祖先まで引き上げる。別の feature からも使うなら `src/shared/ui/` に移す。
  - 理由: 入れ子がそのまま使ってよい範囲を表すので、子を変えたときの影響が親の中に収まる。
- feature の `ui/` の中に、コンポーネントをまとめて再エクスポートするファイル(`ui/index.ts`、`src/components/features/<feature>/index.ts` など)を作らない。各コンポーネントの `index.tsx` は本体で、barrel ではない([公開 API](./principles.md#公開-api))。

## import の書き方

**必須**

- 自分のディレクトリとその子孫は、相対パスで import する(`./Form`、`./useSheetCommands`)。
- 3 階層以上さかのぼるファイルは、相対パスではなくパスエイリアス `@/` で import する(`@/shared/ui/Button`)。リンターの `no-restricted-imports` で `../../../` を禁止する。
  - 理由: 深い相対パスは、ファイルを動かすと壊れ、どこを指しているかも読み取りにくい。

## デザインシステムとの関係

- デザインシステムを使うとき(B / C)、取り込んだ部品は `src/shared/ui/ds/` に置き、取り込んだときの名前のまま使う(shadcn の部品は kebab-case のファイル)。この文書の名前の規則は、自分で書く部品にだけ適用する。
- 取り込んだ部品の見た目や振る舞いを変えたいときは、`src/shared/ui/` に PascalCase のディレクトリで包む部品を作る。
- D のとき、部品は `src/components/ui/<Name>/` に置き、この文書の名前の規則(PascalCase、`index.tsx`)に従う。部品は自分たちのコードなので、直接直してよい。直したら `ds-check` を通す。題材に依る部品(このプロダクトでしか意味を持たないもの)は `src/components/ui/` に置かず、`src/shared/ui/` か feature の `ui/` に置く。

## 確認すること

- [ ] `ui/` の下のコンポーネントのディレクトリが PascalCase で、本体が `index.tsx`、名前付き export になっている
- [ ] テスト、ストーリー、フックが本体と同じディレクトリにあり、名前が `index.test.tsx`、`index.stories.tsx`、`useXxx.ts` になっている
- [ ] 子のコンポーネントが親のディレクトリの中にあり、親とその子孫からだけ使われている
- [ ] feature の `ui/` が command、query、service、テーブル定義、ルーターを直接 import していない
- [ ] 3 階層以上さかのぼる相対パスの import がない
