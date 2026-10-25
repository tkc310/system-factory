# [feature 名]

<!-- 中規模以上で、src/api/features/<feature>/AGENTS.md に置く。短く保つ。README と重複することは書かない。機械で強制できることは書かない -->

## どこに何を書くか

| 書くもの | 置き場所 |
| --- | --- |
| 状態を変える操作 | `src/api/features/[feature]/commands/<verb>-<noun>.command.ts` |
| 読み取り | `src/api/features/[feature]/queries/get-<noun>.query.ts` |
| サーバーの共通処理 | `src/api/features/[feature]/services/<noun>.service.ts` |
| ドメインモデル(型、不変条件、状態遷移、計算) | `src/api/features/[feature]/entity.ts` |
| テーブルの読み書き(ORM を使うのはここだけ) | `src/api/features/[feature]/repository.ts` |
| テーブル定義 | `src/api/features/[feature]/tables.ts` |
| 画面とサーバーで共用するバリデーション、オブジェクト、定数 | `src/shared/features/[feature]/<noun>.ts`(ドメインモデルは置かない) |
| 画面と部品 | `src/components/features/[feature]/<Component>/index.tsx`(PascalCase のディレクトリ。子は親のディレクトリの中) |

## 用語集

| 用語 | 意味 | コード上の名前 |
| --- | --- | --- |
| | | |

## 禁止事項

- [この feature に固有の禁止事項。例: 金額は `Money` 型で扱い、number で計算しない]

## 参照実装

- 新しい command を書くときは [`commands/place-order.command.ts`] を手本にする
- 新しい query を書くときは [`queries/get-order.query.ts`] を手本にする
