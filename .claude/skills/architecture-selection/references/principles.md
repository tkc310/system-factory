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

## 中規模以上(features を画面・API・共用に分ける)

小規模と同じく技術の層(`domain/`、`application/`、`infrastructure/`)を作らず、コードを feature で分ける。そのうえで、複数人が並行して変更しても影響が feature に収まるよう、feature を**画面**(`src/components/features/`)、**API**(`src/api/features/`)、**画面とサーバーで共用するコード**(`src/shared/features/`)の 3 か所に同じ名前で置き、**ドメインモデル(`entity.ts`)**、**リポジトリ(`repository.ts`)**、**テーブルの所有**、**feature ごとの AGENTS.md** を、すべて所属する feature の中に置く。実例は [tkc310/yorozuya](https://github.com/tkc310/yorozuya) にある(yorozuya では `src/api/` を `src/server/` と呼ぶ)。

### ディレクトリ構成

**必須**

```
src/
  app/                    # ルーティング、画面、API の入口
  components/             # 画面のコード。src/api/ を import しない
    features/
      <feature>/          # この feature の画面と部品(component-structure.md)
        <Screen>/         # PascalCase のコンポーネントのディレクトリ(index.tsx)
    ui/                   # デザインシステムの D を選んだとき: 組み込んだ部品
  api/                    # サーバーだけで動くコード。components/ を import しない
    features/
      <feature>/
        index.ts          # 公開 API。service と query、入出力の型だけを外に出す
        README.md
        AGENTS.md         # エージェント向けの指示(用語集、禁止事項、参照実装)
        entity.ts         # ドメインモデル。型と、不変条件・状態遷移・計算の純粋関数
        repository.ts     # この feature のテーブルの読み書き。ORM を使うのはここと tables.ts だけ
        tables.ts         # この feature が所有するテーブル定義
        commands/         # place-order.command.ts
        queries/          # get-order.query.ts
        services/         # 名詞単位の共通処理(stock.service.ts)
    db/                   # DB 接続
    auth/                 # 認証・認可
  shared/                 # 画面とサーバーで共用するコード。app/、components/features/、api/ を import しない
    features/
      <feature>/          # この feature の入力のバリデーション(Zod のスキーマ)、画面と API でやり取りするオブジェクトの型、定数
    lib/                  # feature に依らない純粋な共通の関数
    ui/                   # 画面を持つとき: 共通の部品。ds/ にデザインシステムの部品
    layouts/              # 画面を持つとき: 全画面に共通する枠
  generated/              # 生成コード。手で編集しない
db/migrations/
```

- 1 つの機能は、3 か所で同じ feature 名(kebab-case)にする。画面だけ、API だけの feature では、使わない場所のディレクトリを作らない。
  - 理由: feature 名で検索すれば、その機能の画面、API、共用のコードがすべて見つかる。
- `entity.ts` と `repository.ts` が上限の行数([ファイルと関数の大きさ](#ファイルと関数の大きさ共通))を超えたら、同じ feature の中で `entities/<name>.entity.ts`、`repositories/<name>.repository.ts` に分ける。feature の外には出さない。
- 呼び出しの向き、Service の切り出し、feature 間の呼び出しは、小規模の `src/features/<feature>/` を `src/api/features/<feature>/` と読み替えて同じルールに従う。

### 画面と API の分け方

**必須**

- `src/components/features/<feature>/` は、`src/api/` を import しない。表示するデータは `app/` のルートが query で取得して props で渡し、変更の操作は `app/` が用意した関数(サーバーアクションやハンドラー)を props で受け取る([コンポーネントの構造](./component-structure.md))。
  - 理由: クライアントに届くコードにサーバーの処理や秘密情報が混ざらないことを、依存ルールで保証できる。

### 共用のコード(src/shared/)

**必須**

- `src/shared/` には、画面とサーバーの**両方で使う**関数と値だけを置く。例: 入力のバリデーション(Zod のスキーマ)、画面と API でやり取りするオブジェクト(入出力の型)、定数(上限値、選択肢の一覧)。
- ドメインモデル(エンティティ、不変条件、状態遷移)を `src/shared/` に置かない。ドメインモデルは `src/api/features/<feature>/entity.ts` に置く。
  - 理由: 多くの場合、ドメインモデルは画面とサーバーで共通にならない。画面が要るのは表示と入力の形で、ドメインのルールではない。共用にすると、サーバーの都合の変更が画面に波及する。
- 片方でしか使わないものは、使う側(`src/components/features/<feature>/` か `src/api/features/<feature>/`)に置く。2 か所目で使うことになってから `src/shared/` に移す。
- `src/shared/features/<feature>/` は純粋なコードだけにする。DB、ネットワーク、ファイル、現在時刻、乱数に触れず、I/O を行うライブラリと Node.js の組み込みモジュールを import しない。import してよいのは、同じ feature の `src/shared/features/<feature>/` と `src/shared/lib/` だけとする。

### ドメインモデル(entity.ts)

**必須**

- feature のドメインモデルは `src/api/features/<feature>/entity.ts` に定義する。エンティティの型と、不変条件、状態遷移、金額などの計算を純粋関数で書く。
  - 理由: 不変条件が feature の中の 1 か所にまとまり、DB を使わずに網羅的に検証できる。
- `entity.ts` は純粋なコードだけにする。import してよいのは、同じ feature の `src/shared/features/<feature>/`(バリデーションや定数)と `src/shared/lib/` だけとし、`repository.ts`、`tables.ts`、ORM、I/O を行うライブラリを import しない。
- command は、`repository.ts` で読む → `entity.ts` の関数で判断する → `repository.ts` で書く、の順に書く。同じ業務ルールを command、query、service に書き写さない。
- `entity.ts` の型を `index.ts` から公開しない。他の feature と画面には、`index.ts` の query が返すプレーンなデータを渡す。

**推奨**

- 不変条件(合計金額が負にならない、など)は、fast-check によるプロパティベーステストで検証する。

### リポジトリ(repository.ts)

**必須**

- feature のテーブルの読み書きは、その feature の `src/api/features/<feature>/repository.ts` にまとめる。リポジトリを feature の外(`src/api/features/repository.ts` や `src/api/repositories/`)に置かない。
  - 理由: 書き込みの経路が feature ごとに 1 つに決まり、テーブルの所有を依存ルールで強制できる。
- feature の中で ORM と `src/api/db/` を import してよいのは、`repository.ts` と `tables.ts` だけとする。command、query、service は `repository.ts` の関数を呼ぶ。
- リポジトリは具体的な関数の集まりにする。インターフェース、抽象クラス、DI コンテナは作らない([間接化](#間接化共通))。
- 書き込みの関数は `entity.ts` の型を受け取り、読み取りの関数は `entity.ts` の型か、query が返す形のプレーンなデータを返す。ORM の行の型を外に出さない。
- 一つの command のトランザクションは、`repository.ts` が用意する関数(`withTransaction` など)で張る。

### テーブルの所有

**必須**

- 各 feature は、自分の `tables.ts` のテーブルだけを、自分の `repository.ts` から読み書きする。他の feature のテーブルへの JOIN と外部キーを作らない。テーブル名には feature の接頭辞を付けるか、feature ごとにスキーマを分ける。
- 他の feature のデータは、その feature の `index.ts` が公開する query で読む。
  - 理由: `tables.ts` と `repository.ts` を他の feature から import できないので、JOIN の禁止を依存ルールで強制できる。feature を後で切り出すときの障害(共有テーブル、共有トランザクション)も生まれない。
- マイグレーションツールには、各 feature の `tables.ts` をまとめて渡す(例: drizzle-kit の `schema` に `./src/api/features/*/tables.ts` を指定)。集約用のファイルは作らない。

### feature ごとの AGENTS.md

**必須**

- 各 feature に短い `AGENTS.md` を `src/api/features/<feature>/AGENTS.md` に置く(雛形は `templates/feature-AGENTS.md`)。画面と共用のコードの置き場所、禁止事項、用語集、参照実装を簡潔に示す。README と重複する内容は書かず、エージェント固有の指示に絞る。
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
| `app/` | `api/features/<feature>/` の `index.ts` と `commands/`、`components/`、`shared/`、`api/auth/` |
| `api/features/A/` の外から(`app/` を除く) | `api/features/A/index.ts` だけ |
| `api/features/A/` の `commands/`、`queries/`、`services/` | 同じ feature の `services/`、`entity.ts`、`repository.ts`、`shared/features/A/`、他 feature の `index.ts`(service と query だけ)、`api/auth/`、`shared/lib/`。ORM、`tables.ts`、`api/db/` は不可 |
| `api/features/A/repository.ts` | 同じ feature の `entity.ts` と `tables.ts`、ORM、`api/db/`、`shared/features/A/`、`shared/lib/` |
| `api/features/A/entity.ts` | `shared/features/A/`、`shared/lib/`(I/O を行うライブラリは不可) |
| `components/features/A/` | 同じ feature の `components/features/A/`、`shared/features/A/`、`shared/ui/`、`shared/lib/`(D のときは `components/ui/`)。`api/` と他の feature は不可 |
| `shared/features/A/` | `shared/features/A/`、`shared/lib/` |
| `shared/ui/` | `shared/ui/`、`shared/lib/` |
| `shared/` | `shared/`(`shared/features/` は同じ feature だけ) |
| `api/db/`、`api/auth/` | `api/db/`、`api/auth/`、`shared/lib/` |

- 循環依存を作らない。
  - 理由: 依存が一方向なら、変更の影響範囲を import の向きから判断できる。

### 公開 API

**必須**

- feature が外に出すものは `index.ts`(小規模は `src/features/<feature>/index.ts`、中規模以上は `src/api/features/<feature>/index.ts`)に列挙する。
  - `service` と `query`、入出力の型だけを公開する。`command` は公開せず、`app/` が `commands/` のファイルを直接 import する。
    - 理由: `index.ts` に command を載せると他の feature からも呼べてしまい、「command は `app/` からだけ呼ぶ」を依存ルールで強制できない。
  - テーブル定義、ORM のエンティティ、中規模以上の `entity.ts` の型と `repository.ts` は出さない。
  - 理由: エージェントは `index.ts` だけを読めば、その feature の使い方が分かる。
- `index.ts` 以外に再エクスポート用のファイル(barrel)を作らない。中規模以上の `src/components/features/<feature>/` と `src/shared/features/<feature>/` にも `index.ts` を置かず、使う側はファイルを直接 import する。
  - 理由: 入口が一つなら、利用箇所を検索で漏れなく見つけられる。
- 公開 API の入出力は、Zod のスキーマを持つプレーンなデータにする。クラスのインスタンス、関数、ORM のエンティティを渡さない。中規模以上では、画面も使う入力のスキーマを `src/shared/features/<feature>/` に置き、画面とサーバーで同じものを使う。

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

- ports、インターフェース、抽象クラス、DI コンテナは作らない。実装が一つしかない処理に間接化を足さない。
- 小規模では、リポジトリを作らず command / query から直接 ORM を使う。一つのリクエストが通る経路は `app/` → command / query → service に固定する。
- 中規模以上では、ORM を使う場所を feature の中の `repository.ts` に限る。一つのリクエストが通る経路は `app/` → command / query → service → `entity.ts` と `repository.ts` に固定する。
  - 理由: 呼び出しを追うたびに実装を探す手間が増え、エージェントが読むファイルも増える。中規模以上でリポジトリを置くのは抽象化のためではなく、テーブルの所有と書き込みの経路を feature ごとに 1 つにするためである。

**推奨**

- service と純粋関数の切り出しは、2 回目に現れたときに行う。

## feature ごとの README(共通)

**必須**

- 各 feature に `README.md` を置く(小規模は `src/features/<feature>/`、中規模以上は `src/api/features/<feature>/`)。責務(一文)、公開する API、依存する feature、所有するテーブルを書く。中規模以上では、画面と共用のコードの置き場所も書く。
  - 理由: エージェントと人間の両方が、コードを読む前に feature の範囲を確認できる。
