# テスト戦略

この文書は、テストの粒度、ツール、実行の方針を定める。カバレッジの閾値は [品質ゲート](./quality-gates.md#テスト) にある。

## テストの粒度とツール

| 粒度 | ツール | 対象 | CI |
| --- | --- | --- | --- |
| ユニット | Vitest | 業務ロジック(command / query / service、中規模以上の `entity.ts` と `src/shared/features/`)、純粋関数、バリデーション | 含める |
| 統合(コンポーネント) | Vitest + React Testing Library + happy-dom | 複数のコンポーネントの協調、ユーザーの操作を含む振る舞い、状態管理 | 含める |
| 統合(API) | Vitest + Testcontainers(推奨) | データベースを含む API の動作。外部サービスは MSW でモックする | 含める |
| E2E | Playwright | ユーザー登録からログイン、主要機能の利用までのような、業務上重要なフロー | 含めない |
| VRT | Vitest + Storybook | コンポーネントのストーリーと、ページの見た目の回帰 | 含めない |

**必須**

- 業務ロジックはユニットテストで網羅する。UI のユニットテストは最小限にし、UI は統合テストで確かめる(Testing Trophy の考え方)。
- 統合テストを最も多く書く。ユーザーが見て操作するもの(テキスト、ロール、操作)に基づいて書き、実装の詳細に依存しない。
- 統合テストは happy-dom を基本にする。次の場合だけ Vitest Browser Mode を使う。
  - 実ブラウザの挙動(レイアウト、フォーカス、CSS)を正確に確かめる必要がある
  - happy-dom が実装していない DOM API に依存する
- E2E は 2〜5 個の重要なフローに絞る。それ以外の UI の確かめは、統合テストか Storybook で行う。
- E2E と VRT は CI に含めず、手元で必要なときに実行する(`make test-e2e`。VRT を採るときは `make test-vrt` を Makefile に足す)。
  - 理由: 実行のコストが高く、環境に依存する要素が多いため、マージを止める検査に向かない。

**推奨**

- E2E のテストの作成と修復に、Playwright Test Agents(planner / generator / healer)を使ってよい。

## AI 駆動開発での注意

**必須**

- エージェントにコードを書かせる前に、期待する振る舞いをテスト(またはテストの要件)で先に与える。
- エージェントが書いたテストに、次の不安定さがないか確かめる。
  - 固定の待機(`await page.waitForTimeout(1000)` など)
  - 不安定なセレクター(CSS のクラス、動的な ID)
  - テスト間で共有する状態(DB やセッション。並列実行で衝突する)
  - 非同期の処理の完了を待たないアサーション
- 待機は条件で行う。Playwright では web-first のアサーション(`await expect(locator).toBeVisible()`)と `expect.poll`、Testing Library では `waitFor` を使う。
- モックは外部 API(MSW)に限る。統合テストでは、できる限り実際の DB か、コンテナで動かすサービスを使う。
  - 理由: エージェントはモックを使いすぎる傾向がある。実装とモックがずれると、テストは通るのに本番で壊れる。

**推奨**

- 新しいテストは、並列実行に入れる前に同じ環境で 10 回繰り返し、不安定さがないか確かめる。E2E を手で実行するときも、決定的で再現できるものだけを残す。

## 決定性

**必須**

- 各テストは、独立したデータ(ユーザー、商品、注文など)を持つ。テストの最初に DB にデータを入れ、最後に片付ける。または、テストごとに新しいコンテナを起動する。
- セレクターは `data-testid`、ARIA のロール、安定したテキストのラベルを使う。CSS のクラスや動的な ID に依存しない。

## 判断根拠: 統合テストの実行環境

2026-10-08 の測定による参考値(Node.js 22.14、Vitest 5.0.3、Linux)。統合テスト 11 件(フォームとリストのコンポーネント)を 4 つの構成で 5 回ずつ実行し、ウォームアップを除いた中央値を比べた。

| 構成 | Vitest の所要時間 | 実時間 | 結果 |
| --- | --- | --- | --- |
| RTL + jsdom | 1.20 s | 1.62 s | 通過 |
| Vitest Browser Mode(headless Chromium) | 1.52 s | 2.02 s | 通過 |
| Browser Mode + `isolate: false` などの高速化 | — | — | テスト間で DOM の状態が残って失敗 |
| RTL + happy-dom | 0.816 s | 1.23 s | 通過(採用) |

- happy-dom は jsdom より約 3 割速く、通過した構成の中で最も速かった。テスト間の干渉もなかった。
- Browser Mode は、ブラウザの起動などの固定費で jsdom より遅い。速さではなく、実ブラウザでの正確さが要るテストにだけ使う。
- happy-dom は、DOM API の実装が jsdom より不完全な部分がある。実装されていない API に依存するテストは、Browser Mode か jsdom で実行する。
- `isolate: false` などの高速化は、テスト間の独立性を損なうので使わない。

## 参考

- [Kent C. Dodds - The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Next.js - How to set up Vitest with Next.js](https://nextjs.org/docs/app/guides/testing/vitest)
- [Building a Testing Infrastructure for AI-Assisted Development](https://micahking.dev/posts/testing-infrastructure-for-ai-assisted-development/)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [happy-dom](https://github.com/capricorn86/happy-dom)
