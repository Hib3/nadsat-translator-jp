/*
 * 日本語 → ナッドサット語 翻訳エンジン
 *
 * 方針: 原作でアレックスが「英語の文法にロシア語由来の単語を混ぜて話す」ように、
 * 入力された日本語の文法・助詞・語順は保ったまま、辞書に載っている単語だけを
 * ナッドサット語(カタカナ)に置き換える。
 *
 * - 動詞は活用形(た形・て形・ます形・ない形など)を展開し、
 *   「飲んだ」→「ピートした」のように「〜する」の活用へ写像する
 * - い形容詞は「良い→ホラーショーな」「よかった→ホラーショーだった」のように
 *   な形容詞の活用へ写像する
 * - マッチングは最長一致(長いキー優先)
 */

(function (global) {
  "use strict";

  let dict;
  if (typeof NADSAT_DICT !== "undefined") {
    dict = { entries: NADSAT_DICT, block: NADSAT_BLOCKLIST };
  } else {
    const d = require("./dictionary.js");
    dict = { entries: d.NADSAT_DICT, block: d.NADSAT_BLOCKLIST };
  }

  /* ---------- 活用展開 ---------- */

  // 五段動詞: 語末の仮名ごとの活用情報
  const GODAN = {
    u:  { end: "う", ta: "った", te: "って", a: "わ", i: "い", o: "おう", ba: "えば" },
    k:  { end: "く", ta: "いた", te: "いて", a: "か", i: "き", o: "こう", ba: "けば" },
    ks: { end: "く", ta: "った", te: "って", a: "か", i: "き", o: "こう", ba: "けば" }, // 行く
    g:  { end: "ぐ", ta: "いだ", te: "いで", a: "が", i: "ぎ", o: "ごう", ba: "げば" },
    s:  { end: "す", ta: "した", te: "して", a: "さ", i: "し", o: "そう", ba: "せば" },
    t:  { end: "つ", ta: "った", te: "って", a: "た", i: "ち", o: "とう", ba: "てば" },
    n:  { end: "ぬ", ta: "んだ", te: "んで", a: "な", i: "に", o: "のう", ba: "ねば" },
    b:  { end: "ぶ", ta: "んだ", te: "んで", a: "ば", i: "び", o: "ぼう", ba: "べば" },
    m:  { end: "む", ta: "んだ", te: "んで", a: "ま", i: "み", o: "もう", ba: "めば" },
    r:  { end: "る", ta: "った", te: "って", a: "ら", i: "り", o: "ろう", ba: "れば" },
  };

  // 動詞の活用形 → 「(カタカナ語)+する」の対応する活用形
  function expandVerb(base, type, out) {
    const pairs = [];
    const push = (srcSuffix, dstSuffix) =>
      pairs.push([base.slice(0, -1) + srcSuffix, out + dstSuffix]);

    if (type === "v1") {
      // 一段動詞: 「見る」→ 語幹「見」
      push("る", "する");
      push("た", "した");
      push("て", "して");
      push("ない", "しない");
      push("なかった", "しなかった");
      push("ます", "します");
      push("ました", "しました");
      push("ません", "しません");
      push("ましょう", "しましょう");
      push("たい", "したい");
      push("たかった", "したかった");
      push("たら", "したら");
      push("よう", "しよう");
      push("れば", "すれば");
      push("ろ", "しろ");
    } else {
      const g = GODAN[type.slice(2)]; // "v5u" → GODAN.u
      if (!g) return pairs;
      push(g.end, "する");
      push(g.ta, "した");
      push(g.te, "して");
      push(g.ta + "ら", "したら");
      push(g.a + "ない", "しない");
      push(g.a + "なかった", "しなかった");
      push(g.i + "ます", "します");
      push(g.i + "ました", "しました");
      push(g.i + "ません", "しません");
      push(g.i + "ましょう", "しましょう");
      push(g.i + "たい", "したい");
      push(g.i + "たかった", "したかった");
      push(g.o, "しよう");
      push(g.ba, "すれば");
    }
    return pairs;
  }

  // い形容詞 → な形容詞への写像 (良い→ホラーショーな)
  function expandAdj(base, out, skipKu) {
    const stem = base.slice(0, -1);
    const pairs = [
      [stem + "い", out + "な"],
      [stem + "かった", out + "だった"],
      [stem + "くない", out + "じゃない"],
      [stem + "くなかった", out + "じゃなかった"],
      [stem + "ければ", out + "なら"],
      [stem + "くて", out + "で"],
    ];
    if (!skipKu) pairs.push([stem + "く", out + "に"]);
    return pairs;
  }

  /* ---------- 変換テーブル構築 ---------- */

  function buildTable() {
    // surface(日本語) → { out(ナッドサット), entry(辞書エントリ) }
    const table = new Map();
    const add = (surface, out, entry) => {
      if (!surface || table.has(surface)) return;
      table.set(surface, { out, entry });
    };

    // ブロックリスト: そのまま残す(entry=null)
    for (const w of dict.block) add(w, w, null);

    for (const entry of dict.entries) {
      for (const item of entry.ja) {
        const [surface, type, override] = item;
        const out = override || entry.k;
        if (type === "n") {
          add(surface, out, entry);
        } else if (type === "adj" || type === "adjX") {
          const stem = override && override !== entry.k ? override : entry.k;
          for (const [s, o] of expandAdj(surface, stem, type === "adjX")) {
            add(s, o, entry);
          }
        } else if (type.startsWith("v")) {
          for (const [s, o] of expandVerb(surface, type, out)) {
            add(s, o, entry);
          }
        }
      }
    }

    // 先頭文字ごとにグループ化し、長いキー優先で並べる(最長一致用)
    const buckets = new Map();
    for (const [surface, val] of table) {
      const c = surface[0];
      if (!buckets.has(c)) buckets.set(c, []);
      buckets.get(c).push([surface, val]);
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => b[0].length - a[0].length);
    }
    return buckets;
  }

  let _buckets = null;
  function getBuckets() {
    if (!_buckets) _buckets = buildTable();
    return _buckets;
  }

  /* ---------- 翻訳本体 ---------- */

  /**
   * 日本語テキストをナッドサット語混じりの文に変換する。
   * @returns {Array<{text: string, nadsat: boolean, orig?: string, entry?: object}>}
   *   トークン列。nadsat=true のトークンは置換された語。
   */
  function translateTokens(input) {
    const buckets = getBuckets();
    const tokens = [];
    let plain = "";
    let i = 0;

    while (i < input.length) {
      const candidates = buckets.get(input[i]);
      let matched = null;
      if (candidates) {
        for (const [surface, val] of candidates) {
          if (input.startsWith(surface, i)) {
            matched = { surface, val };
            break; // 長い順に並んでいるので最初のヒットが最長一致
          }
        }
      }
      if (matched) {
        if (matched.val.entry === null) {
          // ブロックリスト語: そのまま通す
          plain += matched.surface;
        } else {
          if (plain) {
            tokens.push({ text: plain, nadsat: false });
            plain = "";
          }
          tokens.push({
            text: matched.val.out,
            nadsat: true,
            orig: matched.surface,
            entry: matched.val.entry,
          });
        }
        i += matched.surface.length;
      } else {
        plain += input[i];
        i += 1;
      }
    }
    if (plain) tokens.push({ text: plain, nadsat: false });
    return tokens;
  }

  /** プレーンテキストの翻訳結果を返す */
  function translate(input) {
    return translateTokens(input)
      .map((t) => t.text)
      .join("");
  }

  const api = { translate, translateTokens };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.NadsatTranslator = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
