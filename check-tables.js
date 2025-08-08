const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./backend/data/balance-beacon-buddy-light.db');

console.log('📊 TABELE DIN BAZA DE DATE:');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
  if (err) {
    console.error('❌ Eroare:', err);
    db.close();
    return;
  }
  
  console.log('\n🔍 Lista tabelelor găsite:');
  tables.forEach((table, index) => {
    console.log(`  ${index + 1}. ${table.name}`);
  });
  
  // Verifică specific tabelul JurnalEmail
  const hasJurnalEmail = tables.find(t => t.name === 'JurnalEmail');
  if (hasJurnalEmail) {
    console.log('\n✅ Tabelul JurnalEmail EXISTĂ');
    
    // Verifică structura tabelului JurnalEmail
    db.all("PRAGMA table_info(JurnalEmail)", (err, columns) => {
      if (err) {
        console.error('❌ Eroare la citirea structurii JurnalEmail:', err);
      } else {
        console.log('\n📋 Structura tabelului JurnalEmail:');
        columns.forEach(col => {
          console.log(`  - ${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''}${col.pk ? ' (PRIMARY KEY)' : ''}`);
        });
      }
      
      // Verifică câte înregistrări sunt în tabelul JurnalEmail
      db.get("SELECT COUNT(*) as total FROM JurnalEmail", (err, result) => {
        if (err) {
          console.error('❌ Eroare la numărarea înregistrărilor JurnalEmail:', err);
        } else {
          console.log(`\n📊 Numărul de înregistrări în JurnalEmail: ${result.total}`);
        }
        
        // Verifică și alte tabele importante
        db.get("SELECT COUNT(*) as total FROM JurnalCereriConfirmare", (err, result) => {
          if (err) {
            console.error('❌ Eroare la numărarea înregistrărilor JurnalCereriConfirmare:', err);
          } else {
            console.log(`📊 Numărul de înregistrări în JurnalCereriConfirmare: ${result.total}`);
          }
          
          db.get("SELECT COUNT(*) as total FROM SetariEmail", (err, result) => {
            if (err) {
              console.error('❌ Eroare la numărarea înregistrărilor SetariEmail:', err);
            } else {
              console.log(`📊 Numărul de înregistrări în SetariEmail: ${result.total}`);
            }
            db.close();
          });
        });
      });
    });
  } else {
    console.log('\n❌ Tabelul JurnalEmail NU EXISTĂ!');
    console.log('\n🔍 Căutare tabele similare cu "Email" sau "email":');
    const emailTables = tables.filter(t => t.name.toLowerCase().includes('email'));
    if (emailTables.length > 0) {
      emailTables.forEach(table => console.log(`  📧 ${table.name}`));
    } else {
      console.log('  ⚠️ Nu s-au găsit tabele cu "email" în nume');
    }
    
    // Verifică câte înregistrări sunt în alte tabele importante
    db.get("SELECT COUNT(*) as total FROM JurnalCereriConfirmare", (err, result) => {
      if (err) {
        console.error('❌ Eroare la numărarea înregistrărilor JurnalCereriConfirmare:', err);
      } else {
        console.log(`📊 Numărul de înregistrări în JurnalCereriConfirmare: ${result.total}`);
      }
      
      db.get("SELECT COUNT(*) as total FROM SetariEmail", (err, result) => {
        if (err) {
          console.error('❌ Eroare la numărarea înregistrărilor SetariEmail:', err);
        } else {
          console.log(`📊 Numărul de înregistrări în SetariEmail: ${result.total}`);
        }
        db.close();
      });
    });
  }
});
