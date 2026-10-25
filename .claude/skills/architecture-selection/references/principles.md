# AI 駆動開発のための構造

この文書は、コードベースの構造をどう決めるかを並べる。エージェントはコンテキストウィンドウに入る範囲しか一度に読めず、人間のレビュー担当者も一度に追える範囲が限られる。変更に関係するファイルの数と大きさを小さく保ち、その場所を名前から推測できるようにすれば、どちらも一度に扱える範囲に収まる。各ルールに、その理由を一行で添える。

段階(小規模 / 中規模以上)は [構造の段階の選び方](./scale-selection.md) で決める。採った段階の節と、共通の節を読む。どちらの段階もコードを機能(feature)で分け、モジュール(`modules/`)や技術の層(`domain/`、`application/`、`infrastructure/`)では分けない。

## 小規模(Vertical Slice + CQS)

Vertical Slice + CQS を採用する。domain 層と infrastructure 層は作らず、Command と Query から ORM を直接使う。ボイラープレートを最小限に抑え、エージェントが一度に読める範囲で必要な変更を完結させる。

### ディレクトリ構成

**必須**

- 機能ごとのディレクトリ(垂直スライス)で分ける。技術の層(`components/`、`services/`、`repositories/`)をリポジトリの最上位に置かない。
  - 理由: 一つの機能の変更が一つのディレクトリに収まり、エージェントが読む範囲とレビューの範囲が一致する。
- 次の構成を既定とする。

```
src/
  app/                    # ルーティング、画面、API の入口
  features/
    <feature>/
      index.ts            # 公開 API。service と query だけを外に出す
      README.md
      commands/           # place-order.command.ts
      queries/            # get-order.query.ts
      services/           # 名詞単位の共通処理と業務ルール(stock.service.ts、pricing.service.ts)
      ui/                 # この feature の画面と部品(component-structure.md)
  shared/                 # DB 接続、認証、エラー処理など技術的な共通処理
    db/
      client.ts
      schema/             # テーブル定義
    auth/
    lib/                  # 純粋な共通の関数
    ui/                   # 画面を持つとき: 共通の部品。ds/ にデザインシステムの部品
    layouts/              # 画面を持つとき: 全画面に共通する枠
  generated/              # 生成コード。手で編集しない
db/migrations/
```

- テストは対象と同じディレクトリに `*.test.ts` として置く。
  - 理由: 実装とテストを一度に開ける。

### 呼び出しの向き

**必須**

- 呼び出しは `app/` → `features/` の command / query → `services/` の順にする。
- 1 操作を 1 ユースケースとして、リクエスト単位で command か query を作る。複数の feature を束ねる層(Application Service や UseCase 層)は作らない。
- Command と Query から直接 ORM を使ってよい。インフラ層やドメイン層は作らない。
  - 理由: 層を重ねるコストが変更の局所性を上回る。
- `app/` のルートは薄く保つ。パラメータの取り出し、認証、入力の受け取り、レスポンスの整形だけを行う。

### Service の切り出し

**必須**

- Service は名詞(集合やルール)単位で切り出す。例: `stock.service.ts`、`pricing.service.ts`。
- ルールや計算は、2 回目に現れたときに service に抽出する。
  - 理由: 早すぎる抽象を避け、実際に共通化が必要になってから切り出す。

### Feature 間の呼び出し

**必須**

- 他の feature から呼べるのは、`service` と `query` だけとする。`command` は `app/` からだけ呼ぶ。
  - 理由: command の副作用が連鎖して追いにくくなるのを防ぐ。
- Feature 間の参照は一方向にする。循環参照を作らない。

### Query の JOIN と集計

**必須**

- Query 内での JOIN や集計(例: `listPosts` に `commentCount` を含める)は許可する。
- N+1 問題を避ける。必要なデータは一度の query でまとめて取得する。

## 中規模以上(features を画面・サーバー・共有に分ける)

小規模と同じく層を作らず ORM を直接使い、コードを feature で分ける。そのうえで、複数人が並行して変更しても影響が feature に収まるよう、feature を**画面**(`src/components/features/`)、**サーバー**(`src/server/features/`)、**両方で使う純粋なコード**(`src/shared/features/`)の 3 か所に同じ名前で置き、**テーブルの所有** と **feature ごとの AGENTS.md** を加える。実例は [tkc310/yorozuya](https://github.com/tkc310/yorozuya) にある。

### ディレクトリ構成

**必須**

```
src/
  app/                    # ルーティング、画面、API の入口
  components/             # 画面のコード。サーバーの処理を import しない
    features/
      <feature>/          # この feature の画面と部品(component-structure.md)
        <Screen>/         # PascalCase のコンポーネントのディレクトリ(index.tsx)
    ui/                   # デザインシステムの D を選んだとき: 組み込んだ部品
  server/                 # サーバーだけで動くコード。components/ を import しない
    features/
      <feature>/
        index.ts          # 公開 API。service と query、入出力の型だけを外に出す
        README.md
        AGENTS.md         # エージェント向けの指示(用語集、禁止事項、参照実装)
        commands/         # place-order.command.ts
        queries/          # get-order.query.ts
        services/         # 名詞単位の共通処理(stock.service.ts)
        tables.ts         # この feature が所有するテーブル定義
    db/                   # DB 接続
    auth/                 # 認証・認可
  shared/                 # 画面とサーバーの両方で使う純粋なコード。app/、components/features/、server/ を import しない
    features/
      <feature>/          # この feature の型、Zod のスキーマ、業務ルールの純粋関数(order.ts、order.test.ts)
    lib/                  # feature に依らない純粋な共通の関数
    ui/                   # 画面を持つとき: 共通の部品。ds/ にデザインシステムの部品
    layouts/              # 画面を持つとき: 全画面に共通する枠
  generated/              # 生成コード。手で編集しない
db/migrations/
```

- 1 つの機能は、3 か所で同じ feature 名(kebab-case)にする。画面だけ、サーバーだけの feature では、使わない場所のディレクトリを作らない。
  - 理由: feature 名で検索すれば、その機能の画面、サーバーの処理、ルールがすべて見つかる。
- 呼び出しの向き、Service の切り出し、feature 間の呼び出しは、小規模の `src/features/<feature>/` を `src/server/features/<feature>/` と読み替えて同じルールに従う。

### 画面とサーバーの分け方

**必須**

- `src/components/features/<feature>/` は、command、query、service、テーブル定義、`src/server/` を import しない。表示するデータは `app/` のルートが query で取得して props で渡し、変更の操作は `app/` が用意した関数(サーバーアクションやハンドラー)を props で受け取る([コンポーネントの構造](./component-structure.md))。
  - 理由: クライアントに届くコードにサーバーの処理や秘密情報が混ざらないことを、依存ルールで保証できる。
- 画面とサーバーの両方で使う型、入力の Zod のスキーマ、表示や検証に使う計算は、`src/shared/features/<feature>/` に置く。
- `src/shared/features/<feature>/` は純粋なコードだけにする。DB、ネットワーク、ファイル、現在時刻、乱数に触れず、I/O を行うライブラリと Node.js の組み込みモジュールを import しない。import してよいのは、同じ feature の `src/shared/features/<feature>/` と `src/shared/lib/` だけとする。
  - 理由: モックなしでテストでき、画面からもサーバーからも同じルールを使える。

### 業務ルールの置き場所

**必須**

- 状態遷移、不変条件、金額などの計算は、`src/shared/features/<feature>/` の純粋関数にまとめる。command は、その関数で判断してから書き込む。
  - 理由: 不変条件が 1 か所にまとまり、DB を使わずに網羅的に検証できる。domain 層やポートを作らなくても、ルールを I/O から切り離せる。
- 同じ業務ルールを command、query、画面に書き写さない。2 回目に現れたら `src/shared/features/<feature>/` に移す。

**推奨**

- 不変条件(合計金額が負にならない、など)は、fast-check によるプロパティベーステストで検証する。

### テーブルの所有

**必須**

- 各 feature は、自分の `tables.ts` のテーブルだけを読み書きする。他の feature のテーブルへの JOIN と外部キーを作らない。テーブル名には feature の接頭辞を付けるか、feature ごとにスキーマを分ける。
- 他の feature のデータは、その feature の `index.ts` が公開する query で読む。
  - 理由: `tables.ts` を他の feature から import できないので、JOIN の禁止を依存ルールで強制できる。feature を後で切り出すときの障害(共有テーブル、共有トランザクション)も生まれない。
- マイグレーションツールには、各 feature の `tables.ts` をまとめて渡す(例: drizzle-kit の `schema` に `./src/server/features/*/tables.ts` を指定)。集約用のファイルは作らない。

### feature ごとの AGENTS.md

**必須**

- 各 feature に短い `AGENTS.md` を `src/server/features/<feature>/AGENTS.md` に置く(雛形は `templates/feature-AGENTS.md`)。画面と共有のコードの置き場所、禁止事項、用語集、参照実装を簡潔に示す。README と重複する内容は書かず、エージェント固有の指示に絞る。
  - 理由: 多人数で開発するとき、feature ごとの文脈とルールをエージェントに伝える手段が必要になる。

## ワークスペースを使わない(共通)

**必須**

- 段階によらず、モノレポのワークスペースを使わない。`pnpm-workspace.yaml` に `packages` を書かず、`apps/` と `packages/` に分けず、`package.json` をリポジトリ直下の 1 つだけにする。依存の `workspace:` と `catalog:` も使わない。
  - 理由: パッケージごとの設定、ビルドの順番、パッケージをまたぐ import の解決が増えるだけで、1 つのプロダクトでは得るものがない。境界はパッケージではなく、ディレクトリと依存ルールで守る。
- `pnpm-workspace.yaml` は、pnpm の設定(依存の供給網の対策)を書くためだけに置く([セキュリティ](./security.md#依存の供給網))。
- 生成コード、Worker、WebAssembly、デザインシステムの部品も、別のパッケージにせず、このリポジトリの `src/` の下に置く。Go のサービスを切り出すとき([性能対策の段階](./performance-ladder.md#5-go該当する-feature-だけ切り出す))も、npm のワークスペースにはしない。

## 依存の向きと公開 API(共通)

### 依存の向き

**必須**

- 次の向きの import だけを許す。違反は [品質ゲート](./quality-gates.md) の依存ルールで CI に検出させる。設定は `templates/harness/dependency-cruiser/` にある。

**小規模の依存ルール**

| import する側 | import してよい先 |
| --- | --- |
| `app/` | 各 feature の `index.ts`、`commands/`、`ui/`、`shared/` |
| `features/A/` の外から(`app/` を除く) | `features/A/index.ts` だけ |
| `commands/`、`queries/` | 同じ feature の `services/`、他 feature の `index.ts`(service と query だけ)、`shared/` |
| `services/` | 同じ feature の `services/`、他 feature の `index.ts`(service と query だけ)、`shared/` |
| `ui/` | 同じ feature の `ui/` と `index.ts`、`shared/ui/`、`shared/lib/` |
| `shared/ui/` | `shared/ui/`、`shared/lib/` |
| `shared/` | `shared/` |

**中規模以上の依存ルール**

| import する側 | import してよい先 |
| --- | --- |
| `app/` | `server/features/<feature>/` の `index.ts` と `commands/`、`components/`、`shared/`、`server/auth/` |
| `server/features/A/` の外から(`app/` を除く) | `server/features/A/index.ts` だけ |
| `server/features/A/` の `commands/`、`queries/` | 同じ feature の `services/` と `tables.ts`、`shared/features/A/`、他 feature の `index.ts`(service と query だけ)、`server/db/`、`server/auth/`、`shared/lib/` |
| `server/features/A/services/` | 同じ feature の `services/` と `tables.ts`、`shared/features/A/`、他 feature の `index.ts`(service と query だけ)、`server/db/`、`shared/lib/` |
| `components/features/A/` | 同じ feature の `components/features/A/`、`shared/features/A/`、`shared/ui/`、`shared/lib/`(D のときは `components/ui/`)。`server/` と他の feature は不可 |
| `shared/features/A/` | `shared/features/A/`、`shared/lib/` |
| `shared/ui/` | `shared/ui/`、`shared/lib/` |
| `shared/` | `shared/`(`shared/features/` は同じ feature だけ) |
| `server/db/`、`server/auth/` | `server/db/`、`server/auth/`、`shared/lib/` |

- 循環依存を作らない。
  - 理由: 依存が一方向なら、変更の影響範囲を import の向きから判断できる。

### 公開 API

**必須**

- feature が外に出すものは `index.ts`(小規模は `src/features/<feature>/index.ts`、中規模以上は `src/server/features/<feature>/index.ts`)に列挙する。
  - `service` と `query`、入出力の型だけを公開する。`command` は公開せず、`app/` が `commands/` のファイルを直接 import する。
    - 理由: `index.ts` に command を載せると他の feature からも呼べてしまい、「command は `app/` からだけ呼ぶ」を依存ルールで強制できない。
  - テーブル定義や ORM のエンティティは出さない。
  - 理由: エージェントは `index.ts` だけを読めば、その feature の使い方が分かる。
- `index.ts` 以外に再エクスポート用のファイル(barrel)を作らない。中規模以上の `src/components/features/<feature>/` と `src/shared/features/<feature>/` にも `index.ts` を置かず、使う側はファイルを直接 import する。
  - 理由: 入口が一つなら、利用箇所を検索で漏れなく見つけられる。
- 公開 API の入出力は、Zod のスキーマを持つプレーンなデータにする。クラスのインスタンス、関数、ORM のエンティティを渡さない。中規模以上では、そのスキーマを `src/shared/features/<feature>/` に置き、画面とサーバーで同じものを使う。

## ファイルと関数の大きさ(共通)

**必須**

- ファイルの行数と関数の行数に上限を設け、リンターの `max-lines` と `max-lines-per-function` で検査する。上限は目安としてファイル 300 行、関数 50 行とし、`generated/` とテストのフィクスチャは対象から外す。
  - 理由: 上限があると、エージェントはファイル全体を一度に読んで編集でき、レビューの差分も追える大きさに収まる。
- 上限を超えたら、行を詰めるのではなく、責務ごとにファイルや関数を分ける。

## 命名(共通)

**必須**

- ファイル名とディレクトリ名は kebab-case にする。役割は接尾辞で示す(`*.command.ts`、`*.query.ts`、`*.service.ts`、`*.test.ts`)。
  - 例外: コンポーネントのディレクトリは PascalCase、本体は `index.tsx`、カスタムフックは `useXxx.ts` にする([コンポーネントの構造](./component-structure.md))。
- feature 名は、利用者の業務の言葉にする(`billing`、`order`)。`utils`、`common`、`helpers` のような中身を示さない名前を `shared/` の外で使わない。
  - 理由: 名前から場所を推測できれば、エージェントがコードベース全体を検索しなくて済む。

## 間接化(共通)

**必須**

- インフラ層を作らず command / query から直接 ORM を使うため、ports、リポジトリ層、DI コンテナは作らない。一つのリクエストが通る経路は `app/` → command / query → service(中規模以上は加えて `src/shared/features/` の純粋関数)に固定する。
- 実装が一つしかない内部の処理に、インターフェースや抽象クラスを作らない。
  - 理由: 呼び出しを追うたびに実装を探す手間が増え、エージェントが読むファイルも増える。

**推奨**

- service と純粋関数の切り出しは、2 回目に現れたときに行う。

## feature ごとの README(共通)

**必須**

- 各 feature に `README.md` を置く(小規模は `src/features/<feature>/`、中規模以上は `src/server/features/<feature>/`)。責務(一文)、公開する API、依存する feature、所有するテーブルを書く。中規模以上では、画面と共有のコードの置き場所も書く。
  - 理由: エージェントと人間の両方が、コードを読む前に feature の範囲を確認できる。
