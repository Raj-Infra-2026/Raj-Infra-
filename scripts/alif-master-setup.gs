/** ALIF LABS: bind this Apps Script to the MASTER spreadsheet.
 * 1. In Apps Script > Project Settings > Script properties set SERVICE_ACCOUNT_EMAIL
 *    to the email in your Cloudflare SERVICE_ACCOUNT_JSON (client_email).
 * 2. Run setupAlifMaster() once and grant the required permissions.
 * 3. Run installAlifTriggers() once and authorize Drive/Spreadsheet access.
 * No password plaintext is ever written; hashes are created by the Worker.
 */
const ALIF_MASTER_HEADERS = ['tenant_id','company_name','owner_name','email','password_salt','password_hash','phone','status','spreadsheet_id','created_at','provision_state','provisioned_at','provision_error'];
const ALIF_TABLES = ['Clients','Quotations','Invoices','DeliveryNotes','ClientPOs','Vendors','PurchaseOrders'];
const ALIF_DATA_HEADERS = ['id','brand_id','reference','name','status','amount','date','updated_at','data_json'];
const ALIF_AUDIT_HEADERS = ['event_id','brand_id','table','record_id','action','actor','timestamp','reference','details'];

function setupAlifMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Use a Google Apps Script bound to the ALIF LABS master spreadsheet.');
  const sheet = ss.getSheetByName('Clients') || ss.insertSheet('Clients');
  if (sheet.getLastRow() > 0) {
    const actual = sheet.getRange(1,1,1,ALIF_MASTER_HEADERS.length).getValues()[0];
    if (ALIF_MASTER_HEADERS.some((header,idx)=>header !== actual[idx])) {
      throw new Error('Master Clients tab already has different headers. Use a NEW, EMPTY master spreadsheet; do not overwrite business data.');
    }
  } else {
    sheet.getRange(1,1,1,ALIF_MASTER_HEADERS.length).setValues([ALIF_MASTER_HEADERS]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1,1,1,ALIF_MASTER_HEADERS.length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#171c33');
  sheet.setColumnWidth(2,230); sheet.setColumnWidth(3,180); sheet.setColumnWidth(4,245);
  sheet.setColumnWidth(8,120); sheet.setColumnWidth(9,290); sheet.setColumnWidth(13,300);
  const range = sheet.getRange('H2:H');
  range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Active','Suspended'],true).setAllowInvalid(false).build());
  sheet.getRange('E:G').setFontColor('#343a46');
  SpreadsheetApp.flush();
  Logger.log('ALIF LABS master Clients tab is ready. Next run installAlifTriggers().');
}

function installAlifTriggers() {
  const email = String(PropertiesService.getScriptProperties().getProperty('SERVICE_ACCOUNT_EMAIL') || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set SERVICE_ACCOUNT_EMAIL in Project Settings > Script properties first.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('This script must be bound to the master spreadsheet.');
  setupAlifMaster();
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (['alifStatusChanged','alifReconcile'].includes(trigger.getHandlerFunction())) ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('alifStatusChanged').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('alifReconcile').timeBased().everyMinutes(5).create();
  Logger.log('Automatic provisioning enabled. Manually change Pending to Active in Clients column H.');
}

function alifStatusChanged(event) {
  if (!event?.range || event.range.getSheet().getName() !== 'Clients' || event.range.getRow() < 2) return;
  // A multi-cell paste is reconciled by the scheduled safety check.
  if (event.range.getColumn() <= 8 && event.range.getLastColumn() >= 8) {
    for (let row=event.range.getRow();row<=event.range.getLastRow();row++) alifProvisionRow_(row);
  }
}

function alifReconcile() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Clients');
  if (!sheet) return;
  const last = sheet.getLastRow();
  if (last < 2) return;
  const data = sheet.getRange(2,1,last-1,11).getValues();
  for (let i=0; i<data.length; i++) {
    if (data[i][7] === 'Active' && (!data[i][8] || data[i][10] !== 'Ready')) {
      alifProvisionRow_(i + 2);
    }
  }
}

function alifProvisionRow_(rowNumber) {
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(18000)) return;
  try {
    const master = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Clients');
    const data = master.getRange(rowNumber,1,1,13).getValues()[0];
    const [tenantId, companyName, ownerName, email,,,,status,currentId] = data;
    if (status !== 'Active' || !tenantId || !email) return;
    if (currentId && data[10] === 'Ready') return;
    const savedKey = 'alif_tenant_' + tenantId;
    const props = PropertiesService.getScriptProperties();
    master.getRange(rowNumber,11).setValue('Provisioning');
    let id = currentId || props.getProperty(savedKey);
    if (!id) {
      const ss = SpreadsheetApp.create('ALIF LABS - ' + String(companyName).slice(0,110) + ' - ' + String(tenantId).slice(0,8));
      id = ss.getId();
      // Persist the new ID before any other API calls so a retry won't create duplicates.
      props.setProperty(savedKey,id);
      master.getRange(rowNumber,9).setValue(id);
    }
    const tenantBook = SpreadsheetApp.openById(id);
    for (const name of ALIF_TABLES) alifEnsureTab_(tenantBook,name,ALIF_DATA_HEADERS);
    alifEnsureTab_(tenantBook,'AuditLogs',ALIF_AUDIT_HEADERS);
    alifEnsureTab_(tenantBook,'CompanySettings',['field','value']);
    const defaultTab = tenantBook.getSheetByName('Sheet1');
    if (defaultTab && defaultTab.getLastRow()===0 && tenantBook.getSheets().length > 1) tenantBook.deleteSheet(defaultTab);
    const account = String(props.getProperty('SERVICE_ACCOUNT_EMAIL') || '').trim();
    if (!account) throw new Error('SERVICE_ACCOUNT_EMAIL is not configured.');
    // Cloudflare Worker must be able to read/write the tenant's private spreadsheet.
    DriveApp.getFileById(id).addEditor(account);
    SpreadsheetApp.flush();
    master.getRange(rowNumber,9).setValue(id);
    master.getRange(rowNumber,11,1,2).setValues([['Ready',new Date().toISOString()]]);
    master.getRange(rowNumber,13).clearContent();
  } catch (error) {
    const master = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Clients');
    master.getRange(rowNumber,11).setValue('Error');
    master.getRange(rowNumber,13).setValue(String(error.message || error).slice(0,250));
    console.error('ALIF provision failed',rowNumber,error);
  } finally { lock.releaseLock(); }
}

function alifEnsureTab_(book,name,headers) {
  const tab = book.getSheetByName(name) || book.insertSheet(name);
  if (tab.getLastRow() === 0) {
    tab.getRange(1,1,1,headers.length).setValues([headers]);
    tab.setFrozenRows(1);
    tab.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#e9e4ff');
  } else {
    const actual = tab.getRange(1,1,1,headers.length).getValues()[0];
    if (headers.some((h,i)=>actual[i] !== h)) throw new Error('Unexpected existing headers in ' + name);
  }
}
