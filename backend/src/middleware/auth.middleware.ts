import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ApiResponseHelper } from '../types/api.types.js';
import { checkContabilPermission, ContabilPermissions } from '../services/master-permissions.service';

interface CustomJwtPayload extends JwtPayload {
    // Câmpuri pentru utilizatori MASTER
    IdUtilizatori?: string;
    NumeUtilizator?: string;
    EmailUtilizator?: string;
    RolUtilizator?: string;
    
    // Câmpuri pentru contabili
    IdContabil?: string;
    id?: string; // For backward compatibility
    NumeContabil?: string;
    EmailContabil?: string;
    TipUtilizator?: string;
    
    // Additional JWT properties
    role?: string;
    userType?: string;
    email?: string;
}

interface AuthenticatedRequest extends Request {
    user?: CustomJwtPayload;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        console.log('🔐 AUTH: Header received:', authHeader ? 'YES' : 'NO');
        
        const token = authHeader?.split(' ')[1];
        
        if (!token) {
            console.log('❌ AUTH: No token found');
            res.status(401).json({ message: 'Token-ul de autentificare lipsește' });
            return;
        }

        // Verifică că JWT_SECRET este configurat corect
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret === 'your-secret-key') {
            console.error('🚨 AVERTISMENT DE SECURITATE: JWT_SECRET nu este configurat sau folosește valoarea implicită!');
            res.status(500).json({ message: 'Configurație de securitate incompletă' });
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as CustomJwtPayload;
        console.log('✅ AUTH: Token decoded successfully for user:', decoded.NumeUtilizator || decoded.NumeContabil || 'UNKNOWN');
        
        // Ensure the decoded token has the IdContabil property even if it doesn't
        if (decoded && typeof decoded === 'object' && decoded.id && !decoded.IdContabil) {
            decoded.IdContabil = decoded.id;
            console.log('Added IdContabil property to token:', decoded);
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token invalid sau expirat' });
        return;
    }
};

export const roleMiddleware = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        console.log('🔐 ROLE: Checking roles:', roles);
        
        if (!req.user) {
            console.log('❌ ROLE: No user in request');
            res.status(401).json({ message: 'Utilizator neautentificat' });
            return;
        }

        // Check for role from JWT token
        const userRole = req.user.RolUtilizator || req.user.role || req.user.TipUtilizator || req.user.userType || '';
        console.log('🔐 ROLE: User has role:', userRole);
        
        // MASTER users have access to everything
        if (userRole === 'MASTER') {
            console.log('✅ ROLE: MASTER access granted - full permissions');
            next();
            return;
        }
        
        // Allow access if user role matches any of the allowed roles
        if (roles.includes(userRole) || 
            (userRole === 'contabil' && roles.includes('CONTABIL')) || 
            (userRole === 'CONTABIL' && roles.includes('CONTABIL'))) {
            console.log('✅ ROLE: Access granted');
            next();
            return;
        }
        
        console.log('❌ ROLE: Access denied');
        res.status(403).json({ message: 'Nu aveți permisiunile necesare' });
        return;
    };
};

/**
 * Middleware pentru acces exclusiv MASTER
 */
export const masterOnlyMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    console.log('🔐 MASTER: Checking MASTER access');
    
    if (!req.user) {
        console.log('❌ MASTER: No user in request');
        res.status(401).json({ message: 'Utilizator neautentificat' });
        return;
    }

    const userRole = req.user.RolUtilizator || req.user.role || '';
    console.log('🔐 MASTER: User role:', userRole);
    
    if (userRole === 'MASTER') {
        console.log('✅ MASTER: Access granted');
        next();
        return;
    }
    
    console.log('❌ MASTER: Access denied - only MASTER users allowed');
    res.status(403).json({ message: 'Acces permis doar utilizatorilor MASTER' });
    return;
};

/**
 * Middleware pentru verificarea permisiunilor granulare ale contabililor
 * MASTER are acces automat, contabilii trebuie să aibă permisiunea specifică
 */
export const permissionMiddleware = (requiredPermission: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        console.log(`🔐 PERMISSION: Checking permission: ${requiredPermission}`);
        
        if (!req.user) {
            console.log('❌ PERMISSION: No user in request');
            res.status(401).json({ message: 'Utilizator neautentificat' });
            return;
        }

        const userRole = req.user.RolUtilizator || req.user.role || req.user.TipUtilizator || req.user.userType || '';
        
        // MASTER users have access to everything
        if (userRole === 'MASTER') {
            console.log('✅ PERMISSION: MASTER access granted - bypassing permission check');
            next();
            return;
        }
        
        // For contabili, check specific permission
        if (userRole === 'CONTABIL' || userRole === 'contabil') {
            try {
                const idContabil = req.user.IdContabil || req.user.id;
                if (!idContabil) {
                    console.log('❌ PERMISSION: No contabil ID found');
                    res.status(403).json({ message: 'ID contabil lipsă' });
                    return;
                }
                
                const hasPermission = await checkContabilPermission(idContabil, requiredPermission as keyof ContabilPermissions);
                if (hasPermission) {
                    console.log(`✅ PERMISSION: Contabil has permission: ${requiredPermission}`);
                    next();
                    return;
                } else {
                    console.log(`❌ PERMISSION: Contabil missing permission: ${requiredPermission}`);
                    res.status(403).json({ message: `Nu aveți permisiunea: ${requiredPermission}` });
                    return;
                }
            } catch (error) {
                console.error('❌ PERMISSION: Error checking contabil permission:', error);
                res.status(500).json({ message: 'Eroare la verificarea permisiunilor' });
                return;
            }
        }
        
        console.log('❌ PERMISSION: Access denied - unknown user type');
        res.status(403).json({ message: 'Acces neautorizat' });
        return;
    };
};

export { AuthenticatedRequest };
