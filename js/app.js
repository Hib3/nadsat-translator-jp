/* UI配線: 翻訳・コピー・タブ・辞書テーブル */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const input = $("#input");
  const output = $("#output");
  const stats = $("#stats");
  const copyBtn = $("#copy-btn");
  const toast = $("#toast");

  /* ---------- 翻訳 (入力のたびにライブ変換) ---------- */

  let lastPlain = "";

  function render() {
    const text = NadsatTranslator.normalizeText(input.value);
    output.textContent = "";
    if (!text.trim()) {
      const ph = document.createElement("span");
      ph.className = "placeholder";
      ph.textContent = "ここに翻訳結果が表示されます…";
      output.appendChild(ph);
      stats.textContent = "";
      lastPlain = "";
      return;
    }

    // 形態素解析が使えれば境界情報を付与(誤変換防止+読みベースの辞書引き)
    const morph = NadsatSegmenter.ready ? NadsatSegmenter.analyze(text) : null;
    const tokens = NadsatTranslator.translateTokens(text, morph);
    let converted = 0;
    lastPlain = "";

    for (const t of tokens) {
      lastPlain += t.text;
      if (t.nadsat) {
        converted++;
        const span = document.createElement("span");
        span.className = "nadsat";
        span.textContent = t.text;
        span.title = `${t.orig} → ${t.entry.n} (${t.entry.m})`;
        output.appendChild(span);
      } else {
        output.appendChild(document.createTextNode(t.text));
      }
    }
    stats.textContent = converted
      ? `${converted} 語をナッドサット語に変換しました`
      : "変換できる単語が見つかりませんでした";
  }

  input.addEventListener("input", render);

  /* ---------- 例文 ---------- */

  document.querySelectorAll(".example-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      input.value = btn.textContent;
      render();
    });
  });

  /* ---------- コピー ---------- */

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  copyBtn.addEventListener("click", async () => {
    if (!lastPlain) {
      showToast("コピーする翻訳結果がありません");
      return;
    }
    try {
      await navigator.clipboard.writeText(lastPlain);
    } catch {
      // clipboard API が使えない環境向けフォールバック
      const ta = document.createElement("textarea");
      ta.value = lastPlain;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast("コピーしました — ホラーショー!");
  });

  /* ---------- タブ ---------- */

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      document.getElementById(tab.dataset.panel).classList.add("active");
    });
  });

  /* ---------- 辞書テーブル ---------- */

  const dictBody = $("#dict-body");
  const dictSearch = $("#dict-search");
  const dictCount = $("#dict-count");

  function renderDict(query) {
    const q = (query || "").trim().toLowerCase();
    dictBody.textContent = "";
    let shown = 0;

    for (const e of NADSAT_DICT) {
      const jaWords = e.ja.map((item) => item[0]).join("、");
      const haystack = `${e.n} ${e.k} ${e.m} ${e.o} ${jaWords}`.toLowerCase();
      if (q && !haystack.includes(q)) continue;
      shown++;

      const tr = document.createElement("tr");
      const cells = [
        ["nadsat-word", e.n],
        ["kana", e.k],
        ["", jaWords ? `${e.m}(対応語: ${jaWords})` : e.m],
        ["origin", e.o],
      ];
      for (const [cls, txt] of cells) {
        const td = document.createElement("td");
        if (cls) td.className = cls;
        td.textContent = txt;
        tr.appendChild(td);
      }
      dictBody.appendChild(tr);
    }
    dictCount.textContent = `${shown} / ${NADSAT_DICT.length} 語`;
  }

  dictSearch.addEventListener("input", () => renderDict(dictSearch.value));
  renderDict("");

  /* ---------- 形態素解析の初期化 ---------- */

  const morphBadge = $("#morph-badge");
  const KUROMOJI_DICT_URL = "assets/kuromoji/dict";

  function initMorph(dicPath) {
    morphBadge.textContent = "読込中…";
    NadsatSegmenter.init(dicPath || window.NADSAT_DICT_PATH || KUROMOJI_DICT_URL, (ok) => {
      morphBadge.textContent = ok
        ? "ON(形態素境界に沿って変換)"
        : "OFF(表層マッチで動作中)";
      render(); // 解析器が使えるようになったら結果を更新
    });
  }

  window.NadsatApp = { render, initMorph }; // テスト・デバッグ用フック
  initMorph();
})();
