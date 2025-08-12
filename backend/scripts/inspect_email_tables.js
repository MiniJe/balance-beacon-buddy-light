const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, '../data/balance-beacon-buddy-light.db');
const db = new sqlite3.Database(dbPath);
const all = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(e) : res(r)));
(async () => {
  try {
    console.log('DB Path:', dbPath);
    const emailInfo = await all('PRAGMA table_info(EmailSabloane);');
    const emailRows = await all('SELECT IdSablon,NumeSablon,TipSablon,CategorieSablon,Activ FROM EmailSabloane ORDER BY CategorieSablon,NumeSablon;');
    const cereriInfo = await all('PRAGMA table_info(JurnalCereriConfirmare);');
    const cereriSample = await all('SELECT rowid,* FROM JurnalCereriConfirmare ORDER BY rowid DESC LIMIT 5;');
    console.log('\n=== EmailSabloane STRUCT ===');
    console.table(emailInfo);
    console.log('\n=== EmailSabloane ROWS ===');
    console.table(emailRows);
    console.log('\n=== JurnalCereriConfirmare STRUCT ===');
    console.table(cereriInfo);
    console.log('\n=== JurnalCereriConfirmare SAMPLE ROWS ===');
    console.table(cereriSample);
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    db.close();
  }
})();
