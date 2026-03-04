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

  // 4. SOURCE_FOLDER_ID 直下の全ファイルを走査して .md ファイルを収集
  var allFiles = sourceFolder.getFiles();
  var mdFiles = [];
  var totalFiles = 0;

  while (allFiles.hasNext()) {
    var f = allFiles.next();
    totalFiles++;
    if (f.getName().toLowerCase().endsWith('.md')) {
      mdFiles.push(f);
    }
  }

  // ---- スキャン結果サマリー ----
  Logger.log('---- スキャン結果 ----');
  Logger.log('フォルダ内ファイル総数: ' + totalFiles + '件');
  if (mdFiles.length === 0) {
    Logger.log('.mdファイルは見つかりませんでした。');
    Logger.log('※ ファイルがサブフォルダ内にある場合は検出されません。');
    Logger.log('※ debugListFiles() を実行するとフォルダ内の全ファイル一覧を確認できます。');
  } else {
    Logger.log('.mdファイルを ' + mdFiles.length + '件 発見しました:');
    for (var i = 0; i < mdFiles.length; i++) {
      Logger.log('  [' + (i + 1) + '] ' + mdFiles[i].getName());
    }
  }
  Logger.log('----------------------');

  // 5. 発見した .md ファイルを順番に処理
  var convertedCount = 0;
  var skippedCount = 0;

  for (var i = 0; i < mdFiles.length; i++) {
    var file = mdFiles[i];
    var fileName = file.getName();

    // 出力ファイル名を生成（元ファイルの最終更新日を使用）
    var outputName = generateOutputName(fileName, file.getLastUpdated());
    Logger.log('[処理 ' + (i + 1) + '/' + mdFiles.length + '] ' + fileName + ' → ' + outputName);

    // 同名ファイルが既に存在する場合はスキップ
    if (outputFolder.getFilesByName(outputName).hasNext()) {
      Logger.log('  → スキップ（既存）');
      skippedCount++;
      continue;
    }

    // Markdownの内容を読み込んでGoogleドキュメントに変換
    try {
      var content = file.getBlob().getDataAsString('UTF-8');
      convertMdToGoogleDoc(content, outputName, outputFolder);
      appendToSyncLog(body, new Date(), fileName, outputName);
      convertedCount++;
      Logger.log('  → 変換完了');
    } catch (e) {
      Logger.log('  → エラー: ' + e.message);
    }
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
 * DocumentApp.create() はスクリプトの種類によって作成先フォルダが異なるため、
 * getRootFolder() に頼らず getParents() で動的に親フォルダを取得して移動する。
 *
 * @param {string} content - Markdownファイルのテキスト内容
 * @param {string} outputName - 作成するGoogleドキュメントの名前
 * @param {Folder} outputFolder - 配置先フォルダ
 * @return {File} 作成されたGoogleドキュメントのFileオブジェクト
 */
function convertMdToGoogleDoc(content, outputName, outputFolder) {
  // Googleドキュメントを新規作成
  var newDoc = DocumentApp.create(outputName);
  newDoc.getBody().setText(content);
  newDoc.saveAndClose();

  var docFile = DriveApp.getFileById(newDoc.getId());

  // NoteBookLM フォルダに追加
  outputFolder.addFile(docFile);

  // 作成時に配置された元の親フォルダ（root または スクリプトの親フォルダ）から削除
  // getRootFolder() に頼らず getParents() で実際の親を走査して除去する
  var parents = docFile.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    if (parent.getId() !== outputFolder.getId()) {
      parent.removeFile(docFile);
    }
  }

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
// デバッグ用関数
// ============================================================

/**
 * SOURCE_FOLDER_ID のフォルダ内にあるファイルの一覧とMIMEタイプをログに出力する。
 * syncMarkdownFiles() が正常に動作しない場合に先に実行して原因を確認する。
 */
function debugListFiles() {
  var sourceFolder = DriveApp.getFolderById(SOURCE_FOLDER_ID);
  Logger.log('=== フォルダ: ' + sourceFolder.getName() + ' (ID: ' + sourceFolder.getId() + ') ===');

  var files = sourceFolder.getFiles();
  var count = 0;
  while (files.hasNext()) {
    var file = files.next();
    Logger.log('[' + (count + 1) + '] 名前: "' + file.getName() + '" | MIME: ' + file.getMimeType() + ' | 最終更新: ' + file.getLastUpdated());
    count++;
  }

  if (count === 0) {
    Logger.log('（ファイルなし）');
  }
  Logger.log('合計 ' + count + ' 件のファイルが見つかりました。');
  Logger.log('※ .md ファイルが一覧にない場合は SOURCE_FOLDER_ID が違うか、ファイルがサブフォルダ内にあります。');
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
  var newDoc = DocumentApp.create(logFileName);
  var docFile = DriveApp.getFileById(newDoc.getId());

  outputFolder.addFile(docFile);

  // 作成時の元の親フォルダ（root またはスクリプトの親フォルダ）から削除
  var parents = docFile.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    if (parent.getId() !== outputFolder.getId()) {
      parent.removeFile(docFile);
    }
  }

  Logger.log('新規sync-logを作成: ' + logFileName);
  return docFile;
}
