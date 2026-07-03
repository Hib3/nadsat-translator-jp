/* 翻訳エンジンのテスト(表層マッチのみ): node tests/translator.test.js */
const { translate } = require("../js/translator.js");
const cases = require("./cases.js");

let pass = 0;
let fail = 0;
for (const [input, expected] of cases) {
  const actual = translate(input);
  if (actual === expected) {
    pass++;
    console.log(`  OK: ${input} → ${actual}`);
  } else {
    fail++;
    console.log(`FAIL: ${input}`);
    console.log(`      期待: ${expected}`);
    console.log(`      実際: ${actual}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
