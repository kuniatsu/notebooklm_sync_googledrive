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

### 導入手順（Phase 1）

#### Step 1: 対象フォルダのIDを確認する

GoogleドライブでNoteBookLMに同期させたいフォルダを開き、URLからフォルダIDをコピーします。

```
https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        これがフォルダID
```

#### Step 2: Google Apps Scriptプロジェクトを作成する

1. [https://script.google.com/](https://script.google.com/) にアクセス（Googleアカウントでログイン）
2. 左上の **「新しいプロジェクト」** をクリック
3. プロジェクト名を `notebooklm-sync` などに変更（任意）

#### Step 3: コードを貼り付ける

1. エディタ内のデフォルトコード（`function myFunction() {}`）を全て削除
2. このリポジトリの `Code.gs` の内容を全てコピーして貼り付ける
3. 1行目付近の `SOURCE_FOLDER_ID` を **Step 1** でコピーしたIDに変更する

```javascript
// 変更前
const SOURCE_FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

// 変更後（例）
const SOURCE_FOLDER_ID = '1aBcDeFgHiJkLmNoPqRsTuVwXyZ';
```

4. **Ctrl+S**（Mac: Cmd+S）で保存

#### Step 4: スクリプトを実行する

1. エディタ上部の関数選択ドロップダウンで **`setupNotebookLMFolder`** を選択
2. **「▶ 実行」** ボタンをクリック
3. **初回のみ** 権限承認ダイアログが表示される：
   - 「権限を確認」→ Googleアカウントを選択
   - 「このアプリはGoogleで確認されていません」と表示されたら「詳細」→「安全ではないページに移動」をクリック
   - 「許可」をクリック
4. 再度 **「▶ 実行」** をクリック（権限承認後に自動実行されない場合）

#### Step 5: 実行結果を確認する

**ログの確認：**
- エディタ下部の「実行ログ」に以下のようなメッセージが表示されれば成功

```
対象フォルダ取得成功: <フォルダ名> (ID: 1aBcDe...)
新規フォルダを作成: NoteBookLM
新規sync-logを作成: sync-log
Phase 1 完了: セットアップが正常に終了しました。
```

**Googleドライブの確認：**
- 対象フォルダを開くと `NoteBookLM` フォルダが作成されている
- `NoteBookLM` フォルダ内に `sync-log` というGoogleドキュメントが作成されている

#### 再実行時の動作（冪等性）

すでに `NoteBookLM` フォルダや `sync-log` が存在する状態で再実行した場合、ログに以下が表示され、既存ファイルはそのまま保持されます。

```
既存フォルダを使用: NoteBookLM
既存のsync-logを使用: sync-log
Phase 1 完了: セットアップが正常に終了しました。
```

### 関数リファレンス

| 関数名 | 用途 |
|--------|------|
| `setupNotebookLMFolder()` | メイン関数。フォルダとsync-logファイルを作成する |
| `getOrCreateSubFolder(parentFolder, folderName)` | サブフォルダを取得 or 新規作成する内部関数 |
| `getOrCreateSyncLog(outputFolder, logFileName)` | sync-logドキュメントを取得 or 新規作成する内部関数 |

---

## 旧バージョンについて

最初の設計ドキュメントは `README_0.md` を参照してください。
