import crypto from 'crypto';

/**
 * Utilitar pentru gestionarea corectă a timpului conform best practices Azure SQL + MultiversX
 * 
 * 🇷🇴 STRATEGIE FINALĂ OPTIMIZATĂ:
 * 1. DataOraLogin/DataOraLogout = Ora locală României (DATETIME2) pentru afișare directă
 * 2. TimeStampLogin/TimeStampLogout = Unix timestamps UTC (BIGINT) pentru blockchain MultiversX
 * 3. CreatLa/ModificatLa = Ora locală României pentru auditare
 * 4. Gestionează DST automat prin Intl.DateTimeFormat cu timeZone: 'Europe/Bucharest'
 * 
 * ✅ BENEFICII:
 * - Afișare directă fără conversii în frontend
 * - Compatibilitate completă cu MultiversX blockchain
 * - Independență de locația serverului Azure (Suedia)
 * - Gestionare automată a orei de vară/iarnă
 */

/**
 * Verifică dacă suntem în perioada de timp de vară (DST)
 */
function isDaylightSavingTime(date: Date): boolean {
    // DST în Europa: ultima duminică din martie până ultima duminică din octombrie
    const year = date.getFullYear();
    
    // Ultima duminică din martie
    const march = new Date(year, 2, 31); // 31 martie
    const lastSundayMarch = new Date(march.getTime() - (march.getDay() * 24 * 60 * 60 * 1000));
    
    // Ultima duminică din octombrie
    const october = new Date(year, 9, 31); // 31 octombrie
    const lastSundayOctober = new Date(october.getTime() - (october.getDay() * 24 * 60 * 60 * 1000));
    
    return date >= lastSundayMarch && date < lastSundayOctober;
}

/**
 * Convertește orice dată la UTC REAL pentru normalizare
 * @param date - Data de convertit
 * @returns Date object în UTC
 */
export function toUTCTimestamp(date: Date): Date {
    // Folosim UTC-ul real al datei primite
    const utcTime = new Date(date.getTime());
    
    // Eliminăm milisecundele pentru compatibilitate SQL Server
    utcTime.setMilliseconds(0);
    
    return utcTime;
}

/**
 * ✅ DEPRECATED: Funcție păstrată pentru compatibilitate backward
 * Folosește getRomaniaLocalTime() pentru DataOraLogin/DataOraLogout
 * @returns Date object în UTC pentru backward compatibility
 */
export function getUTCTimestamp(): Date {
    // Obținem timpul curent UTC direct din JavaScript
    // Acesta este timpul universal coordonat, identic în întreaga lume
    const utcTime = new Date();
    
    // Eliminăm milisecundele pentru compatibilitate SQL Server
    utcTime.setMilliseconds(0);
    
    console.log(`🌍 UTC REAL pentru Azure SQL: ${utcTime.toISOString()}`);
    console.log(`🇷🇴 Afișare locală România: ${formatLocalTime(utcTime)}`);
    console.log(`🔢 Unix timestamp: ${Math.floor(utcTime.getTime() / 1000)}`);
    
    return utcTime;
}

/**
 * 🇷🇴 ROMÂNIA LOCAL TIME: Returnează timpul curent în ora României
 * ✅ PRINCIPAL: Pentru stocarea în coloanele DataOraLogin/DataOraLogout/CreatLa/ModificatLa
 * @returns Date object cu ora României pentru stocarea directă în baza de date
 */
export function getRomaniaLocalTime(): Date {
    const now = new Date();
    
    // Convertim la ora României folosind Intl API
    const romaniaFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = romaniaFormatter.formatToParts(now);
    const romaniaDateString = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    
    const romaniaTime = new Date(romaniaDateString);
    
    console.log(`🇷🇴 Ora locală România (pentru DB): ${formatLocalTime(romaniaTime)}`);
    
    return romaniaTime;
}

/**
 * 🇷🇴 ROMÂNIA LOCAL TIME: Convertește orice dată la ora României pentru afișare
 * @param date - Data de convertit
 * @returns Date object cu ora României
 */
export function toRomaniaLocalTime(date: Date): Date {
    const romaniaFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = romaniaFormatter.formatToParts(date);
    const romaniaDateString = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    
    return new Date(romaniaDateString);
}

/**
 * Formatează o dată din DB pentru afișare locală
 * @param dbDate - Data din baza de date
 * @returns String formatat pentru timezone local
 */
export function formatLocalTime(dbDate: Date | string): string {
    const date = typeof dbDate === 'string' ? new Date(dbDate) : dbDate;
    
    // Formatează data pentru România
    return date.toLocaleString('ro-RO', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Returnează timestamp-ul pentru blockchain în UTC
 * CONSISTENT cu best practices pentru blockchain MultiversX
 * @returns ISO string în UTC pentru blockchain
 */
export function getBlockchainTimestamp(): string {
    // Folosim UTC pentru blockchain (best practice)
    const utcTime = getUTCTimestamp();
    
    // Returnăm direct string-ul ISO în UTC
    return utcTime.toISOString();
}

/**
 * 🚀 MultiversX COMPATIBILITY: Returnează Unix timestamp în UTC
 * Perfect pentru blockchain MultiversX care folosește timp în secunde de la Epoch
 * @returns Unix timestamp în secunde (UTC)
 */
export function getUnixTimestamp(): number {
    const utcTime = getUTCTimestamp();
    return Math.floor(utcTime.getTime() / 1000);
}

/**
 * 🚀 MultiversX COMPATIBILITY: Convertește Date la Unix timestamp
 * @param date - Data de convertit
 * @returns Unix timestamp în secunde (UTC)
 */
export function toUnixTimestamp(date: Date): number {
    const utcTime = toUTCTimestamp(date);
    return Math.floor(utcTime.getTime() / 1000);
}

/**
 * 🚀 MultiversX COMPATIBILITY: Convertește Unix timestamp la Date
 * @param unixTimestamp - Unix timestamp în secunde
 * @returns Date object în UTC
 */
export function fromUnixTimestamp(unixTimestamp: number): Date {
    return new Date(unixTimestamp * 1000);
}

/**
 * Calculează durata între două timestamp-uri în minute
 * @param start - Timestamp de început
 * @param end - Timestamp de sfârșit (opțional, default: acum)
 * @returns Durata în minute
 */
export function calculateDurationMinutes(start: Date | string, end?: Date | string): number {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = end ? (typeof end === 'string' ? new Date(end) : end) : new Date();
    
    return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
}

/**
 * Validează și corectează timezone-ul pentru o dată
 * @param date - Data de validat
 * @returns Data corectată în UTC
 */
export function validateAndCorrectTimezone(date: Date | string): Date {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    
    // Verifică dacă data este validă
    if (isNaN(parsedDate.getTime())) {
        throw new Error('Data furnizată nu este validă');
    }
    
    // Returnează data în UTC
    return new Date(parsedDate.toISOString());
}

/**
 * Generează hash-ul pentru blockchain bazat pe timestamp și date de sesiune
 * @param userId - ID-ul utilizatorului
 * @param timestamp - Timestamp-ul sesiunii
 * @param action - Acțiunea (login/logout)
 * @returns Hash pentru blockchain
 */
export function generateSessionHash(userId: string, timestamp: string, action: 'login' | 'logout'): string {
    const data = `${userId}-${timestamp}-${action}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 🚀 MultiversX COMPATIBILITY: Generează hash-ul pentru blockchain cu Unix timestamp
 * Perfect pentru sincronizarea cu MultiversX blockchain
 * @param userId - ID-ul utilizatorului
 * @param unixTimestamp - Unix timestamp în secunde (UTC)
 * @param action - Acțiunea (login/logout)
 * @returns Hash pentru blockchain MultiversX
 */
export function generateMultiversXHash(userId: string, unixTimestamp: number, action: 'login' | 'logout'): string {
    const data = `${userId}-${unixTimestamp}-${action}`;
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * 🚀 MultiversX COMPATIBILITY: Generează payload pentru tranzacție blockchain
 * @param sessionData - Datele sesiunii
 * @returns Payload formatat pentru MultiversX
 */
export function generateMultiversXPayload(sessionData: {
    userId: string;
    sessionId: string;
    action: 'login' | 'logout';
    timestamp?: number;
}): {
    timestamp: number;
    hash: string;
    payload: string;
} {
    const unixTimestamp = sessionData.timestamp || getUnixTimestamp();
    const hash = generateMultiversXHash(sessionData.userId, unixTimestamp, sessionData.action);
    
    const payload = JSON.stringify({
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        action: sessionData.action,
        timestamp: unixTimestamp,
        hash: hash
    });
    
    return {
        timestamp: unixTimestamp,
        hash: hash,
        payload: Buffer.from(payload).toString('base64')
    };
}

/**
 * Determină offset-ul în milisecunde pentru timezone-ul României (Europe/Bucharest)
 * @returns Offset-ul în milisecunde
 */
export function getRomanianTimezoneOffset(): number {
    // Calculăm diferența între ora locală și ora României
    const now = new Date();
    
    // Obținem ora locală a serverului în milisecunde
    const localTime = now.getTime();
    
    // Convertim la string în timezone-ul României și apoi înapoi la Date
    const romanianTimeStr = now.toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
    const romanianTime = new Date(romanianTimeStr).getTime();
    
    // Returnăm diferența (poate fi pozitivă sau negativă)
    return romanianTime - localTime;
}
