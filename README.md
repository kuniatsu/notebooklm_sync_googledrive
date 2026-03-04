# NotebookLM Sync Tool (GAS)

Googleドライブ上の指定フォルダにある `.md` ファイルを、Googleドキュメントに変換して `NoteBookLM` フォルダに自動コピーするGoogle Apps Script（GAS）ツールです。

---

## フォルダ構成

実行後、指定フォルダ内は以下の構成になります。

```
指定フォルダ（SOURCE_FOLDER_ID）
 ├── README.md                     ← 変換元（そのまま残る）
 └── NoteBookLM/                   ← 自動作成
      ├── sync-log                  ← 自動作成（コピー記録）
      └── README_md-2603041535      ← 変換後Googleドキュメント
```

---

## 動作仕様

1. `NoteBookLM` フォルダが存在しなければ自動作成する
2. `sync-log` ドキュメントが存在しなければ自動作成する
3. `SOURCE_FOLDER_ID` 直下の `.md` ファイルを全件検出する
4. 各ファイルをGoogleドキュメントに変換して `NoteBookLM` フォルダに配置する
5. 同名ファイルが既に存在する場合はスキップする（冪等性の確保）
6. 処理結果を `sync-log` に追記する

---

## ファイル命名規則

```
{ベース名}_{拡張子}-{yymmddhhmm}
```

| 変換元ファイル名 | 最終更新日時 | 変換後ファイル名 |
|----------------|------------|----------------|
| `README.md` | 2026/03/04 15:35 | `README_md-2603041535` |
| `notes.md` | 2026/03/04 16:00 | `notes_md-2603041600` |

---

## sync-log の記録フォーマット

```
[yyyy/MM/dd HH:mm:ss] コピー元: {元ファイル名}  →  コピー先: {変換後ファイル名}
```

---

## 導入手順

### Step 1: 対象フォルダのIDを確認する

GoogleドライブでフォルダのURLを開き、末尾のIDをコピーします。

```
https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        これがフォルダID
```

### Step 2: GASプロジェクトを作成してコードを貼り付ける

1. [https://script.google.com/](https://script.google.com/) を開き、新規プロジェクトを作成
2. デフォルトのコードを全て削除し、`Code.gs` の内容を貼り付けて保存
3. `SOURCE_FOLDER_ID` を Step 1 のIDに変更する

```javascript
const SOURCE_FOLDER_ID = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ';  // ← ここを変更
```

### Step 3: 実行する

1. 関数選択ドロップダウンで **`syncMarkdownFiles`** を選択
2. **「▶ 実行」** をクリック
3. 初回のみ権限承認ダイアログが表示される → 「許可」をクリック

### Step 4: 結果を確認する

**成功時のログ例:**

```
対象フォルダ: TMP (ID: 1aBcDe...)
既存フォルダを使用: NoteBookLM
既存のsync-logを使用: sync-log
---- スキャン結果 ----
フォルダ内ファイル総数: 2件
.mdファイルを 1件 発見しました:
  [1] README.md
----------------------
[処理 1/1] README.md → README_md-2603041535
  → 変換完了
完了: 変換=1件, スキップ=0件
```

---

## トラブルシューティング

### .mdファイルが見つからない場合

`debugListFiles` 関数を実行するとフォルダ内の全ファイルをログに出力できます。

- ファイルがリストに出ない → `SOURCE_FOLDER_ID` が違うフォルダを指している
- ファイルは出るが `.md` でない → Google Driveでの表示名に拡張子が含まれているか確認

---

## 関数リファレンス

| 関数名 | 種別 | 用途 |
|--------|------|------|
| `syncMarkdownFiles()` | メイン | .mdファイルを検出・変換・コピーする |
| `debugListFiles()` | デバッグ | フォルダ内ファイル一覧をログに出力する |
| `generateOutputName(fileName, lastModified)` | 内部 | 出力ファイル名を生成する |
| `convertMdToGoogleDoc(content, outputName, outputFolder)` | 内部 | Googleドキュメントを作成・配置する |
| `appendToSyncLog(body, copyDate, originalName, outputName)` | 内部 | sync-logに記録を追記する |
| `getOrCreateSubFolder(parentFolder, folderName)` | 内部 | サブフォルダを取得 or 作成する |
| `getOrCreateSyncLog(outputFolder, logFileName)` | 内部 | sync-logを取得 or 作成する |

---

## 旧バージョンについて

最初の設計ドキュメントは `README_0.md` を参照してください。
