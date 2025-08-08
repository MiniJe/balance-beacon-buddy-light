import { pool } from "../config/azure";

export class DatabaseService {
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const request = pool.request();
      
      // Add parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      const result = await request.query(sql);
      return result.recordset;
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Database operation failed");
    }
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    try {
      const request = pool.request();
      
      // Add parameters
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });

      await request.query(sql);
    } catch (error) {
      console.error("Database execute error:", error);
      throw new Error("Database operation failed");
    }
  }

  // Transaction support
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const transaction = pool.transaction();
    
    try {
      await transaction.begin();
      const result = await callback();
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getAllPartners(): Promise<any[]> {
    try {
      const partners = await this.query('SELECT * FROM partners WHERE active = true');
      console.log(`✅ ${partners.length} parteneri activi preluați din baza de date.`);
      return partners;
    } catch (error) {
      console.error('❌ Eroare la preluarea partenerilor:', error);
      throw error;
    }
  }
}
