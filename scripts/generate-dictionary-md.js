/* DICTIONARY.md (ナッドサット語⇔日本語 全語彙対応表) を生成する */
const fs = require("fs");
const path = require("path");
const { NADSAT_DICT } = require("../js/dictionary.js");

const lines = [
  "# ナッドサット語 ⇔ 日本語 対応表",
  "",
  "『時計じかけのオレンジ』(Anthony Burgess, 1962) のナッドサット語 全語彙。",
  "出典: Wiktionary「Appendix: A Clockwork Orange」/ peevish.co.uk Nadsat Dictionary。",
  "",
  `全 ${NADSAT_DICT.length} 語。「翻訳対応語」列の日本語が入力に含まれると、その語がナッドサット語に変換される。`,
  "",
  "| ナッドサット語 | カタカナ | 日本語の意味 | 語源 | 翻訳対応語 |",
  "| --- | --- | --- | --- | --- |",
];

for (const e of NADSAT_DICT) {
  const ja = e.ja.map((i) => i[0]).join("、") || "—";
  lines.push(`| ${e.n} | ${e.k} | ${e.m} | ${e.o} | ${ja} |`);
}
lines.push("");

fs.writeFileSync(path.join(__dirname, "..", "DICTIONARY.md"), lines.join("\n"));
console.log(`DICTIONARY.md generated (${NADSAT_DICT.length} entries)`);
