import { defineConfig } from "vitest/config";

// カバレッジの閾値は、業務ロジックを含む層にだけ掛ける(ARCHITECTURE.md の「品質ゲート」)。
// BUSINESS_LOGIC.small を採った段階のキーに替え、使わないキーは消す。閾値は ARCHITECTURE.md の値に合わせる。
const BUSINESS_LOGIC = {
  small: ["src/features/*/{commands,queries,services}/**/*.ts"],
  medium: [
    "src/server/features/*/{commands,queries,services}/**/*.ts",
    "src/shared/features/**/*.ts",
  ],
} as const;

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    // テストがまだない空の雛形でも make check を通すため
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: [...BUSINESS_LOGIC.small],
      exclude: ["**/*.test.{ts,tsx}"],
      thresholds: { lines: 80 },
    },
  },
});
