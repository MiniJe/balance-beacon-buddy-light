import dotenv from 'dotenv';
dotenv.config();

import { pool, initializePool } from '../config/azure';

async function cleanupDatabaseSafe() {
    try {
        await initializePool();
        await pool.connect();
        
        console.log('🧹 Începere cleanup database...\n');
        
        // Pentru tabelele cu IDENTITY - putem folosi TRUNCATE
        const tabeleCuIdentity = ['JurnalDocumenteEmise'];
        
        for (const tableName of tabeleCuIdentity) {
            console.log(`🗑️ Golire tabel ${tableName} (cu IDENTITY)...`);
            
            try {
                // Verifică dacă tabelul are înregistrări
                const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM ${tableName}`);
                const totalRows = countResult.recordset[0].total;
                
                if (totalRows > 0) {
                    // Folosește TRUNCATE pentru resetarea IDENTITY
                    await pool.request().query(`TRUNCATE TABLE ${tableName}`);
                    console.log(`  ✅ ${tableName}: ${totalRows} înregistrări șterse, IDENTITY resetat`);
                } else {
                    console.log(`  ℹ️ ${tableName}: tabelul este deja gol`);
                }
            } catch (error) {
                console.error(`  ❌ Eroare la golirea ${tableName}:`, error);
            }
        }
        
        // Pentru tabelele fără IDENTITY - folosim DELETE
        const tabeleFaraIdentity = ['JurnalEmail', 'JurnalCereriConfirmare', 'JurnalSesiuni'];
        
        for (const tableName of tabeleFaraIdentity) {
            console.log(`🗑️ Golire tabel ${tableName} (fără IDENTITY)...`);
            
            try {
                // Verifică dacă tabelul are înregistrări
                const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM ${tableName}`);
                const totalRows = countResult.recordset[0].total;
                
                if (totalRows > 0) {
                    // Folosește DELETE pentru tabelele fără IDENTITY
                    const deleteResult = await pool.request().query(`DELETE FROM ${tableName}`);
                    console.log(`  ✅ ${tableName}: ${totalRows} înregistrări șterse`);
                } else {
                    console.log(`  ℹ️ ${tableName}: tabelul este deja gol`);
                }
            } catch (error) {
                console.error(`  ❌ Eroare la golirea ${tableName}:`, error);
            }
        }
        
        console.log('\n🎉 Cleanup database complet!');
        
        // Verifică rezultatele finale
        console.log('\n📊 Status final tabele:');
        const allTables = [...tabeleCuIdentity, ...tabeleFaraIdentity];
        
        for (const tableName of allTables) {
            try {
                const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM ${tableName}`);
                const totalRows = countResult.recordset[0].total;
                console.log(`  ${tableName}: ${totalRows} înregistrări`);
            } catch (error) {
                console.log(`  ${tableName}: eroare la verificare`);
            }
        }
        
        await pool.close();
        
    } catch (error) {
        console.error('❌ Eroare la cleanup database:', error);
    }
}

cleanupDatabaseSafe().catch(console.error);
