const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

async function createJurnalEmailTable() {
    const db = new sqlite3.Database('./backend/data/balance-beacon-buddy-light.db');
    
    try {
        console.log('🔧 Creează tabelul JurnalEmail în SQLite...');
        
        // SQL pentru crearea tabelului JurnalEmail adaptat pentru SQLite
        const createTableSQL = `
        CREATE TABLE IF NOT EXISTS JurnalEmail (
            IdJurnalEmail TEXT PRIMARY KEY,
            IdPartener TEXT,
            EmailDestinatar TEXT NOT NULL,
            SubiectEmail TEXT NOT NULL,
            ContinutEmail TEXT,
            TipEmail TEXT NOT NULL DEFAULT 'GENERAL',
            DataTrimitere TEXT NOT NULL DEFAULT (datetime('now')),
            StatusTrimitere TEXT NOT NULL DEFAULT 'PENDING',
            MesajEroare TEXT,
            IdMessageEmail TEXT,
            IdLot TEXT,
            IdCerereConfirmare TEXT,
            PriorityLevel TEXT NOT NULL DEFAULT 'NORMAL',
            NumeExpeditor TEXT,
            EmailExpeditor TEXT,
            NumeDestinatar TEXT,
            TipDestinatar TEXT,
            EmailCC TEXT,
            EmailBCC TEXT,
            EmailReplyTo TEXT,
            Atasamente TEXT,
            NumarIncercari INTEGER NOT NULL DEFAULT 1,
            DataUltimaIncercare TEXT,
            DataUrmatoareaIncercare TEXT,
            MaximIncercari INTEGER NOT NULL DEFAULT 3,
            DataCitire TEXT,
            DataRaspuns TEXT,
            RaspunsEmail TEXT,
            HashEmail TEXT,
            HashTranzactieBlockchain TEXT,
            StareBlockchain TEXT,
            TimestampBlockchain TEXT,
            ReteaBlockchain TEXT,
            AdresaContractBlockchain TEXT,
            GazUtilizat REAL,
            CostTranzactie REAL,
            CreatLa TEXT NOT NULL DEFAULT (datetime('now')),
            CreatDe TEXT NOT NULL,
            ModificatLa TEXT,
            ModificatDe TEXT,
            EsteProgramatPentruStergere INTEGER DEFAULT 0,
            DataStergere TEXT,
            MotivarStergere TEXT,
            ReferenceEmailId TEXT,
            TrackingEnabled INTEGER DEFAULT 0,
            IdSablon TEXT
        );
        `;
        
        // Execută crearea tabelului
        await new Promise((resolve, reject) => {
            db.run(createTableSQL, function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Tabelul JurnalEmail a fost creat cu succes!');
                    resolve(this);
                }
            });
        });
        
        // Creare indexuri pentru performanță
        const indexes = [
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_CreatLa ON JurnalEmail(CreatLa);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_DataTrimitere ON JurnalEmail(DataTrimitere);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_StatusTrimitere ON JurnalEmail(StatusTrimitere);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_IdPartener ON JurnalEmail(IdPartener);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_IdLot ON JurnalEmail(IdLot);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_IdCerereConfirmare ON JurnalEmail(IdCerereConfirmare);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_TipEmail ON JurnalEmail(TipEmail);',
            'CREATE INDEX IF NOT EXISTS IX_JurnalEmail_HashTranzactieBlockchain ON JurnalEmail(HashTranzactieBlockchain);'
        ];
        
        console.log('🔧 Creează indexurile...');
        for (const indexSQL of indexes) {
            await new Promise((resolve, reject) => {
                db.run(indexSQL, function(err) {
                    if (err) {
                        console.warn('⚠️ Eroare la crearea indexului:', err.message);
                        resolve(this); // Continuă chiar dacă indexul există deja
                    } else {
                        resolve(this);
                    }
                });
            });
        }
        
        console.log('✅ Toate indexurile au fost create!');
        
        // Verifică că tabelul a fost creat
        await new Promise((resolve, reject) => {
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='JurnalEmail'", (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    console.log('🎯 VERIFICARE: Tabelul JurnalEmail există acum în baza de date!');
                    resolve(row);
                } else {
                    reject(new Error('Tabelul JurnalEmail nu a fost găsit după creare!'));
                }
            });
        });
        
        // Verifică structura tabelului
        await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(JurnalEmail)", (err, columns) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`📋 Tabelul JurnalEmail are ${columns.length} coloane:`);
                    columns.forEach(col => {
                        console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'}${col.pk ? ' PRIMARY KEY' : ''}`);
                    });
                    resolve(columns);
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Eroare la crearea tabelului JurnalEmail:', error);
        throw error;
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Eroare la închiderea bazei de date:', err);
            } else {
                console.log('🔒 Baza de date închisă cu succes');
            }
        });
    }
}

// Rulează scriptul
createJurnalEmailTable().catch(console.error);
