# ナッドサット翻訳機 — NADSAT TRANSLATOR

日本語の文章を『時計じかけのオレンジ』(Anthony Burgess / Stanley Kubrick) の
若者言葉 **ナッドサット語** に翻訳するWebアプリ。

原作の主人公アレックスが「英語の文法のままロシア語由来の単語を混ぜて話す」のと
同じ仕組みで、**日本語の文法・助詞・語尾はそのまま**に、辞書に載っている単語だけを
ナッドサット語(カタカナ)に置き換えます。

> 例: 「昨日、友達とミルクバーで牛乳を飲んだ。」
> → 「昨日、**ドルーグ**と**モロコ**バーで**モロコ**を**ピート**した。」

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
| `js/dictionary.js` | ナッドサット語 全242語の辞書データ + 誤変換防止ブロックリスト |
| `js/translator.js` | 翻訳エンジン(動詞・形容詞の活用展開 + 最長一致置換) |
| `js/app.js` | UI配線(ライブ翻訳・コピー・辞書テーブル) |
| `DICTIONARY.md` | ナッドサット語⇔日本語 全語彙対応表(自動生成) |
| `scripts/generate-dictionary-md.js` | DICTIONARY.md の生成スクリプト |
| `tests/translator.test.js` | 翻訳エンジンのテスト |

## 翻訳の仕組み

1. **辞書**: Wiktionary「Appendix: A Clockwork Orange」等の公開ナッドサット語辞書の
   全語彙を、カタカナ表記・日本語の意味・語源付きで収録
2. **活用展開**: 動詞は「飲む/飲んだ/飲んで/飲みます…」→「ピートする/ピートした/
   ピートして/ピートします…」のように活用ごとに写像。い形容詞は
   「良い→ホラーショーな」「よかった→ホラーショーだった」のようにな形容詞へ写像
3. **最長一致置換**: 文字列を先頭から走査し、最も長く一致する語を置換。
   「駄目」「音楽」「手紙」など、単漢字キーが熟語を壊さないよう
   ブロックリストで保護

形態素解析器を使わない軽量な実装のため、稀に複合語が意図せず変換されることが
あります(それはそれでナッドサットらしい味になります)。

## テスト

```
node tests/translator.test.js
node scripts/generate-dictionary-md.js   # 対応表の再生成
```

## クレジット

- Nadsat は Anthony Burgess『A Clockwork Orange』(1962) の造語スラング
- 語彙の出典: [Wiktionary: Appendix: A Clockwork Orange](https://en.wiktionary.org/wiki/Appendix:A_Clockwork_Orange)、
  [peevish.co.uk Nadsat Dictionary](http://www.peevish.co.uk/slang/articles/nadsat.htm)
