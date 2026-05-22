# Lumine distribution page

GitHub Pages向けの静的なアプリ配布ページです。

## SoundDeck

- 詳細ページ: `apps/sounddeck/`
- 説明本文: `content/apps/sounddeck.md`
- 配布情報: `data/apps.json`
- 画像: `public/images/apps/sounddeck/`

## アプリを追加する

1. `data/apps.json` にアプリ情報を追加します。
2. `content/apps/<slug>.md` にfrontmatter付きMarkdownを書きます。
3. `public/images/apps/<slug>/icon.png` と `screenshot.png` を置きます。
4. 専用URLが必要な場合は `apps/sounddeck/` を参考に `apps/<slug>/index.html` を追加します。

専用URLが不要な場合は、`pageUrl` を省略すると `apps/app/?slug=<slug>` の汎用詳細ページで表示できます。

## GitHub Releasesと同期する

`data/apps.json` に `releaseRepo` と `assetPattern` を指定すると、ページ表示時にGitHub Releases APIから最新版のRelease情報を取得します。

```json
"releaseRepo": "7Lumine/SoundDeck",
"assetPattern": "win-x64-self-contained.zip"
```

同期できる項目は、バージョン、リリース日、ファイル名、ファイルサイズ、ダウンロードURL、SHA256です。API取得に失敗した場合は、`apps.json` に書かれた値をそのまま使います。

## 直接ダウンロード

`downloadUrl` にはGitHub Releasesのasset直リンクを指定します。最新版を常に指したい場合は `/releases/latest/download/<asset-name>` を使います。

例:

```json
"downloadUrl": "https://github.com/7Lumine/SoundDeck/releases/latest/download/SoundDeck-0.1.0-beta-windows-x64.zip"
```

Pages内に小さいファイルを置く場合は `public/downloads/<file>` のようなパスも使えますが、大きな配布ファイルはGitHub Releasesに置く方が扱いやすいです。
