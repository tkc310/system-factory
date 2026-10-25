# [サービス名] のソフトウェアファクトリー

このリポジトリでは、変更を次の工程に通す。工程の間で受け渡すのはファイル(仕様、コミット、PR、記録)で、会話ではない。

```
Issue → /spec → [人が承認] → /build → /review → PR → GitHub 側の検査(品質ゲート + secrets-scan + factory/review) → /retro → [人がマージ]
                                                                                                  ↓
                                                                毎週: 改善ジョブが規則を強める下書き PR を作る
```

| 工程 | コマンド | 担当 | 出力 |
| --- | --- | --- | --- |
| 1〜2 仕様化と計画 | `/spec <Issue 番号>` | planner | `docs/specs/NNNN-<slug>.md` |
| 承認 | — | 人 | 仕様の状態を「承認」に |
| 3〜4 実装と検証 | `/build <仕様のパス>` | implementer、フック | ブランチ、コミット |
| 5 独立レビュー | `/review <仕様のパス>` | reviewer | 必須 / 推奨の指摘 |
| PR | `/build` の最後 | `/build`(人が確認) | PR |
| GitHub 側の検査 | 自動 | 品質ゲート、secrets-scan、エージェントのレビュー([形式 A: GitHub Actions / 形式 B: ルーティン]) | 必須チェック、レビューコメント、`factory/review` |
| 6 振り返り | `/retro <PR 番号>` | retro | `docs/feedback/LESSONS.md` の追記(同じ PR) |
| 7 マージ | — | 人 | main |
| 週次の改善 | 自動(毎週月曜) | [形式 A: factory-improve.yml / 形式 B: ルーティン factory-improve] | 下書き PR と、週次の報告の Issue |

## 準備完了の定義

- [ ] 受け入れ条件が、テストに書き下せる形で列挙されている
- [ ] 影響する feature と編集してよいパスが書かれている
- [ ] 承認が要る操作が洗い出されている
- [ ] 未解決の質問がない
- [ ] 人が承認した

## 完了の定義

- [ ] `make check` が通る
- [ ] 受け入れ条件ごとにテストがあり、PR で対応を示した
- [ ] reviewer の必須の指摘がない
- [ ] 仕様の範囲外の変更がない
- [ ] 振り返りを済ませた

## ガードレール

| 止めるもの | 仕組み |
| --- | --- |
| 保護パスの編集 | `scripts/guard-paths.sh`(PreToolUse)、CODEOWNERS |
| 破壊的・危険なコマンド | `.claude/settings.json` の `permissions`、`.claude/hooks/guard-bash.sh`(PreToolUse) |
| 検査を通さない完了 | `.claude/hooks/require-check-on-stop.sh`(Stop) |
| 規則違反のコミットとマージ | lefthook(早く気づくため)、GitHub 側の必須チェック、ブランチ保護(迂回の禁止) |
| Git のフックの回避(`--no-verify` など) | エージェント: `guard-bash.sh` が拒否。人: 手元では止めず、同じ検査を GitHub 側で必須チェックにする |
| レビューを通っていないコミットのマージ | 必須チェック `factory/review`(コミットごとに付くので、push のたびにやり直しが要る) |
| 秘密情報 | `permissions` の読み取り拒否、秘密情報の検出(lefthook、CI) |
| 人の確認を経ないマージ | ブランチ保護、CODEOWNERS。エージェントは `gh pr merge` を使えない |

ガードレールの設定とエージェントの役割(`.claude/**`)、無人ジョブ用のスクリプト(`scripts/factory/**`)は保護パスで、変えるには人の許可と CODEOWNERS の承認が要る。

## 改善ループ

- PR ごと: `/retro` が、仕組みで防げたはずの誤りを `docs/feedback/LESSONS.md` に記録する。
- 週ごと: 改善ジョブが記録、CI の失敗、レビューの指摘を集計し、規則を強める下書き PR を作る。手順は `docs/factory/improve.md`。人が下書きを「Ready for review」にすると、CI とレビューが動く。
- 規則を緩める変更は、自動では提案されない。必要なら Issue で議論する。

## 運用の前提

- 実行の形式: [形式 A: GitHub Actions + API キー(シークレット `ANTHROPIC_API_KEY`) / 形式 B: lefthook + ルーティン(サブスクリプション。設定は software-factory スキルの `templates/routines/README.md`)]
- ブランチ保護(ルールセット)で、品質ゲート(`ci` のジョブ `check`)、`secrets-scan`、`factory/review` を必須チェックにし、コードオーナーのレビューを必須にする。迂回を許すリストは空にする。
- 形式 B で `factory/review` が付かないとき(GitHub イベントの上限など)は、ルーティン `factory-review` の Run now に PR 番号を書いて実行し直す。
