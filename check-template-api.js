import fetch from 'node-fetch';

async function checkTemplate() {
    try {
        console.log('🔍 Verificare template cu ID: d9ef8c09-a326-470b-a4da-3cd460ff5c08');
        
        // Încearcă să obții template-ul prin API
        const response = await fetch('http://localhost:5000/api/templates/d9ef8c09-a326-470b-a4da-3cd460ff5c08', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Token-ul ar trebui să fie prezent aici, dar pentru test mergem fără
            }
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            const template = data.data;
            console.log('✅ Template găsit prin API:');
            console.log('   Nume:', template.NumeSablon);
            console.log('   Categorie:', template.CategorieSablon);
            console.log('   Tip:', template.TipSablon);
            console.log('   Activ:', template.Activ);
            console.log('   Preview:', template.ContinutSablon.substring(0, 200) + '...');
        } else {
            console.log('❌ Template nu a fost găsit prin API!');
            console.log('   Status:', response.status);
            console.log('   Message:', data.message || 'Unknown error');
            
            // Încearcă să obții toate template-urile
            const allTemplatesResponse = await fetch('http://localhost:5000/api/templates', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (allTemplatesResponse.ok) {
                const allData = await allTemplatesResponse.json();
                if (allData.success) {
                    console.log('\n📋 Template-uri disponibile:');
                    allData.data.forEach(t => {
                        console.log(`   - ${t.IdSablon}: ${t.NumeSablon} (${t.CategorieSablon}, ${t.TipSablon})`);
                    });
                    
                    // Filtrează pentru categoria "fișe"
                    const fiseTemplates = allData.data.filter(t => 
                        t.CategorieSablon === 'fișe' || t.CategorieSablon === 'fise'
                    );
                    
                    console.log('\n🔍 Template-uri pentru categoria "fișe":');
                    if (fiseTemplates.length > 0) {
                        fiseTemplates.forEach(t => {
                            console.log(`   - ${t.IdSablon}: ${t.NumeSablon}`);
                        });
                    } else {
                        console.log('   Niciun template pentru categoria "fișe"');
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Eroare:', error.message);
    }
}

checkTemplate();
