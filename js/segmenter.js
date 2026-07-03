/*
 * 形態素解析アダプタ (kuromoji.js)
 *
 * kuromoji.js が読み込まれていれば辞書を非同期ロードし、
 * NadsatTranslator.translateTokens() に渡す形態素情報
 * { boundaries, byStart } を提供する。
 * kuromoji が無い/ロード失敗時は ready=false のままとなり、
 * 翻訳エンジンは表層形マッチのみのフォールバック動作になる。
 *
 * 注意: analyze() へ渡すテキストは NadsatTranslator.normalizeText()
 * で正規化済みのものを使うこと(オフセットを共有するため)。
 */
(function (global) {
  "use strict";

  let tokenizer = null;
  let building = false;

  const api = {
    get ready() {
      return tokenizer !== null;
    },

    /**
     * kuromoji辞書をロードする。
     * @param dicPath 辞書ディレクトリ(URLまたはパス)
     * @param cb 完了コールバック(成功なら true)
     */
    init(dicPath, cb) {
      if (tokenizer) { if (cb) cb(true); return; }
      let lib = typeof kuromoji !== "undefined" ? kuromoji : null;
      if (!lib && typeof module !== "undefined" && typeof require === "function") {
        try { lib = require("kuromoji"); } catch (e) { /* Nodeに未インストール */ }
      }
      if (building || !lib) { if (cb) cb(false); return; }
      building = true;
      lib.builder({ dicPath }).build((err, tok) => {
        building = false;
        if (!err) tokenizer = tok;
        if (cb) cb(!err);
      });
    },

    /**
     * テキストを解析し、形態素境界と開始位置→形態素の索引を返す。
     * tokenizerが未準備なら null。
     */
    analyze(text) {
      if (!tokenizer) return null;
      const boundaries = new Set([0, text.length]);
      const byStart = new Map();
      for (const t of tokenizer.tokenize(text)) {
        const start = t.word_position - 1; // word_position は1始まり
        boundaries.add(start);
        boundaries.add(start + t.surface_form.length);
        byStart.set(start, {
          surface: t.surface_form,
          reading: t.reading,
          pos: t.pos,
        });
      }
      return { boundaries, byStart };
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api; // Node(テスト)では kuromoji を注入せず直接同型を作る
  } else {
    global.NadsatSegmenter = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
