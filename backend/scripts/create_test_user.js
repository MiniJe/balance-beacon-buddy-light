const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'balance-beacon-buddy-light.db');

// Configurație utilizator de test
const TEST_USER = {
    email: 'paulaurelian@freshcrm.ro',
    password: 'admin123', // Parola va fi hash-uită
    nume: 'Paul Aurelian',
    rol: 'ADMIN'
};

async function createTestUser() {
    return new Promise((resolve, reject) => {
        console.log('🚀 Conectare la baza de date:', dbPath);
        
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Eroare conectare BD:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Conectat la baza de date SQLite');
        });

        // Verifică dacă tabela Utilizatori există
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Utilizatori'", async (err, row) => {
            if (err) {
                console.error('❌ Eroare verificare tabele:', err);
                db.close();
                reject(err);
                return;
            }

            if (!row) {
                console.log('📊 Creez tabela Utilizatori...');
                const createTable = `
                    CREATE TABLE Utilizatori (
                        IdUtilizator TEXT PRIMARY KEY,
                        NumeUtilizator TEXT NOT NULL,
                        EmailUtilizator TEXT UNIQUE NOT NULL,
                        ParolaUtilizator TEXT NOT NULL,
                        RolUtilizator TEXT DEFAULT 'USER',
                        UtilizatorActiv INTEGER DEFAULT 1,
                        DataCreare DATETIME DEFAULT CURRENT_TIMESTAMP,
                        DataModificare DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                db.run(createTable, async (err) => {
                    if (err) {
                        console.error('❌ Eroare creare tabela:', err);
                        db.close();
                        reject(err);
                        return;
                    }
                    console.log('✅ Tabela Utilizatori creată');
                    await insertTestUser(db);
                    resolve();
                });
            } else {
                console.log('✅ Tabela Utilizatori există deja');
                await insertTestUser(db);
                resolve();
            }
        });

        async function insertTestUser(db) {
            try {
                // Verifică dacă utilizatorul există deja
                db.get('SELECT * FROM Utilizatori WHERE EmailUtilizator = ?', [TEST_USER.email], async (err, existingUser) => {
                    if (err) {
                        console.error('❌ Eroare verificare utilizator existent:', err);
                        db.close();
                        reject(err);
                        return;
                    }

                    if (existingUser) {
                        console.log('⚠️ Utilizatorul există deja:', TEST_USER.email);
                        console.log('✅ Utilizator existent găsit:', {
                            Id: existingUser.IdUtilizator,
                            Nume: existingUser.NumeUtilizator,
                            Email: existingUser.EmailUtilizator,
                            Rol: existingUser.RolUtilizator,
                            Activ: existingUser.UtilizatorActiv ? 'DA' : 'NU'
                        });
                    } else {
                        console.log('👤 Creez utilizator de test...');
                        
                        // Hash parola
                        const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
                        const userId = uuidv4();

                        const insertUser = `
                            INSERT INTO Utilizatori (
                                IdUtilizator, NumeUtilizator, EmailUtilizator, 
                                ParolaUtilizator, RolUtilizator, UtilizatorActiv
                            ) VALUES (?, ?, ?, ?, ?, 1)
                        `;

                        db.run(insertUser, [userId, TEST_USER.nume, TEST_USER.email, hashedPassword, TEST_USER.rol], function(err) {
                            if (err) {
                                console.error('❌ Eroare inserare utilizator:', err);
                                db.close();
                                reject(err);
                                return;
                            }
                            
                            console.log('✅ Utilizator de test creat cu succes!');
                            console.log('📋 Detalii utilizator:');
                            console.log('  📧 Email:', TEST_USER.email);
                            console.log('  🔑 Parola:', TEST_USER.password);
                            console.log('  👤 Nume:', TEST_USER.nume);
                            console.log('  🏷️ Rol:', TEST_USER.rol);
                            console.log('  🆔 ID:', userId);
                        });
                    }

                    db.close((err) => {
                        if (err) {
                            console.error('❌ Eroare închidere BD:', err);
                        } else {
                            console.log('✅ Conexiune BD închisă');
                        }
                    });
                });
            } catch (error) {
                console.error('❌ Eroare generală:', error);
                db.close();
                reject(error);
            }
        }
    });
}

// Execută scriptul
if (require.main === module) {
    createTestUser()
        .then(() => {
            console.log('🎉 Script executat cu succes!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Eroare în script:', error);
            process.exit(1);
        });
}

module.exports = { createTestUser, TEST_USER };
