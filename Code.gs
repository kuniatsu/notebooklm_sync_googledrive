// ============================================================
// Phase 1: NoteBookLMフォルダ と sync-log.gdoc の作成
// Phase 2: .mdファイルをGoogleドキュメントに変換してNoteBookLMにコピー
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
// Phase 1: メイン関数
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
// Phase 2: メイン関数
// ============================================================

/**
 * SOURCE_FOLDER_ID 直下の .md ファイルを検出し、
 * Googleドキュメントに変換して NoteBookLM フォルダにコピーする。
 * 同名ファイルが既に存在する場合はスキップする（冪等）。
 * 処理結果は sync-log に追記する。
 */
function syncMarkdownFiles() {
  // 1. 対象フォルダを取得
  var sourceFolder;
  try {
    sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  } catch (e) {
    Logger.log('エラー: フォルダが見つかりません。SOURCE_FOLDER_ID を確認してください。ID: ' + SOURCE_FOLDER_ID);
    throw e;
  }
  Logger.log('対象フォルダ取得成功: ' + sourceFolder.getName());

  // 2. NoteBookLM フォルダと sync-log を取得 or 作成
  var outputFolder = getOrCreateSubFolder(sourceFolder, OUTPUT_FOLDER_NAME);
  var syncLogFile = getOrCreateSyncLog(outputFolder, LOG_FILE_NAME);

  // 3. sync-log を開いて追記モードで準備
  var doc = DocumentApp.openById(syncLogFile.getId());
  var body = doc.getBody();

  // 4. SOURCE_FOLDER_ID 直下の .md ファイルを処理
  var files = sourceFolder.getFiles();
  var convertedCount = 0;
  var skippedCount = 0;

  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();

    if (!fileName.toLowerCase().endsWith('.md')) continue;

    Logger.log('.mdファイルを検出: ' + fileName);

    // 出力ファイル名を生成（元ファイルの最終更新日を使用）
    var outputName = generateOutputName(fileName, file.getLastUpdated());

    // 同名ファイルが既に存在する場合はスキップ
    if (outputFolder.getFilesByName(outputName).hasNext()) {
      Logger.log('スキップ（既存）: ' + outputName);
      skippedCount++;
      continue;
    }

    // Markdownの内容をGoogleドキュメントに変換してNoteBookLMフォルダへ配置
    var content = file.getBlob().getDataAsString('UTF-8');
    convertMdToGoogleDoc(content, outputName, outputFolder);

    // sync-log に記録
    appendToSyncLog(body, new Date(), fileName, outputName);

    convertedCount++;
  }

  doc.saveAndClose();
  Logger.log('Phase 2 完了: 変換=' + convertedCount + '件, スキップ=' + skippedCount + '件');
}

// ============================================================
// Phase 2: 内部関数
// ============================================================

/**
 * ファイル名と最終更新日から出力ファイル名を生成する。
 *
 * 命名規則: {ベース名}_{拡張子}-{yymmddhhmm}
 * 例: README.md（最終更新: 2026/03/04 15:35）→ README_md-2603041535
 *
 * @param {string} fileName - 元のファイル名（例: README.md）
 * @param {Date} lastModified - ファイルの最終更新日時
 * @return {string} 生成された出力ファイル名
 */
function generateOutputName(fileName, lastModified) {
  var dotIndex = fileName.lastIndexOf('.');
  var base = dotIndex >= 0 ? fileName.substring(0, dotIndex) : fileName;
  var ext  = dotIndex >= 0 ? fileName.substring(dotIndex + 1) : '';

  var tz = Session.getScriptTimeZone();
  var dateStr = Utilities.formatDate(lastModified, tz, 'yyMMddHHmm');

  return base + '_' + ext + '-' + dateStr;
}

/**
 * Markdownテキストの内容でGoogleドキュメントを作成し、指定フォルダに配置する。
 *
 * @param {string} content - Markdownファイルのテキスト内容
 * @param {string} outputName - 作成するGoogleドキュメントの名前
 * @param {Folder} outputFolder - 配置先フォルダ
 * @return {File} 作成されたGoogleドキュメントのFileオブジェクト
 */
function convertMdToGoogleDoc(content, outputName, outputFolder) {
  // Googleドキュメントを新規作成（マイドライブルートに生成される）
  var newDoc = DocumentApp.create(outputName);
  newDoc.getBody().setText(content);
  newDoc.saveAndClose();

  // NoteBookLM フォルダに移動してルートから削除
  var docFile = DriveApp.getFileById(newDoc.getId());
  outputFolder.addFile(docFile);
  DriveApp.getRootFolder().removeFile(docFile);

  Logger.log('Googleドキュメントを作成: ' + outputName);
  return docFile;
}

/**
 * sync-log ドキュメントにコピー記録を1行追記する。
 *
 * 記録フォーマット:
 * [yyyy/MM/dd HH:mm:ss] コピー元: {元ファイル名}  →  コピー先: {変換後ファイル名}
 *
 * @param {Body} body - sync-log ドキュメントのBodyオブジェクト
 * @param {Date} copyDate - コピー実行日時
 * @param {string} originalName - 元のファイル名
 * @param {string} outputName - 変換後のファイル名
 */
function appendToSyncLog(body, copyDate, originalName, outputName) {
  var tz = Session.getScriptTimeZone();
  var dateStr = Utilities.formatDate(copyDate, tz, 'yyyy/MM/dd HH:mm:ss');
  var logLine = '[' + dateStr + '] コピー元: ' + originalName + '  →  コピー先: ' + outputName;

  body.appendParagraph(logLine);
  Logger.log('sync-logに記録: ' + logLine);
}

// ============================================================
// 共通内部関数（Phase 1 / Phase 2 共用）
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
    Logger.log('既存フォルダを使用: ' + folderName);
    return folders.next();
  }

  Logger.log('新規フォルダを作成: ' + folderName);
  return parentFolder.createFolder(folderName);
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
    Logger.log('既存のsync-logを使用: ' + logFileName);
    return files.next();
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
