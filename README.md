# NotebookLM Sync Tool (GAS) — 段階的開発版

Googleドライブ上の指定フォルダにアップロードされたファイルを、NotebookLM用に自動管理するGoogle Apps Script（GAS）ツールです。

---

## 開発方針

このプロジェクトは段階的に機能を追加・検証しながら開発を進めます。
各フェーズで動作を確認してから次の段階に進みます。

---

## フェーズ一覧

| フェーズ | 状態 | 内容 |
|----------|------|------|
| Phase 1 | ✅ 開発中 | 指定フォルダに `NoteBookLM` フォルダと `sync-log.gdoc` を作成 |
| Phase 2 | 🔜 未着手 | PDFファイルの検出とGoogleドキュメントへの変換 |
| Phase 3 | 🔜 未着手 | Markdownファイルの検出と変換 |
| Phase 4 | 🔜 未着手 | 更新ファイルの差分検知とID維持更新 |
| Phase 5 | 🔜 未着手 | 重複処理防止（ScriptProperties管理） |

---

## Phase 1 仕様

### 目的

スクリプトを実行すると、以下のフォルダ・ファイル構造が自動的に生成されることを確認する。

```
指定フォルダ（SOURCE_FOLDER_ID）
 └── NoteBookLM/          ← 自動作成されるサブフォルダ
      └── sync-log        ← 自動作成されるGoogleドキュメント
```

### 動作仕様

- `SOURCE_FOLDER_ID` で指定したGoogleドライブのフォルダを取得する
- そのフォルダ直下に `NoteBookLM` という名前のサブフォルダが **なければ作成** する（あればそのまま使用）
- `NoteBookLM` フォルダ内に `sync-log` という名前のGoogleドキュメントが **なければ作成** する（あればそのまま使用）
- 作成済みの場合は何もせずにスキップする（冪等性の確保）
- 実行ログにフォルダIDとファイルIDを出力する

### 設定パラメータ

| 変数名 | 説明 |
|--------|------|
| `SOURCE_FOLDER_ID` | 対象GoogleドライブフォルダのID（URLから取得） |
| `OUTPUT_FOLDER_NAME` | 作成するサブフォルダ名（デフォルト: `NoteBookLM`） |
| `LOG_FILE_NAME` | 作成するGoogleドキュメント名（デフォルト: `sync-log`） |

### 使い方

1. [Google Apps Script](https://script.google.com/) を開き、新規プロジェクトを作成
2. `Code.gs` の内容を貼り付けて保存
3. `SOURCE_FOLDER_ID` を自分のGoogleドライブフォルダIDに変更
4. `setupNotebookLMFolder` を選択して **「▶ 実行」**
5. 初回は権限承認ダイアログが表示されるので「許可」をクリック
6. GoogleドライブでフォルダとGoogleドキュメントが作成されていることを確認

### 関数リファレンス

| 関数名 | 用途 |
|--------|------|
| `setupNotebookLMFolder()` | メイン関数。フォルダとsync-logファイルを作成する |
| `getOrCreateSubFolder(parentFolder, folderName)` | サブフォルダを取得 or 新規作成する内部関数 |
| `getOrCreateSyncLog(outputFolder, logFileName)` | sync-logドキュメントを取得 or 新規作成する内部関数 |

---

## 旧バージョンについて

最初の設計ドキュメントは `README_0.md` を参照してください。
