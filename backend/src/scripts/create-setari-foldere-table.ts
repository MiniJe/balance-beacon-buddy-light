import { getDatabase } from '../config/sqlite';

/**
 * Script pentru crearea tabelei SetariFoldere în SQLite
 * Rulează manual pentru a inițializa tabela în baza de date
 */
async function createSetariFoldereTable() {
    try {
        console.log('🚀 Începe crearea tabelei SetariFoldere...');
        
        const db = await getDatabase();
        
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS SetariFoldere (
                Id INTEGER PRIMARY KEY DEFAULT 1,
                SabloaneFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\Sabloane',
                CereriConfirmareFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\CereriGenerate',
                BackupFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\Backup',
                CereriSemnateFolder TEXT DEFAULT 'C:\\BalanceBeaconBuddy\\CereriSemnate',
                DataCreare DATETIME DEFAULT CURRENT_TIMESTAMP,
                DataActualizare DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(Id)
            )
        `;
        
        await db.exec(createTableSQL);
        console.log('✅ Tabela SetariFoldere a fost creată cu succes!');
        
        // Inserează o înregistrare implicită cu ID = 1
        const insertDefaultSQL = `
            INSERT OR IGNORE INTO SetariFoldere (Id) VALUES (1)
        `;
        
        await db.run(insertDefaultSQL);
        console.log('✅ Înregistrarea implicită a fost inserată cu succes!');
        
        // Verifică că tabela a fost creată corect
        const result = await db.get('SELECT * FROM SetariFoldere WHERE Id = 1');
        console.log('📊 Setările implicite din tabela SetariFoldere:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('🎉 Scriptul de inițializare s-a încheiat cu succes!');
        
    } catch (error) {
        console.error('❌ Eroare la crearea tabelei SetariFoldere:', error);
        throw error;
    }
}

// Rulează scriptul dacă este apelat direct
if (require.main === module) {
    createSetariFoldereTable()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export { createSetariFoldereTable };
