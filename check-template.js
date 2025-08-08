import { pool } from './backend/src/config/azure.js';

async function checkTemplate() {
    try {
        console.log('🔍 Verificare template cu ID: d9ef8c09-a326-470b-a4da-3cd460ff5c08');
        
        const request = pool.request();
        const result = await request
            .input('TemplateId', 'd9ef8c09-a326-470b-a4da-3cd460ff5c08')
            .query(`
                SELECT 
                    IdSablon,
                    NumeSablon,
                    CategorieSablon,
                    TipSablon,
                    Activ,
                    LEFT(ContinutSablon, 200) as PreviewContent
                FROM EmailSabloane 
                WHERE IdSablon = @TemplateId
            `);

        if (result.recordset.length > 0) {
            const template = result.recordset[0];
            console.log('✅ Template găsit:');
            console.log('   Nume:', template.NumeSablon);
            console.log('   Categorie:', template.CategorieSablon);
            console.log('   Tip:', template.TipSablon);
            console.log('   Activ:', template.Activ);
            console.log('   Preview:', template.PreviewContent + '...');
        } else {
            console.log('❌ Template nu a fost găsit!');
            
            // Să vedem ce template-uri există pentru categoria "fișe"
            const allFiseTemplates = await request.query(`
                SELECT IdSablon, NumeSablon, CategorieSablon, TipSablon, Activ
                FROM EmailSabloane 
                WHERE CategorieSablon = 'fișe' OR CategorieSablon = 'fise'
                ORDER BY CreatLa DESC
            `);
            
            console.log('\n🔍 Template-uri disponibile pentru categoria "fișe":');
            if (allFiseTemplates.recordset.length > 0) {
                allFiseTemplates.recordset.forEach(t => {
                    console.log(`   - ${t.IdSablon}: ${t.NumeSablon} (${t.CategorieSablon}, ${t.TipSablon}, Activ: ${t.Activ})`);
                });
            } else {
                console.log('   Niciun template găsit pentru categoria "fișe"');
                
                // Să vedem toate categoriile disponibile
                const categories = await request.query(`
                    SELECT DISTINCT CategorieSablon, COUNT(*) as Count
                    FROM EmailSabloane
                    GROUP BY CategorieSablon
                    ORDER BY CategorieSablon
                `);
                
                console.log('\n📊 Categorii disponibile:');
                categories.recordset.forEach(c => {
                    console.log(`   - ${c.CategorieSablon}: ${c.Count} template-uri`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Eroare:', error);
    } finally {
        // Închide conexiunea
        process.exit(0);
    }
}

checkTemplate();
