// ============================================================
// Phase 1: NoteBookLMフォルダ と sync-log.gdoc の作成
// ============================================================

// ---- 設定パラメータ ----
// 対象フォルダのIDをGoogleドライブのURLから取得して設定してください
// 例: https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
//                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                             この部分がフォルダID
const SOURCE_FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

const OUTPUT_FOLDER_NAME = 'NoteBookLM';
const LOG_FILE_NAME = 'sync-log';

// ============================================================
// メイン関数
// ============================================================

/**
 * 指定フォルダ内に NoteBookLM サブフォルダと sync-log ドキュメントを作成する。
 * 既に存在する場合はスキップする（冪等）。
 */
function setupNotebookLMFolder() {
  // 1. 対象フォルダを取得
  var sourceFolder;
  try {
    sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  } catch (e) {
    Logger.log('エラー: フォルダが見つかりません。SOURCE_FOLDER_ID を確認してください。ID: ' + SOURCE_FOLDER_ID);
    throw e;
  }
  Logger.log('対象フォルダ取得成功: ' + sourceFolder.getName() + ' (ID: ' + sourceFolder.getId() + ')');

  // 2. NoteBookLM サブフォルダを取得 or 作成
  var outputFolder = getOrCreateSubFolder(sourceFolder, OUTPUT_FOLDER_NAME);
  Logger.log('出力フォルダ: ' + outputFolder.getName() + ' (ID: ' + outputFolder.getId() + ')');

  // 3. sync-log ドキュメントを取得 or 作成
  var syncLogFile = getOrCreateSyncLog(outputFolder, LOG_FILE_NAME);
  Logger.log('sync-logファイル: ' + syncLogFile.getName() + ' (ID: ' + syncLogFile.getId() + ')');

  Logger.log('Phase 1 完了: セットアップが正常に終了しました。');
}

// ============================================================
// 内部関数
// ============================================================

/**
 * 親フォルダ内に指定名のサブフォルダを取得する。
 * 存在しない場合は新規作成する。
 *
 * @param {Folder} parentFolder - 親フォルダ
 * @param {string} folderName - サブフォルダ名
 * @return {Folder} 取得または新規作成したフォルダ
 */
function getOrCreateSubFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    var existingFolder = folders.next();
    Logger.log('既存フォルダを使用: ' + folderName);
    return existingFolder;
  }

  var newFolder = parentFolder.createFolder(folderName);
  Logger.log('新規フォルダを作成: ' + folderName);
  return newFolder;
}

/**
 * 指定フォルダ内に sync-log という名前のGoogleドキュメントを取得する。
 * 存在しない場合は新規作成する。
 *
 * @param {Folder} outputFolder - 出力先フォルダ
 * @param {string} logFileName - ログファイル名
 * @return {File} 取得または新規作成したGoogleドキュメントのFileオブジェクト
 */
function getOrCreateSyncLog(outputFolder, logFileName) {
  var files = outputFolder.getFilesByName(logFileName);
  if (files.hasNext()) {
    var existingFile = files.next();
    Logger.log('既存のsync-logを使用: ' + logFileName);
    return existingFile;
  }

  // 新規Googleドキュメントを作成してフォルダに移動
  var doc = DocumentApp.create(logFileName);
  var docFile = DriveApp.getFileById(doc.getId());

  // Googleドキュメント作成時はマイドライブルートに作られるため、
  // 対象フォルダに移動してルートから削除する
  outputFolder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  Logger.log('新規sync-logを作成: ' + logFileName);
  return docFile;
}
