import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import * as sql from "mssql";
import dotenv from "dotenv";
import path from "path";

// CommonJS compatibility
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Configurație Azure Storage pentru Balance Beacon Buddy
 * 
 * CONTAINERE:
 * 1. 'logo' - Pentru stocarea logo-urilor companiilor (funcționalitate curentă)
 * 2. 'duc-dl' - Pentru stocarea template-urilor (pentru următoarea etapă de dezvoltare)
 * 3. 'freshcrmbackup' - Pentru backup-uri (SQL și blob)
 */

// Azure Storage configuration
const credential = new DefaultAzureCredential();
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient: BlobServiceClient = connectionString 
    ? BlobServiceClient.fromConnectionString(connectionString)
    : BlobServiceClient.fromConnectionString("UseDevelopmentStorage=true");

// Container pentru logo-uri
const containerName: string = process.env.AZURE_STORAGE_CONTAINER_NAME || "logo";

// Container pentru template-uri (pentru următoarea etapă de dezvoltare)
const templatesContainerName: string = process.env.AZURE_TEMPLATES_CONTAINER_NAME || "duc-dl";

// Backup Storage configuration
const backupConnectionString = process.env.BACKUP_STORAGE_CONNECTION_STRING || connectionString;
const backupBlobServiceClient: BlobServiceClient = backupConnectionString 
    ? BlobServiceClient.fromConnectionString(backupConnectionString)
    : BlobServiceClient.fromConnectionString("UseDevelopmentStorage=true");
const backupContainerName: string = process.env.BACKUP_CONTAINER_NAME || "freshcrmbackup";

// SQL Server configuration
const sqlConfig: sql.config = {
  server: process.env.DB_SERVER!,
  database: process.env.DB_NAME!,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: false,
    connectTimeout: 30000, // 30 seconds
    requestTimeout: 30000  // 30 seconds
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Create connection pool
const pool: sql.ConnectionPool = new sql.ConnectionPool(sqlConfig);

// Initialize pool
const initializePool = async (): Promise<void> => {
  try {
    await pool.connect();
    console.log("Connected to Azure SQL Database");
  } catch (err) {
    console.error("Failed to connect to database:", err);
    throw err;
  }
};

// Test connection function
const testConnection = async (): Promise<boolean> => {
  try {
    await pool.connect();
    console.log("Connection test successful");
    return true;
  } catch (err) {
    console.error("Connection test failed:", err);
    return false;
  }
};

export { 
  blobServiceClient, 
  containerName, 
  templatesContainerName,
  backupBlobServiceClient, 
  backupContainerName, 
  pool, 
  initializePool, 
  testConnection 
};
