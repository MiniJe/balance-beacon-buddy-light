import { Request, Response } from 'express';
import authUnifiedService from '../services/auth.unified.service';
import { ApiResponseHelper, LoginApiResponse } from '../types/api.types';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuthController {
    /**
     * Autentifică un utilizator (MASTER sau CONTABIL)
     */
    async login(req: Request, res: Response): Promise<void> {
        console.log('🔍 [AUTH CONTROLLER] Request primit:', {
            method: req.method,
            url: req.url,
            body: req.body,
            headers: req.headers['content-type'],
            timestamp: new Date().toISOString()
        });
        
        try {
            const loginData = req.body;
            if (!loginData || typeof loginData !== 'object') {
                res.status(400).json(ApiResponseHelper.validationError(
                    'body', 
                    'Datele de autentificare sunt invalide'
                ));
                return;
            }

            // Convertim datele în formatul cerut de serviciul unificat
            const unifiedLoginData = {
                email: loginData.EmailUtilizator || loginData.EmailContabil || loginData.email || loginData.username,
                password: loginData.Parola || loginData.password
            };

            // Extrage IP-ul și User-Agent-ul din request
            const forwardedFor = req.headers['x-forwarded-for'];
            const xForwardedFor = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
            const ipAddress = req.ip || req.connection.remoteAddress || xForwardedFor || 'Unknown';
            const userAgent = req.headers['user-agent'] || 'Unknown';
            
            const { user, token, sessionId } = await authUnifiedService.login(unifiedLoginData, ipAddress, userAgent);

            // Răspuns unificat cu format standardizat
            const response = ApiResponseHelper.success(
                { user, token, sessionId },
                `Autentificare reușită pentru ${(user as any).NumeUtilizator || (user as any).NumeContabil}`
            );
            
            res.json(response);
        } catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Credențiale invalide') {
                    console.error('❌ Autentificare eșuată: Credențiale invalide');
                    res.status(401).json(ApiResponseHelper.authError(error.message));
                    return;
                }
                console.error('❌ Eroare la autentificare:', error.message);
                console.error('📋 Stack trace:', error.stack);
                
                // Log any SQL related details if available
                const sqlError = error as any;
                if (sqlError.code) console.error('🔢 Cod eroare:', sqlError.code);
                if (sqlError.number) console.error('🔢 Număr eroare SQL:', sqlError.number);
                if (sqlError.lineNumber) console.error('📍 Linie:', sqlError.lineNumber);
                if (sqlError.state) console.error('🔢 Stare SQL:', sqlError.state);
                if (sqlError.procName) console.error('📝 Procedură:', sqlError.procName);
                
                // Verificăm dacă mesajul conține cuvinte cheie pentru validare date/timestamp
                if (error.message.toLowerCase().includes('date') || 
                    error.message.toLowerCase().includes('time') || 
                    error.message.toLowerCase().includes('timestamp')) {
                    console.error('🕒 Posibilă problemă cu formatul datei/orei!');
                    console.error('📅 Detalii eroare timestamp:', error.message);
                }
            } else {
                console.error('❓ Eroare necunoscută la autentificare');
            }
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la autentificare',
                'LOGIN_ERROR',
                process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Eroare necunoscută') : undefined
            ));
        }
    }    /**
     * Obține profilul utilizatorului autentificat
     */
    async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Determină tipul de utilizator și ID-ul corespunzător
            const user = req.user;
            const userId = user?.IdUtilizatori || user?.IdContabil || user?.id;
            
            if (!userId) {
                res.status(400).json(ApiResponseHelper.validationError(
                    'userId', 
                    'ID utilizator invalid'
                ));
                return;
            }

            const userProfile = await authUnifiedService.getUser(userId);
            if (!userProfile) {
                res.status(404).json(ApiResponseHelper.notFoundError('Utilizatorul'));
                return;
            }

            // Returnează profilul în funcție de tipul utilizatorului
            if (userProfile.TipUtilizator === 'MASTER') {
                const profileData = {
                    IdUtilizatori: userProfile.IdUtilizatori,
                    NumeUtilizator: userProfile.NumeUtilizator,
                    EmailUtilizator: userProfile.EmailUtilizator,
                    RolUtilizator: userProfile.RolUtilizator,
                    TipUtilizator: 'MASTER'
                };
                res.json(ApiResponseHelper.success(profileData, 'Profil utilizator obținut cu succes'));
            } else {
                // Pentru CONTABIL
                const profileData = {
                    IdContabil: userProfile.IdContabil,
                    NumeContabil: userProfile.NumeContabil,
                    PrenumeContabil: userProfile.PrenumeContabil,
                    EmailContabil: userProfile.EmailContabil,
                    RolContabil: userProfile.RolContabil,
                    StatusContabil: userProfile.StatusContabil,
                    TipUtilizator: 'CONTABIL',
                    PermisiuniAcces: userProfile.PermisiuniAcces ? JSON.parse(userProfile.PermisiuniAcces) : null
                };
                res.json(ApiResponseHelper.success(profileData, 'Profil contabil obținut cu succes'));
            }
        } catch (error) {
            console.error('Eroare la obținerea profilului:', error instanceof Error ? error.message : 'Eroare necunoscută');
            res.status(500).json(ApiResponseHelper.error(
                'Eroare la obținerea profilului',
                'GET_PROFILE_ERROR'
            ));
        }    }
}

export default AuthController;
