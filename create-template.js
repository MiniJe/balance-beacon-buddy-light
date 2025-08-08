// Script pentru a verifica template-urile existente în EmailSabloane
import fetch from 'node-fetch';

async function checkEmailSabloane() {
    try {
        console.log('🔍 Verificare template-uri din categoria GENERAL pentru fișă partener...');
        
        // Încearcă să obții toate template-urile
        const response = await fetch('http://localhost:5000/api/templates', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('\n📋 Toate template-urile disponibile:');
                data.data.forEach(t => {
                    console.log(`   - ${t.IdSablon}: ${t.NumeSablon} (${t.CategorieSablon}, ${t.TipSablon}, Activ: ${t.Activ})`);
                });
                
                // Filtrează pentru categoria "GENERAL"
                const generalTemplates = data.data.filter(t => 
                    t.CategorieSablon === 'general' || t.CategorieSablon === 'GENERAL'
                );
                
                console.log('\n🔍 Template-uri din categoria GENERAL:');
                if (generalTemplates.length > 0) {
                    generalTemplates.forEach(t => {
                        console.log(`   ✅ ${t.IdSablon}: ${t.NumeSablon}`);
                        if (t.NumeSablon.toLowerCase().includes('fișă') || 
                            t.NumeSablon.toLowerCase().includes('fisa') ||
                            t.NumeSablon.toLowerCase().includes('partener')) {
                            console.log(`      👆 ACESTA pare să fie pentru fișă partener!`);
                        }
                    });
                } else {
                    console.log('   Niciun template în categoria GENERAL');
                }
                
                // Caută specific template-uri care conțin "fișă" sau "partener"
                const fiseTemplates = data.data.filter(t => 
                    t.NumeSablon.toLowerCase().includes('fișă') || 
                    t.NumeSablon.toLowerCase().includes('fisa') ||
                    t.NumeSablon.toLowerCase().includes('partener')
                );
                
                console.log('\n🎯 Template-uri care conțin "fișă" sau "partener":');
                if (fiseTemplates.length > 0) {
                    fiseTemplates.forEach(t => {
                        console.log(`   🎯 ${t.IdSablon}: ${t.NumeSablon} (${t.CategorieSablon})`);
                    });
                } else {
                    console.log('   Niciun template găsit cu "fișă" sau "partener"');
                }
            }
        } else {
            console.log('❌ Eroare la obținerea template-urilor:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Eroare:', error.message);
    }
}

checkEmailSabloane();
