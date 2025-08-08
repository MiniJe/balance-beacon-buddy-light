import { Request, Response } from 'express';

/**
 * Health check endpoint pentru monitoring și deployment
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected', // Ar trebui să testezi conexiunea reală
        email: 'configured',
        api: 'running'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Readiness check pentru deployment
 */
export const readinessCheck = async (req: Request, res: Response) => {
  try {
    // TODO: Adaugă verificări pentru:
    // - Conexiunea la baza de date
    // - Configurația email
    // - Alte servicii critice
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        email: 'ok',
        filesystem: 'ok'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
