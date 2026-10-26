# コーディング規約

この文書は、コード、テスト、コミットログ、コードコメントの書き方の規約を定める。AI エージェントと人間の両方が、コードを書くとき、レビューするとき、コミットメッセージを書くときに参照する。

## t_wada のコメント法則

和田卓人氏(@t_wada)が提唱した法則。コード、テスト、コミットログ、コードコメントには、それぞれ異なる役割がある。

### 役割分担

**必須**

- **コードには How(どう実現するか)を書く**
  - コードそのものが実装方法を表現する
  - コードを読めば分かることをコメントに書かない

- **テストコードには What(何をするべきか)を書く**
  - テスト名と中身が仕様を表す
  - `it('テスト1')` のような無意味な名前を避ける
  - テスト名で、何をテストしているかが分かるようにする

- **コミットログには Why(なぜこの変更をしたのか)を書く**
  - 変更の理由、背景、意図を書く
  - 何を変えたかは diff を見れば分かる。なぜ変えたのかを書く
  - 問題の症状と、それを解決する理由を含める

- **コードコメントには Why not(なぜ別のやり方を選ばなかったのか)を書く**
  - 却下した代替案を書く
  - ハマりどころ(試して失敗したアプローチ)を書く
  - 制約、トレードオフ、回避策を書く
  - 直感に反する実装には、その理由を書く

### 良い例と悪い例

#### コード(How)

**良い例**:
```typescript
function calculateTotalPrice(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

**悪い例**:
```typescript
// 合計金額を計算する関数
// 各アイテムの価格と数量を掛けて、全て足し合わせる
function calculateTotalPrice(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

理由: コードを読めば分かることをコメントに書いている。

#### テストコード(What)

**良い例**:
```typescript
describe('calculateTotalPrice', () => {
  it('複数のアイテムがある場合、各アイテムの小計を合計する', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 200, quantity: 1 },
    ];
    expect(calculateTotalPrice(items)).toBe(400);
  });

  it('空の配列の場合、0を返す', () => {
    expect(calculateTotalPrice([])).toBe(0);
  });
});
```

**悪い例**:
```typescript
describe('calculateTotalPrice', () => {
  it('テスト1', () => {
    // ...
  });
});
```

理由: テスト名が仕様を表していない。

#### コミットログ(Why)

**良い例**:
```
fix: 消費税計算で端数処理が不正確だった問題を修正

各アイテムごとに消費税を計算すると、最終的な合計が
レジシステムの計算結果と1円ずれるケースがあった。
小計に対して一度だけ消費税を計算する方式に変更。
```

**悪い例**:
```
fix: 消費税計算を修正
```

理由: なぜ修正したのか、何が問題だったのかが分からない。

#### コードコメント(Why not)

**良い例**:
```typescript
function processLargeFile(path: string): void {
  // ファイル全体をメモリに読み込まない。
  // 10GB超のファイルでもOOMしないようストリーム処理にしている。
  const stream = fs.createReadStream(path);
  // ...
}
```

```typescript
// NOTE: setInterval ではなく、完了後に setTimeout で次を予約する。
// 確認が 1 秒を超えたときに、実行が重ならないようにするため。
async function scheduleHealthCheck(): Promise<void> {
  await checkHealthStatus();
  setTimeout(scheduleHealthCheck, 1000);
}
```

```typescript
// HACK: ライブラリの型定義の誤りを回避するため、型アサーションを使う。
// https://github.com/example/library/issues/123 が修正されたら削除する。
// oxlint-disable-next-line typescript/consistent-type-assertions -- library#123 の回避
const result = (apiResponse as unknown as { data: Result }).data;
```

**悪い例**:
```typescript
// ストリームを作成
const stream = fs.createReadStream(path);
```

理由: コードを読めば分かることを書いている。なぜストリームにしたのかが書かれていない。

#### コードを読めば分かることを書かない

**悪い例**:
```typescript
// ユーザーIDを取得
const userId = user.id;

// ユーザー名が空かチェック
if (user.name === '') {
  // エラーを投げる
  throw new Error('Name is required');
}
```

**良い例**:
```typescript
const userId = user.id;

if (user.name === '') {
  throw new Error('Name is required');
}
```

理由: コードがそのまま読めるなら、コメントは要らない。

### コメントを書く前の判断基準

**必須**

コメントを書く前に自問する:

1. **コード**: この情報は、コードを読めば分かるか？
   - Yes → コメント不要
   - No → コメントを書く(ただし、まずコードを分かりやすくできないか検討)

2. **テスト**: このテストは、何をテストしているか名前から分かるか？
   - No → テスト名を改善する

3. **コミット**: この変更の理由は、diff を見れば分かるか？
   - No → コミットメッセージに理由を書く

4. **コメント**: なぜこの実装を選んだのか、別の方法を試してハマったのか？
   - Yes → コメントに書く

### レビュー時のチェックリスト

**推奨**

コードレビュー時に確認する: 

- [ ] コメントがコードの内容をなぞっているだけになっていないか
- [ ] テスト名が仕様を表しているか(「テスト1」のような無意味な名前になっていないか)
- [ ] コミットメッセージに変更の理由が書かれているか
- [ ] 直感に反する実装、回避策、制約にコメントが付いているか
- [ ] 古くなったコメント、間違ったコメントが残っていないか

## コマンドは make で叩く

**必須**

- プロジェクトの作業のコマンド(依存の追加と削除、開発サーバー、ビルド、生成、検査、テスト、版と供給網の確認、部品の取り込み)は、リポジトリ直下の `Makefile` にターゲットを作り、`make <ターゲット>` で叩く。人もエージェントも CI も、`pnpm`、`npx`、`npm`、`yarn` や各ツール(`vitest`、`oxlint`、`tsc` など)を直接叩かない。
  - 理由: 入口が一つになると、AGENTS.md・CI・フック・権限の規則が同じ名前を指せる。ツールを入れ替えても(pnpm から別のもの、TypeScript から Go)、叩くコマンドが変わらない。直接叩くと、`.npmrc` の取得元や検査の前処理(`make check-supply-chain`)を飛ばせる。
- 新しいコマンドが要るときは、`Makefile` にターゲットを足し(`## 説明` を付けると `make help` に出る)、AGENTS.md のコマンドの表も更新する。`Makefile` は保護パスなので、エージェントは足す前に確認する。
- 値を渡すターゲットは、値を環境変数として受け取り、形を確かめてから使う(雛形の `add`、`ui-add` の書き方)。make の変数(`$(pkg)`)をそのままコマンドに展開しない。
  - 理由: `$(pkg)` は make が文字列として展開するので、`pkg='x; rm -rf ~'` のような値がシェルのコードとして動く。
- 例外: `Makefile` のレシピ、`package.json` の scripts、`lefthook.yml`、`scripts/` の中(ターゲットから呼ばれる実装)では、ツールを直接呼んでよい。Git と GitHub CLI(`git`、`gh`)、ファイルを読むコマンド(`ls`、`cat`、`grep` など)も対象外。

## その他の規約

**必須**

- 命名は kebab-case(ファイル名、ディレクトリ名)、camelCase(変数名、関数名)、PascalCase(型名、クラス名、コンポーネント名)を使い分ける。詳細は [構造](./principles.md) の命名を参照。
- 検証のスキーマを置くファイルは `<名前>.schema.ts` にする(`-schema.ts` にしない)。詳細は [構造](./principles.md) の命名を参照。
- 行数の上限は、[構造](./principles.md) のファイルと関数の大きさを参照。

