/** Google Sheets > Extensions > Apps Script > paste and run setupDatabase().
 * Creates empty headers only. Safe to rerun: does not clear existing data.
 */
function setupDatabase() {
  const tables = ['Clients','Quotations','Invoices','DeliveryNotes','ClientPOs','Vendors','PurchaseOrders'];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  tables.forEach(name => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const headers = ['id','brand_id','reference','name','status','amount','date','updated_at','data_json'];
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#dce8f8');
      sh.autoResizeColumns(1,8);
    }
  });
  SpreadsheetApp.getUi().alert('Database tabs are ready.');
}
