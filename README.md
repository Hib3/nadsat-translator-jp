# ナッドサット翻訳機 — NADSAT TRANSLATOR

日本語の文章を『時計じかけのオレンジ』(Anthony Burgess / Stanley Kubrick) の
若者言葉 **ナッドサット語** に翻訳するWebアプリ。

原作の主人公アレックスが「英語の文法のままロシア語由来の単語を混ぜて話す」のと
同じ仕組みで、**日本語の文法・助詞・語尾はそのまま**に、辞書に載っている単語だけを
ナッドサット語(カタカナ)に置き換えます。

> 例: 「昨日、友達とミルクバーで牛乳を飲んだ。」
> → 「昨日、**ドルーグ**と**モロコ**バーで**モロコ**を**ピート**した。」

## 公開ページ (GitHub Pages)

https://hib3.github.io/nadsat-translator-jp/

`.github/workflows/pages.yml` がブランチへのpushごとにテストを実行し、
GitHub Pagesへ自動デプロイします。
初回デプロイがエラーになる場合は、リポジトリの
**Settings → Pages → Source** を **GitHub Actions** に設定してから
Actionsタブでワークフローを再実行してください。

## 使い方

`index.html` をブラウザで開くだけ(ビルド不要・依存なし)。

```
npx serve .        # または python3 -m http.server など任意の静的サーバ
```

- 左の欄に日本語を入力すると、右にライブで翻訳結果が表示されます
- **コピー** ボタンで翻訳結果をクリップボードにコピー
- 変換された語にカーソルを合わせると「元の単語 → 原綴り(意味)」を表示
- **対応表(全語彙)** タブで全242語のナッドサット語辞書を検索・閲覧

## ファイル構成

| パス | 内容 |
| --- | --- |
| `index.html` | アプリ本体(翻訳・対応表の2タブ) |
| `css/style.css` | 黒×オレンジ×白のポスター風デザイン |
| `js/dictionary.js` | ナッドサット語 全302語の辞書データ + 誤変換防止ブロックリスト |
| `js/translator.js` | 翻訳エンジン(動詞・形容詞の活用展開 + 最長一致置換 + 形態素境界対応) |
| `js/segmenter.js` | kuromoji.js アダプタ(形態素境界・読みの索引を提供) |
| `js/app.js` | UI配線(ライブ翻訳・コピー・辞書テーブル) |
| `assets/kuromoji/` | kuromoji.js 本体とIPADIC辞書(同梱・オフライン動作) |
| `DICTIONARY.md` | ナッドサット語⇔日本語 全語彙対応表(自動生成) |
| `scripts/generate-dictionary-md.js` | DICTIONARY.md の生成スクリプト |
| `tests/translator.test.js` | 翻訳エンジンのテスト |

## 翻訳の仕組み

1. **辞書**: GitHub上の公開Nadsat辞書2種
   ([prozum/nadsat-dict](https://github.com/prozum/nadsat-dict) と
   [m00k/nadsat-dictionary](https://github.com/m00k/nadsat-dictionary))の
   全エントリを逐語照合して収録(カタカナ表記・日本語の意味・語源付き)。
   bedways / tick-tocker 等の補遺語は Wiktionary「Appendix: A Clockwork Orange」より
2. **活用展開**: 動詞は「飲む/飲んだ/飲んで/飲みます…」→「ピートする/ピートした/
   ピートして/ピートします…」のように活用ごとに写像。受身(殴られた→トルチョック
   された)・可能(眠れない→スパットできない)・使役・「〜ながら」「〜しに行く」
   「〜すぎる」「〜ちゃった」「〜ずに」・命令形にも対応。い形容詞は
   「良い→ホラーショーな」「よかった→ホラーショーだった」のようにな形容詞へ写像し、
   後続語に応じて語形を整える(良いです→ホラーショーです、文末の「良い。」→
   「ホラーショーだ。」、「良いと思う」→「ホラーショーだと思う」など、
   意味を保ったまま自然な日本語になるよう変形)
3. **最長一致置換**: 文字列を先頭から走査し、最も長く一致する語を置換。
   「駄目」「音楽」「手紙」など、単漢字キーが熟語を壊さないよう
   ブロックリストで保護
4. **表記揺れ対応**: 入力はNFKC正規化(半角カナ「ﾀﾊﾞｺ」等を吸収)し、
   かなのみの語はひらがな⇔カタカナを自動相互登録
   (「トモダチ」「たばこ」「いらいら」等もマッチ)
5. **形態素解析 (kuromoji.js)**: ページ読込後にIPADIC辞書(同梱)を
   非同期ロードし、変換を形態素境界に沿わせる。
   これにより「流血」の中の「血」のような語中の誤変換を構造的に防ぎ、
   表層形で引けない名詞は読みでも辞書を引く(「莨」→タバコ→キャンサー)。
   辞書ロード前・失敗時は表層マッチのみで動作する(画面のバッジに表示)

## テスト

```
npm install   # kuromoji (devDependency) を取得
npm test      # 表層マッチ50件 + 形態素解析あり54件
npm run gen:dict   # DICTIONARY.md の再生成
```

## クレジット

- Nadsat は Anthony Burgess『A Clockwork Orange』(1962) の造語スラング
- 形態素解析: [kuromoji.js](https://github.com/takuyaa/kuromoji.js) (Apache-2.0) と
  IPADIC を同梱(`assets/kuromoji/` 内の LICENSE / NOTICE を参照)
- 語彙の出典:
  [prozum/nadsat-dict](https://github.com/prozum/nadsat-dict)(原作巻末辞典系・全エントリ照合済み)、
  [m00k/nadsat-dictionary](https://github.com/m00k/nadsat-dictionary)(映画版追加語を含む拡張版・全エントリ照合済み)、
  [Wiktionary: Appendix: A Clockwork Orange](https://en.wiktionary.org/wiki/Appendix:A_Clockwork_Orange)(補遺)
