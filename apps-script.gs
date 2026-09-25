/* Bind this script to a Google Sheet. Publish only when you want a public board. */
const BOARD_TAB = 'Unstuck board';
const BOARD_HEADERS = ['id', 'type', 'prompt', 'text', 'name', 'timestamp'];
const CARD_PROMPTS = [
  'A time I felt stuck', 'What actually helped',
  'Advice that landed wrong', "A voice I'd actually listen to"
];
const VOTE_OPTIONS = ['New parents', 'Founders', 'Career changers', 'Students facing a big test', 'After a breakup'];

function boardJson(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function boardSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Create this script from Extensions > Apps Script in your Google Sheet.');
  let sheet = spreadsheet.getSheetByName(BOARD_TAB);
  if (!sheet) sheet = spreadsheet.insertSheet(BOARD_TAB);
  if (!sheet.getLastRow()) {
    sheet.getRange(1, 1, 1, BOARD_HEADERS.length).setValues([BOARD_HEADERS]);
    sheet.setFrozenRows(1);
  }
  const headers = sheet.getRange(1, 1, 1, BOARD_HEADERS.length).getDisplayValues()[0];
  if (headers.join('|') !== BOARD_HEADERS.join('|')) throw new Error('The board columns do not match the expected schema.');
  return sheet;
}

function doGet() {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sheet = boardSheet();
    const values = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, BOARD_HEADERS.length).getDisplayValues() : [];
    const rows = values.map(values => {
      const row = {};
      BOARD_HEADERS.forEach((key, index) => { row[key] = values[index]; });
      return row;
    });
    return boardJson({ ok: true, rows: rows });
  } catch (error) {
    return boardJson({ ok: false, error: 'The board is unavailable. Please try again later.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  try {
    const body = event && event.postData && event.postData.contents;
    if (!body || body.length > 6000) throw new Error('Invalid request.');
    const input = JSON.parse(body);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid request.');
    if (typeof input.id !== 'string' || !/^[\w-]{1,100}$/.test(input.id)) throw new Error('A valid request ID is required.');
    if (input.type !== 'card' && input.type !== 'vote') throw new Error('Unknown type.');
    if (typeof input.prompt !== 'string') throw new Error('Choose a prompt.');
    const text = typeof input.text === 'string' ? input.text.trim() : '';
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (input.type === 'card') {
      if (CARD_PROMPTS.indexOf(input.prompt) === -1) throw new Error('Choose a valid prompt.');
      if (!text || Array.from(text).length > 280) throw new Error('Cards must contain 1–280 characters.');
      if (Array.from(name).length > 60) throw new Error('Names must be 60 characters or fewer.');
    } else if (VOTE_OPTIONS.indexOf(input.prompt) === -1) {
      throw new Error('Choose a valid poll option.');
    }
    lock.waitLock(10000);
    const sheet = boardSheet();
    if (sheet.getLastRow() > 1) {
      const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
        .createTextFinder(input.id).matchEntireCell(true).findNext();
      if (match) return boardJson({ ok: true, id: input.id, duplicate: true });
    }
    const row = [input.id, input.type, input.prompt,
      input.type === 'card' ? text : '', input.type === 'card' ? name : '', new Date().toISOString()];
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, BOARD_HEADERS.length);
    range.setNumberFormat('@');
    // Rich-text writes store literal text, including leading =, +, -, or @, rather than formulas.
    range.setRichTextValues([row.map(value => SpreadsheetApp.newRichTextValue().setText(value).build())]);
    SpreadsheetApp.flush();
    return boardJson({ ok: true, id: input.id });
  } catch (error) {
    return boardJson({ ok: false, error: 'This card or vote could not be saved. Check the fields and try again.' });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
