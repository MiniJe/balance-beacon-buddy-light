import { getDatabase } from '../config/sqlite';
import { v7 as uuidv7 } from 'uuid';
import bcrypt from 'bcrypt';
import { EmailService } from './email.service';
import { CreateContabilDto, ContabilResponse, Contabil, PermisiuniContabil, SchimbareParolaContabilDto } from '../models/Contabil';

interface RawSQLiteContabilRow {
  IdContabil?: string;
  NumeContabil?: string;
  PrenumeContabil?: string;
  EmailContabil?: string;
  TelefonContabil?: string;
  DepartmentContabil?: string;
  RolContabil?: string;
  StatusContabil?: string;
  DataUltimeiLogari?: string; // variant fără diacritice
  DataUltimeiLogări?: string; // variant cu diacritice
  DatăCreareContabil?: string;
  DataCreare?: string;
  ContabilCreatDe?: string;
  CreatDe?: string;
  DataActualizării?: string;
  DataActualizare?: string;
  ActualizatDE?: string;
  ActualizatDe?: string;
  SchimbareParolaLaLogare?: number | boolean;
    PermisiuniAcces?: string; // JSON text
    PermisiuniSpeciale?: string; // variant veche de coloană
}

export class ContabilSQLiteService {
  /** Determină coloana folosită pentru timestamp actualizare (manevrează variante cu/ fără diacritice) */
  private static async resolveUpdateTimestampColumn(db: any): Promise<string> {
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const names = pragma.map(c => c.name);
    const preferredOrder = ['DataActualizării', 'DataActualizare', 'DataActualizarii'];
    for (const col of preferredOrder) {
      if (names.includes(col)) return col;
    }
    // Dacă nu există nicio coloană, adăugăm una fără diacritice pentru simplitate
    try {
      await db.exec("ALTER TABLE Contabili ADD COLUMN DataActualizare TEXT");
      return 'DataActualizare';
    } catch (e) {
      console.warn('⚠️  Nu am putut adăuga coloana DataActualizare:', e);
      // fallback: folosim un alias dummy -> nu va fi salvat
      return 'DataActualizare';
    }
  }
  /**
   * Map raw row (with possible diacritic variants) to unified response
   */
  private static mapRow(r: RawSQLiteContabilRow): ContabilResponse {
    let permisiuni: any = {
      PoateModificaParteneri: false,
      PoateAdaugaParteneri: false,
      PoateVedeaRapoarte: false,
      PoateModificaSabloane: false,
      PoateCreaCereri: false,
      PoateAdaugaUtilizatori: false,
      PoateModificaSetari: false
    };
    const rawPerm = r.PermisiuniAcces || r.PermisiuniSpeciale;
    if (rawPerm) {
      try {
      const parsed = JSON.parse(rawPerm);
        permisiuni = { ...permisiuni, ...parsed };
      } catch (e) {
        console.warn('⚠️  Eroare parsare PermisiuniAcces (ignor, folosesc default):', e);
      }
    }
    return {
      IdContabil: r.IdContabil!,
      NumeContabil: r.NumeContabil!,
      PrenumeContabil: r.PrenumeContabil!,
      EmailContabil: r.EmailContabil!,
      TelefonContabil: r.TelefonContabil,
      DepartmentContabil: r.DepartmentContabil,
      RolContabil: r.RolContabil || 'CONTABIL',
      StatusContabil: r.StatusContabil || 'Activ',
      DataUltimeiLogări: (r as any).DataUltimeiLogări || r.DataUltimeiLogari ? new Date(((r as any).DataUltimeiLogări || r.DataUltimeiLogari) as string) : undefined,
      DatăCreareContabil: new Date(r.DatăCreareContabil || r.DataCreare || new Date().toISOString()),
      ContabilCreatDe: r.ContabilCreatDe || r.CreatDe || 'System',
      DataActualizării: (r.DataActualizării || r.DataActualizare) ? new Date(r.DataActualizării || r.DataActualizare as string) : undefined,
      ActualizatDE: r.ActualizatDE || r.ActualizatDe,
      SchimbareParolaLaLogare: r.SchimbareParolaLaLogare === 1 || r.SchimbareParolaLaLogare === true,
      PermisiuniAcces: permisiuni,
      PermisiuniContabil: permisiuni
    };
  }

  /** Obține toți contabilii (excluzând marcați șters) */
  static async getAllContabili(): Promise<ContabilResponse[]> {
    const db = await getDatabase();
    const rows: RawSQLiteContabilRow[] = await db.all(`
      SELECT * FROM Contabili
      WHERE COALESCE(StatusContabil,'Activ') NOT IN ('Șters','Sters')
      ORDER BY NumeContabil, PrenumeContabil
    `);

    return rows.map(r => this.mapRow(r));
  }

  /** Verifică existența email-ului */
  static async checkEmailExists(email: string): Promise<boolean> {
    const db = await getDatabase();
    const row = await db.get(`SELECT 1 as ok FROM Contabili WHERE lower(EmailContabil)=lower(?) LIMIT 1`, [email]);
    return !!row;
  }

  /** Creează un contabil nou în SQLite */
  static async createContabil(data: CreateContabilDto, emailSvc: EmailService): Promise<ContabilResponse> {
    const {
      NumeContabil,
      PrenumeContabil,
      EmailContabil,
      RolContabil = 'CONTABIL',
      StatusContabil = 'Activ',
      TelefonContabil,
      DepartmentContabil,
      PermisiuniAcces
    } = data;

    // Validări minime
    if (!NumeContabil || !PrenumeContabil || !EmailContabil) {
      throw new Error('Date obligatorii lipsă');
    }
    const exists = await this.checkEmailExists(EmailContabil);
    if (exists) {
      throw new Error('Există deja un contabil cu acest email');
    }

    const id = uuidv7().toUpperCase();
    const password = data.Parola || this.generatePassword();
    const hash = await bcrypt.hash(password, 10);
    const permJson = JSON.stringify(PermisiuniAcces || {
      PoateModificaParteneri: false,
      PoateAdaugaParteneri: false,
      PoateVedeaRapoarte: false,
      PoateModificaSabloane: false,
      PoateCreaCereri: false,
      PoateAdaugaUtilizatori: false,
      PoateModificaSetari: false
    });
    const nowIso = new Date().toISOString();

    const db = await getDatabase();
    // Construiește dinamic coloanele (în cazul unor baze vechi fără Telefon/Departament)
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const colNames = pragma.map(c => c.name);
    // Determină numele coloanei pentru permisiuni (nou: PermisiuniAcces, vechi: PermisiuniSpeciale)
    const permColumn = colNames.includes('PermisiuniAcces') ? 'PermisiuniAcces' : (colNames.includes('PermisiuniSpeciale') ? 'PermisiuniSpeciale' : 'PermisiuniAcces');
    const baseCols = [
      'IdContabil','NumeContabil','PrenumeContabil','EmailContabil','RolContabil','StatusContabil','DatăCreareContabil','ContabilCreatDe','ParolaHashContabil','SchimbareParolaLaLogare',permColumn
    ];
    const optionalCols: string[] = [];
    if (colNames.includes('TelefonContabil')) optionalCols.push('TelefonContabil');
    if (colNames.includes('DepartmentContabil')) optionalCols.push('DepartmentContabil');
    const allCols = [...baseCols.slice(0,4), ...optionalCols, ...baseCols.slice(4)];
    const placeholders = allCols.map(()=>'?').join(',');
    const values: any[] = [];
    allCols.forEach(c => {
      switch(c){
        case 'IdContabil': values.push(id); break;
        case 'NumeContabil': values.push(NumeContabil); break;
        case 'PrenumeContabil': values.push(PrenumeContabil); break;
        case 'EmailContabil': values.push(EmailContabil); break;
        case 'TelefonContabil': values.push(TelefonContabil || null); break;
        case 'DepartmentContabil': values.push(DepartmentContabil || null); break;
        case 'RolContabil': values.push(RolContabil); break;
        case 'StatusContabil': values.push(StatusContabil); break;
        case 'DatăCreareContabil': values.push(nowIso); break;
        case 'ContabilCreatDe': values.push('System'); break;
        case 'ParolaHashContabil': values.push(hash); break;
        case 'SchimbareParolaLaLogare': values.push(1); break;
  case 'PermisiuniAcces':
  case 'PermisiuniSpeciale': values.push(permJson); break;
        default: values.push(null);
      }
    });
    const insertSql = `INSERT INTO Contabili (${allCols.join(',')}) VALUES (${placeholders})`;
    await db.run(insertSql, values);

    // Trimite email credențiale
    try {
      await emailSvc.sendEmail({
        to: EmailContabil,
        subject: 'Cont creat - Balance Beacon Buddy',
        html: `
                    <h1>Bine ai venit la Balance Beacon Buddy!</h1>
                    <p>Contul tău de contabil a fost creat cu succes. Email: ${EmailContabil}</p>
                    <p>Parolă: ${password}</p>
                    <p>La prima conectare va trebui să îți schimbi parola.</p>
                    <p>Acces aplicație: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">${process.env.FRONTEND_URL || 'http://localhost:3000'}</a></p>
                    <p>Mulțumim,<br>Echipa Balance Beacon Buddy</p>
                `
      });
    } catch (e) {
      console.warn('⚠️  Eroare trimitere email creare contabil (continui):', e);
    }

    const row: RawSQLiteContabilRow = {
      IdContabil: id,
      NumeContabil,
      PrenumeContabil,
      EmailContabil,
      TelefonContabil,
      DepartmentContabil,
      RolContabil,
      StatusContabil,
      DatăCreareContabil: nowIso,
      ContabilCreatDe: 'System',
      SchimbareParolaLaLogare: 1,
      PermisiuniAcces: permJson
    };
    return this.mapRow(row);
  }

  /** Obține contabil după ID */
  static async getContabilById(id: string): Promise<ContabilResponse | null> {
    const db = await getDatabase();
    const r: RawSQLiteContabilRow | undefined = await db.get(`
      SELECT * FROM Contabili WHERE IdContabil = ? AND COALESCE(StatusContabil,'Activ') NOT IN ('Șters','Sters')
    `, [id]);
    return r ? this.mapRow(r) : null;
  }

  /** Update generic */
  static async updateContabil(id: string, updates: Partial<Contabil>): Promise<ContabilResponse> {
    const db = await getDatabase();
    const existing = await db.get(`SELECT * FROM Contabili WHERE IdContabil = ?`, [id]);
    if (!existing) throw new Error('Contabilul nu există');
  const tsCol = await this.resolveUpdateTimestampColumn(db);
    // Detectăm coloana pentru "ActualizatDE" dacă există (în unele versiuni lipsește)
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const actualizatCol = pragma.find(c => c.name === 'ActualizatDE')
      ? 'ActualizatDE'
      : (pragma.find(c => c.name === 'ActualizatDe') ? 'ActualizatDe' : null);

    const fields: string[] = [];
    const values: any[] = [];
    const push = (sqlFrag: string, val: any) => { fields.push(sqlFrag); values.push(val); };

    if (updates.NumeContabil !== undefined) push('NumeContabil = ?', updates.NumeContabil);
    if (updates.PrenumeContabil !== undefined) push('PrenumeContabil = ?', updates.PrenumeContabil);
    if (updates.EmailContabil !== undefined) push('EmailContabil = ?', updates.EmailContabil);
    if (updates.TelefonContabil !== undefined) push('TelefonContabil = ?', updates.TelefonContabil);
    if (updates.DepartmentContabil !== undefined) push('DepartmentContabil = ?', updates.DepartmentContabil);
    if (updates.RolContabil !== undefined) push('RolContabil = ?', updates.RolContabil);
    if (updates.StatusContabil !== undefined) push('StatusContabil = ?', updates.StatusContabil);
    if ((updates as any).PermisiuniAcces !== undefined) {
      const perm = typeof (updates as any).PermisiuniAcces === 'string' ? (updates as any).PermisiuniAcces : JSON.stringify((updates as any).PermisiuniAcces);
      push('PermisiuniAcces = ?', perm);
    }
    if (fields.length === 0) throw new Error('Nu există câmpuri de actualizat');
  push(`${tsCol} = ?`, new Date().toISOString());
  if (actualizatCol) push(`${actualizatCol} = ?`, 'System');
    values.push(id);
    const sqlUpdate = `UPDATE Contabili SET ${fields.join(', ')} WHERE IdContabil = ?`;
    await db.run(sqlUpdate, values);
    const refreshed = await db.get(`SELECT * FROM Contabili WHERE IdContabil = ?`, [id]);
    return this.mapRow(refreshed);
  }

  /** Set status (activ / inactiv) */
  static async setStatus(id: string, active: boolean): Promise<void> {
    const db = await getDatabase();
    const exists = await db.get(`SELECT 1 as ok FROM Contabili WHERE IdContabil = ?`, [id]);
    if (!exists) throw new Error('Contabilul nu există');
    const tsCol = await this.resolveUpdateTimestampColumn(db);
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const actualizatCol = pragma.find(c => c.name === 'ActualizatDE')
      ? 'ActualizatDE'
      : (pragma.find(c => c.name === 'ActualizatDe') ? 'ActualizatDe' : null);
    const sets = [`StatusContabil = ?`, `${tsCol} = ?`];
    const values: any[] = [active ? 'Activ' : 'Inactiv', new Date().toISOString()];
    if (actualizatCol) { sets.push(`${actualizatCol} = ?`); values.push('System'); }
    values.push(id);
    await db.run(`UPDATE Contabili SET ${sets.join(', ')} WHERE IdContabil = ?`, values);
  }

  /** Soft delete (StatusContabil = 'Șters') */
  static async deleteContabil(id: string): Promise<boolean> {
    const db = await getDatabase();
    const exists = await db.get(`SELECT 1 as ok FROM Contabili WHERE IdContabil = ?`, [id]);
    if (!exists) throw new Error('Contabilul nu există');
    const tsCol = await this.resolveUpdateTimestampColumn(db);
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const actualizatCol = pragma.find(c => c.name === 'ActualizatDE')
      ? 'ActualizatDE'
      : (pragma.find(c => c.name === 'ActualizatDe') ? 'ActualizatDe' : null);
    const sets = [`StatusContabil = 'Șters'`, `${tsCol} = ?`];
    const values: any[] = [new Date().toISOString()];
    if (actualizatCol) { sets.push(`${actualizatCol} = ?`); values.push('System'); }
    values.push(id);
    await db.run(`UPDATE Contabili SET ${sets.join(', ')} WHERE IdContabil = ?`, values);
    return true;
  }

  /** Resetare parolă */
  static async resetPassword(id: string, emailSvc: EmailService): Promise<void> {
    const db = await getDatabase();
    const r = await db.get(`SELECT EmailContabil FROM Contabili WHERE IdContabil = ?`, [id]);
    if (!r) throw new Error('Contabilul nu există');
    const newPassword = this.generatePassword();
    const hash = await bcrypt.hash(newPassword, 10);
    const tsCol = await this.resolveUpdateTimestampColumn(db);
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const actualizatCol = pragma.find(c => c.name === 'ActualizatDE')
      ? 'ActualizatDE'
      : (pragma.find(c => c.name === 'ActualizatDe') ? 'ActualizatDe' : null);
    const sets = [`ParolaHashContabil = ?`, `SchimbareParolaLaLogare = 1`, `${tsCol} = ?`];
    const values: any[] = [hash, new Date().toISOString()];
    if (actualizatCol) { sets.push(`${actualizatCol} = ?`); values.push('System'); }
    values.push(id);
    await db.run(`UPDATE Contabili SET ${sets.join(', ')} WHERE IdContabil = ?`, values);
    try {
      await emailSvc.sendEmail({
        to: r.EmailContabil,
        subject: 'Parolă resetată - Balance Beacon Buddy',
        html: `<h1>Parola a fost resetată</h1><p>Parola nouă temporară: <b>${newPassword}</b></p><p>Schimbă parola după autentificare.</p>`
      });
    } catch (e) {
      console.warn('⚠️  Eroare trimitere email resetare parola (continui):', e);
    }
  }

  /** Schimbă parola (contabil însuși) */
  static async changePassword(data: SchimbareParolaContabilDto): Promise<void> {
    const { IdContabil, ParolaVeche, ParolaNoua } = data;
    const db = await getDatabase();
    const r: any = await db.get(`SELECT ParolaHashContabil FROM Contabili WHERE IdContabil = ? AND StatusContabil = 'Activ'`, [IdContabil]);
    if (!r) throw new Error('Contabilul nu există');
    const valid = await bcrypt.compare(ParolaVeche, r.ParolaHashContabil);
    if (!valid) throw new Error('Parola curentă este incorectă');
    const hash = await bcrypt.hash(ParolaNoua, 10);
    const tsCol = await this.resolveUpdateTimestampColumn(db);
    const pragma: any[] = await db.all("PRAGMA table_info(Contabili)");
    const actualizatCol = pragma.find(c => c.name === 'ActualizatDE')
      ? 'ActualizatDE'
      : (pragma.find(c => c.name === 'ActualizatDe') ? 'ActualizatDe' : null);
    const sets = [`ParolaHashContabil = ?`, `SchimbareParolaLaLogare = 0`, `${tsCol} = ?`];
    const values: any[] = [hash, new Date().toISOString()];
    if (actualizatCol) { sets.push(`${actualizatCol} = ?`); values.push('System'); }
    values.push(IdContabil);
    await db.run(`UPDATE Contabili SET ${sets.join(', ')} WHERE IdContabil = ?`, values);
  }

  /** Generator parolă */
  private static generatePassword(length = 12): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*()_+';
    const all = upper + lower + digits + special;
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    let pwd = pick(upper) + pick(lower) + pick(digits) + pick(special);
    while (pwd.length < length) pwd += pick(all);
    return pwd.split('').sort(() => Math.random() - 0.5).join('');
  }
}
