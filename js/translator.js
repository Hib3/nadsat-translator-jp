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
  // basicOnly=true の場合は基本形のみ(可能・受身・命令などの派生を作らない)。
  // 「分かれ(→分かれる)」のような別語との衝突を避けるために使う。
  function expandVerb(base, type, out, basicOnly) {
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
      push("ませんでした", "しませんでした");
      push("ましょう", "しましょう");
      push("たい", "したい");
      push("たかった", "したかった");
      push("たくない", "したくない");
      push("たくなかった", "したくなかった");
      push("たら", "したら");
      push("よう", "しよう");
      push("れば", "すれば");
      push("ろ", "しろ");
      if (!basicOnly) {
        push("ながら", "しながら");
        push("ず", "せず");
        push("すぎ", "しすぎ");
        push("やすい", "しやすい");
        push("に", "しに");
        push("ちゃ", "しちゃ");   // 見ちゃった → ビディーしちゃった
        push("られ", "され");     // 受身: 見られた → ビディーされた
        push("させ", "させ");     // 使役: 見させる → ビディーさせる
        push("れ", "でき");       // ら抜き可能: 見れる → ビディーできる
      }
    } else {
      const g = GODAN[type.slice(2)]; // "v5u" → GODAN.u
      if (!g) return pairs;
      const e = g.ba.slice(0, -1); // え段 (飲む→め)
      push(g.end, "する");
      push(g.ta, "した");
      push(g.te, "して");
      push(g.ta + "ら", "したら");
      push(g.a + "ない", "しない");
      push(g.a + "なかった", "しなかった");
      push(g.i + "ます", "します");
      push(g.i + "ました", "しました");
      push(g.i + "ません", "しません");
      push(g.i + "ませんでした", "しませんでした");
      push(g.i + "ましょう", "しましょう");
      push(g.i + "たい", "したい");
      push(g.i + "たかった", "したかった");
      push(g.i + "たくない", "したくない");
      push(g.i + "たくなかった", "したくなかった");
      push(g.o, "しよう");
      push(g.ba, "すれば");
      if (!basicOnly) {
        push(g.i + "ながら", "しながら");
        push(g.a + "ず", "せず");         // 言わずに → スカザットせずに
        push(g.i + "すぎ", "しすぎ");     // 飲みすぎた → ピートしすぎた
        push(g.i + "やすい", "しやすい");
        push(g.i + "に", "しに");         // 飲みに行く → ピートしに…
        push(g.i + "方", "し方");         // 飲み方 → ピートし方
        // 〜ちゃった/じゃった (縮約)
        const taBody = g.ta.slice(0, -1);
        push(taBody + (g.ta.endsWith("だ") ? "じゃ" : "ちゃ"), "しちゃ");
        push(g.a + "れ", "され");         // 受身: 殴られた → トルチョックされた
        push(g.a + "せ", "させ");         // 使役: 飲ませる → ピートさせる
        push(e, "しろ");                  // 命令: 飲め → ピートしろ
        // 可能形 (命令形より長いキーが優先される)
        push(e + "る", "できる");
        push(e + "た", "できた");
        push(e + "て", "できて");
        push(e + "ない", "できない");
        push(e + "なかった", "できなかった");
        push(e + "ます", "できます");
        push(e + "ました", "できました");
        push(e + "ません", "できません");
        push(e + "そう", "できそう");
        push(e + "れば", "できれば");
      }
    }
    return pairs;
  }

  // い形容詞 → な形容詞への写像 (良い→ホラーショーな)
  function expandAdj(base, out, skipKu) {
    const stem = base.slice(0, -1);
    const pairs = [
      [stem + "い", out + "な"],
      [stem + "かった", out + "だった"],
      [stem + "かったら", out + "だったら"],
      [stem + "くない", out + "じゃない"],
      [stem + "くなかった", out + "じゃなかった"],
      [stem + "ければ", out + "なら"],
      [stem + "くて", out + "で"],
      [stem + "さそう", out + "そう"], // 良さそう → ホラーショーそう
    ];
    if (!skipKu) pairs.push([stem + "く", out + "に"]);
    // 語幹がひらがな1文字(「よ」「い」)だと「よそう」「いすぎ」等の
    // 別語を壊すため、そう/すぎ は語幹2文字以上か漢字語幹のみ生成
    const singleKana = [...stem].length === 1 && /^[ぁ-ゖ]$/.test(stem);
    if (!singleKana) {
      pairs.push([stem + "そう", out + "そう"]);   // 汚そう → グラズニーそう
      pairs.push([stem + "すぎ", out + "すぎ"]);   // 汚すぎる → グラズニーすぎる
    }
    return pairs;
  }

  /* ---------- 表記揺れ対応 ---------- */

  /**
   * かな表記の相互変換(ひらがな⇔カタカナ)。
   * かなだけで構成される表層形に対し、もう一方の表記のキーも自動登録する。
   * 例: タバコ→たばこ、ともだち→トモダチ
   * 短いかな語(2文字以下)は「あいさつ」の「さつ」のような
   * 部分一致事故を招くため対象外(必要なものは辞書に手動登録)。
   */
  function kanaTwin(surface) {
    if ([...surface].length < 3) return null;
    let out = "";
    let changed = false;
    for (const ch of surface) {
      const c = ch.codePointAt(0);
      if (c >= 0x3041 && c <= 0x3096) {
        out += String.fromCodePoint(c + 0x60); // ひらがな → カタカナ
        changed = true;
      } else if (c >= 0x30a1 && c <= 0x30f6) {
        out += String.fromCodePoint(c - 0x60); // カタカナ → ひらがな
        changed = true;
      } else if (ch === "ー" || ch === "・") {
        out += ch;
      } else {
        return null; // 漢字・英数字などを含む語は対象外
      }
    }
    return changed ? out : null;
  }

  /* ---------- 変換テーブル構築 ---------- */

  function buildTable() {
    // surface(日本語) → { out(ナッドサット), entry(辞書エントリ) }
    const table = new Map();
    const add = (surface, out, entry) => {
      if (!surface || table.has(surface)) return;
      table.set(surface, { out, entry });
      const twin = kanaTwin(surface);
      if (twin && !table.has(twin)) table.set(twin, { out, entry });
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
          const basicOnly = item[3] === "basic";
          for (const [s, o] of expandVerb(surface, type, out, basicOnly)) {
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
  function translateTokens(rawInput) {
    // NFKC正規化: 半角カナ(ﾀﾊﾞｺ)・全角英数などの表記揺れを吸収
    const input = String(rawInput).normalize("NFKC");
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
          i += matched.surface.length;
        } else {
          if (plain) {
            tokens.push({ text: plain, nadsat: false });
            plain = "";
          }
          let outText = matched.val.out;
          let consumed = matched.surface.length;
          const rest = input.slice(i + consumed);

          // --- 文脈に応じた自然化 ---
          // な形容詞化した語(〜な)は、後続語に合わせて な/だ/削除 を切り替える
          if (outText.endsWith("な")) {
            if (/^(の|ん)/.test(rest)) {
              // ホラーショーなの / ホラーショーなんだ → そのまま
            } else if (/^(です|でし|か(?!ら)|さ|みたい|らしい|だろう)/.test(rest)) {
              // 良いです→ホラーショーです / 良いだろう→ホラーショーだろう
              outText = outText.slice(0, -1);
            } else if (
              rest === "" ||
              /^[。．.!！?？\n\r、，]/.test(rest) ||
              /^(ね|よ|わ|ぞ|ぜ|なあ|なぁ|な$|な[。!！?？\n\r]|けど|けれど|から|し|って|そう)/.test(rest) ||
              /^と(?!き|ころ|こ)/.test(rest)
            ) {
              // 文末・引用・接続: 良い。→ホラーショーだ。/ 良いと思う→ホラーショーだと思う
              outText = outText.slice(0, -1) + "だ";
            }
          }
          // 「よかったです」→「ホラーショーでした」(「だったです」を回避)
          if (outText.endsWith("だった") && rest.startsWith("です")) {
            outText = outText.slice(0, -3) + "でした";
            consumed += 2; // 後続の「です」を取り込む
          }

          tokens.push({
            text: outText,
            nadsat: true,
            orig: matched.surface,
            entry: matched.val.entry,
          });
          i += consumed;
        }
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
