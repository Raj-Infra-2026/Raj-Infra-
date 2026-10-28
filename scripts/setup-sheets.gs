/** Raj Infra V2 Part 1. Safe additive setup: never clears existing rows.
 *  In your spreadsheet: Extensions > Apps Script > paste > run setupDatabase().
 */
function setupDatabase() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const tables=['Clients','Quotations','Invoices','DeliveryNotes','ClientPOs','Vendors','PurchaseOrders'];
  const standard=['id','brand_id','reference','name','status','amount','date','updated_at','data_json'];
  tables.forEach(name=>{
    const sh=ss.getSheetByName(name)||ss.insertSheet(name);
    if(sh.getLastRow()===0){sh.getRange(1,1,1,9).setValues([standard]);sh.setFrozenRows(1);sh.getRange(1,1,1,9).setFontWeight('bold').setBackground('#e9e4ff');}
  });
  const audit=ss.getSheetByName('AuditLogs')||ss.insertSheet('AuditLogs');
  if(audit.getLastRow()===0){audit.getRange(1,1,1,9).setValues([['event_id','brand_id','table','record_id','action','actor','timestamp','reference','details_json']]);audit.setFrozenRows(1);audit.getRange(1,1,1,9).setFontWeight('bold').setBackground('#e9e4ff');}
  SpreadsheetApp.getUi().alert('Raj Infra V2 tabs checked. Existing data was not deleted.');
}
/** Preview rows with missing brand_id. Does not write or change any record. */
function inspectUnassignedBrands(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(), names=['Clients','Quotations','Invoices','DeliveryNotes','ClientPOs','Vendors','PurchaseOrders'];
  const lines=names.map(name=>{const sh=ss.getSheetByName(name);if(!sh||sh.getLastRow()<2)return name+': 0';const values=sh.getRange(2,1,sh.getLastRow()-1,2).getValues();return name+': '+values.filter(r=>r[0]&&!r[1]).length;});
  SpreadsheetApp.getUi().alert('Unassigned brand_id rows (not visible in V2):\n'+lines.join('\n'));
}
