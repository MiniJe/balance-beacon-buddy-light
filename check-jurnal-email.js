const { getDatabase } = require('./backend/src/config/sqlite');

async function checkJurnalEmailTable() {
    try {
        console.log('🔍 Verifică existența tabelului JurnalEmail...');
        
        const db = await getDatabase();
        
        // Verifică dacă tabelul există
        const tableInfo = await db.get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='JurnalEmail'
        `);
        
        if (tableInfo) {
            console.log('✅ Tabelul JurnalEmail EXISTĂ în baza de date');
            
            // Verifică structura tabelului
            const columns = await db.all('PRAGMA table_info(JurnalEmail)');
            console.log(`\n📋 Tabelul JurnalEmail are ${columns.length} coloane:`);
            columns.forEach(col => {
                console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}${col.pk ? ' PRIMARY KEY' : ''}`);
            });
            
            // Verifică câte înregistrări sunt
            const count = await db.get('SELECT COUNT(*) as total FROM JurnalEmail');
            console.log(`\n📊 Numărul de înregistrări în JurnalEmail: ${count.total}`);
            
            if (count.total > 0) {
                // Afișează ultimele 3 înregistrări
                const recent = await db.all('SELECT * FROM JurnalEmail ORDER BY CreatLa DESC LIMIT 3');
                console.log('\n📋 Ultimele 3 înregistrări din JurnalEmail:');
                recent.forEach((record, index) => {
                    console.log(`  ${index + 1}. ID: ${record.IdJurnalEmail}, Email: ${record.EmailDestinatar}, Status: ${record.StatusTrimitere}`);
                });
            }
            
        } else {
            console.log('❌ Tabelul JurnalEmail NU EXISTĂ în baza de date!');
            
            // Listează toate tabelele disponibile
            const allTables = await db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                ORDER BY name
            `);
            
            console.log('\n📊 Tabele disponibile în baza de date:');
            allTables.forEach((table, index) => {
                console.log(`  ${index + 1}. ${table.name}`);
            });
            
            // Căută tabele cu "email" în nume
            const emailTables = allTables.filter(t => t.name.toLowerCase().includes('email'));
            if (emailTables.length > 0) {
                console.log('\n📧 Tabele cu "email" în nume:');
                emailTables.forEach(table => console.log(`  - ${table.name}`));
            }
        }
        
        // Verifică și alte tabele importante
        const otherTables = ['JurnalCereriConfirmare', 'SetariEmail'];
        console.log('\n🔍 Verifică alte tabele importante:');
        
        for (const tableName of otherTables) {
            try {
                const count = await db.get(`SELECT COUNT(*) as total FROM ${tableName}`);
                console.log(`📊 ${tableName}: ${count.total} înregistrări`);
            } catch (error) {
                console.log(`❌ ${tableName}: Tabelul nu există sau eroare - ${error.message}`);
            }
        }
        
        console.log('\n✅ Verificarea completă!');
        
    } catch (error) {
        console.error('❌ Eroare la verificarea tabelului JurnalEmail:', error);
    }
}

checkJurnalEmailTable();
