import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';

// CommonJS compatibility
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Configurație SQLite pentru Balance Beacon Buddy Light
 * 
 * Înlocuiește Azure SQL cu SQLite local pentru versiunea light
 */

// Calea către baza de date SQLite
const dbPath = path.resolve(__dirname, '../../data/balance-beacon-buddy-light.db');

let db: Database | null = null;

/**
 * Inițializează conexiunea la SQLite
 */
const initializeDatabase = async (): Promise<Database> => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log(`📂 Connected to SQLite database at: ${dbPath}`);
    
    // Activează foreign keys în SQLite
    await db.exec('PRAGMA foreign_keys = ON');
    
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to SQLite database:', error);
    throw error;
  }
};

/**
 * Obține conexiunea la baza de date
 */
const getDatabase = async (): Promise<Database> => {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
};

/**
 * Test conexiune
 */
const testConnection = async (): Promise<boolean> => {
  try {
    const database = await getDatabase();
    const result = await database.get('SELECT 1 as test');
    console.log('✅ SQLite connection test successful');
    return true;
  } catch (error) {
    console.error('❌ SQLite connection test failed:', error);
    return false;
  }
};

/**
 * Închide conexiunea la baza de date
 */
const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('📂 SQLite database connection closed');
  }
};

export { 
  initializeDatabase,
  getDatabase,
  testConnection,
  closeDatabase,
  dbPath
};
