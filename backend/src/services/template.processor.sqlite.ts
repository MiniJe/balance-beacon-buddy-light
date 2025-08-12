import { getDatabase } from '../config/sqlite';

/**
 * Serviciu separat pentru procesarea și înlocuirea variabilelor în șabloane de email
 * (NU folosiți în template.service.sqlite.ts)
 */
export class EmailTemplateProcessor {
    /**
     * Procesează un șablon cu datele partenerului
     * @param templateContent conținutul șablonului (string)
     * @param partnerData datele pentru înlocuire
     * @returns string cu variabilele înlocuite
     */
    static async processTemplateContent(templateContent: string, partnerData: any): Promise<string> {
        const pick = (...vals: any[]) => vals.find(v => v !== undefined && v !== null && String(v).trim() !== '') ?? '';

        // 🔧 Deducem compania emitentă în funcție de categoria documentului (DUC vs DL)
        const rawCategory = (partnerData.partnerCategory || partnerData.tipTemplateDocx || partnerData.tipPartener || '').toString().toLowerCase();
        let derivedCompanyName: string;
        if (rawCategory.includes('duc')) {
            derivedCompanyName = 'DUCFARM S.R.L.';
        } else if (rawCategory.includes('dl')) {
            derivedCompanyName = 'DUCFARM LOGISTIC S.R.L.';
        } else {
            derivedCompanyName = 'DUCFARM S.R.L.';
        }
        const explicitName = pick(partnerData.numeCompanie, partnerData.companyName);
        if (explicitName) {
            derivedCompanyName = explicitName;
        }

        // Obține variabilele definite în tabelul VariabileSabloane (în DB sunt stocate cu paranteze [])
        const db = await getDatabase();
        const dbRows = await db.all(`SELECT NumeVariabila FROM VariabileSabloane WHERE Activa = 1`);
        // Normalizăm: scoatem parantezele exterioare dacă există => [NUME_PARTENER] -> NUME_PARTENER
        const variableNames = dbRows
            .map((r: any) => (r.NumeVariabila || '').trim())
            .filter((v: string) => v.length > 0)
            .map((v: string) => v.replace(/^\[/, '').replace(/\]$/, ''));
        // Set pentru căutare rapidă
        const variableNameSet = new Set(variableNames);

        // Construiește map pentru TOATE variabilele; folosește fallback-uri doar pentru câteva speciale
        const tokenValues: Record<string, string> = {};
        for (const varName of variableNames) {
            let value = '';
            // Acceptă cheie fără și cu bracket în partnerData (defensiv)
            const direct = partnerData[varName];
            const bracketed = partnerData[`[${varName}]`];
            if (direct !== undefined && direct !== null && String(direct).trim() !== '') {
                value = String(direct);
            } else if (bracketed !== undefined && bracketed !== null && String(bracketed).trim() !== '') {
                value = String(bracketed);
            }
            if (!value) {
                switch (varName) {
                    case 'NUME_COMPANIE':
                        value = derivedCompanyName;
                        break;
                    case 'DATA':
                    case 'DATA_CURENTA':
                        value = pick(partnerData.dataActuala, new Date().toLocaleDateString('ro-RO'));
                        break;
                    case 'PERIOADA':
                    case 'PERIOADA_CONFIRMARE':
                        value = pick(partnerData.perioadaConfirmare, partnerData.dataSold, partnerData.PERIOADA, '');
                        break;
                    case 'DATA_TRIMITERE':
                        value = pick(partnerData.dataTrimitere, new Date().toLocaleDateString('ro-RO'));
                        break;
                }
            }
            tokenValues[varName] = value || '';
        }

        const originalContent = templateContent;
        let processedContent = templateContent;
        function escapeRegex(str: string) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        const missingVars: string[] = [];
        for (const [token, value] of Object.entries(tokenValues)) {
            const esc = escapeRegex(token);
            const patternCurly = new RegExp(`\\{${esc}\\}`, 'g');
            const patternSquare = new RegExp(`\\[${esc}\\]`, 'g');
            processedContent = processedContent.replace(patternCurly, value);
            processedContent = processedContent.replace(patternSquare, value);
            if (value === '' && (new RegExp(`\\{${esc}\\}`).test(originalContent) || new RegExp(`\\[${esc}\\]`).test(originalContent))) {
                missingVars.push(token);
            }
        }

        // Detectăm variabile definite care au rămas neînlocuite
        const unresolved: string[] = [];
        for (const name of variableNames) {
            const esc = escapeRegex(name);
            if (new RegExp(`\\{${esc}\\}`).test(processedContent) || new RegExp(`\\[${esc}\\]`).test(processedContent)) {
                unresolved.push(name);
            }
        }

        // Detectăm orice alți tokeni UPPER_CASE rămași (posibil erori în template). Extragem fără paranteze.
        const genericLeftovers = Array.from(new Set(
            (processedContent.match(/[\[{]([A-Z0-9_]+)[\]}]/g) || []).map(m => m.replace(/[\[{\]}]/g, ''))
        ));
        // Tokeni care nu sunt parte din lista oficială
        const unknownTokens = genericLeftovers.filter(t => !variableNameSet.has(t));

        if (missingVars.length > 0 || unresolved.length > 0 || unknownTokens.length > 0) {
            const msg = `[EmailTemplateProcessor] Eroare validare: variabile fără valoare: ${JSON.stringify(missingVars)}; placeholdere neînlocuite: ${JSON.stringify(unresolved)}; tokeni necunoscuți în șablon: ${JSON.stringify(unknownTokens)}`;
            console.error(msg);
            throw new Error(msg);
        }

        return processedContent;
    }
}
