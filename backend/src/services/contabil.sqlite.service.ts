import { getDatabase } from '../config/sqlite';

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
}

export class ContabilSQLiteService {
  static async getAllContabili(): Promise<any[]> {
    const db = await getDatabase();
    const rows: RawSQLiteContabilRow[] = await db.all(`
      SELECT 
        IdContabil,
        NumeContabil,
        PrenumeContabil,
        EmailContabil,
        TelefonContabil,
        DepartmentContabil,
        RolContabil,
        StatusContabil,
        DataUltimeiLogări,
        DataUltimeiLogari,
        DatăCreareContabil,
        DataCreare,
        ContabilCreatDe,
        CreatDe,
        DataActualizării,
        DataActualizare,
        ActualizatDE,
        ActualizatDe,
        SchimbareParolaLaLogare,
        PermisiuniAcces
      FROM Contabili
      WHERE COALESCE(StatusContabil,'Activ') NOT IN ('Șters','Sters')
      ORDER BY NumeContabil, PrenumeContabil
    `);

    return rows.map(r => {
      let permisiuni: any = {
        PoateModificaParteneri: false,
        PoateAdaugaParteneri: false,
        PoateVedeaRapoarte: false,
        PoateModificaSabloane: false,
        PoateCreaCereri: false,
        PoateAdaugaUtilizatori: false,
        PoateModificaSetari: false
      };
      if (r.PermisiuniAcces) {
        try {
          const parsed = JSON.parse(r.PermisiuniAcces);
          permisiuni = { ...permisiuni, ...parsed };
        } catch (e) {
          console.warn('⚠️  Eroare parsare PermisiuniAcces (ignor, folosesc default):', e);
        }
      }
      return {
        IdContabil: r.IdContabil,
        NumeContabil: r.NumeContabil,
        PrenumeContabil: r.PrenumeContabil,
        EmailContabil: r.EmailContabil,
        TelefonContabil: r.TelefonContabil,
        DepartmentContabil: r.DepartmentContabil,
        RolContabil: r.RolContabil,
        StatusContabil: r.StatusContabil,
        DataUltimeiLogări: r.DataUltimeiLogări || r.DataUltimeiLogari,
        DatăCreareContabil: r.DatăCreareContabil || r.DataCreare,
        ContabilCreatDe: r.ContabilCreatDe || r.CreatDe,
        DataActualizării: r.DataActualizării || r.DataActualizare,
        ActualizatDE: r.ActualizatDE || r.ActualizatDe,
        SchimbareParolaLaLogare: r.SchimbareParolaLaLogare === 1 || r.SchimbareParolaLaLogare === true,
        PermisiuniAcces: permisiuni,
        PermisiuniContabil: permisiuni
      };
    });
  }
}
