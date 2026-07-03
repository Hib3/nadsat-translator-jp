/* 形態素解析(kuromoji)ありでの翻訳テスト: node tests/morph.test.js
 * 事前に npm install が必要(devDependency: kuromoji)。 */
const { translate, normalizeText } = require("../js/translator.js");
const segmenter = require("../js/segmenter.js");
const cases = require("./cases.js");

// 形態素解析ありのみで期待が変わる/意味を持つケース
const morphCases = [
  // 読み(ルビ)フォールバック: 「莨」(読み: タバコ) → キャンサー
  ["莨を吸う", "キャンサーを吸う"],
  // 縮約形は形態素をまたぐが第2パスで救済される
  ["飲んじゃった", "ピートしちゃった"],
  // 形態素境界による保護: 「流血」はブロックリスト外だが
  // 語中の「血」が始点境界に乗らないため誤変換されない
  ["流血した", "流血した"],
  ["出席した", "出席した"],
];

segmenter.init("node_modules/kuromoji/dict", (ok) => {
  if (!ok) {
    console.error("kuromoji の辞書をロードできませんでした (npm install を実行してください)");
    process.exit(1);
  }
  let pass = 0;
  let fail = 0;
  for (const [input, expected] of [...cases, ...morphCases]) {
    const norm = normalizeText(input);
    const actual = translate(norm, segmenter.analyze(norm));
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
  console.log(`\n${pass} passed, ${fail} failed (形態素解析あり)`);
  process.exit(fail ? 1 : 0);
});
