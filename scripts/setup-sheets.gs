/** Raj Infra V2 unified workspace. Safe additive setup: never clears existing rows.
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
  const product=ss.getSheetByName('Products')||ss.insertSheet('Products');
  if(product.getLastRow()===0){product.getRange(1,1,1,7).setValues([['id','product_name','product_brand','sku','created_at','updated_at','status']]);product.setFrozenRows(1);product.getRange(1,1,1,7).setFontWeight('bold').setBackground('#e9e4ff');}
  SpreadsheetApp.getUi().alert('Raj Infra tabs checked, including Products. Existing data was not deleted.');
}

// Column B (brand_id) is retained for backward compatibility. It is unused by the app.
