import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { ApiResponseHelper } from '../types/api.types';

// Validare pentru login
export const validateLogin = [
    body('EmailUtilizator')
        .isEmail()
        .withMessage('Adresa de email nu este validă'),
    body('Parola')
        .notEmpty()
        .withMessage('Parola este obligatorie'),
    validateResults
];

// Validare pentru crearea unui utilizator nou
export const validateCreateUser = [
    body('NumeUtilizator')
        .trim()
        .notEmpty()
        .withMessage('Numele utilizatorului este obligatoriu')
        .isLength({ min: 2, max: 200 })
        .withMessage('Numele trebuie să aibă între 2 și 200 caractere'),
    body('EmailUtilizator')
        .isEmail()
        .withMessage('Adresa de email nu este validă')
        .normalizeEmail(),
    body('Parola')
        .isLength({ min: 8 })
        .withMessage('Parola trebuie să aibă minimum 8 caractere')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Parola trebuie să conțină cel puțin o literă mare, o literă mică și un număr'),
    body('RolUtilizator')
        .notEmpty()
        .withMessage('Rolul utilizatorului este obligatoriu')
        .isIn(['MASTER', 'CONTABIL', 'OPERATOR'])
        .withMessage('Rol invalid'),
    validateResults
];

// Funcție helper pentru procesarea rezultatelor validării
function validateResults(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        const field = 'path' in firstError ? firstError.path : 
                     'param' in firstError ? firstError.param : 'unknown';
        
        res.status(400).json(ApiResponseHelper.validationError(
            field as string, 
            firstError.msg
        ));
        return;
    }
    next();
}

/**
 * Validare pentru crearea documentelor în jurnal
 */
export const validateCreateDocument = [
    body('NumeDocument')
        .trim()
        .notEmpty()
        .withMessage('Numele documentului este obligatoriu')
        .isLength({ max: 255 })
        .withMessage('Numele documentului nu poate depăși 255 caractere'),
    body('hashDocument')
        .notEmpty()
        .withMessage('Hash-ul documentului este obligatoriu')
        .isLength({ max: 128 })
        .withMessage('Hash-ul nu poate depăși 128 caractere'),
    body('idUtilizator')
        .notEmpty()
        .withMessage('ID-ul utilizatorului este obligatoriu'),
    body('numeUtilizator')
        .trim()
        .notEmpty()
        .withMessage('Numele utilizatorului este obligatoriu'),
    body('emailUtilizator')
        .isEmail()
        .withMessage('Email-ul utilizatorului nu este valid'),
    body('caleFisier')
        .notEmpty()
        .withMessage('Calea fișierului este obligatorie'),
    validateResults
];

/**
 * Validare pentru actualizarea documentelor
 */
export const validateUpdateDocument = [
    body('statusDocument')
        .optional()
        .isIn(['generat', 'semnat', 'trimis', 'confirmat', 'anulat'])
        .withMessage('Status document invalid'),
    body('hashDocumentSemnat')
        .optional()
        .isLength({ max: 128 })
        .withMessage('Hash-ul documentului semnat nu poate depăși 128 caractere'),
    validateResults
];

/**
 * Middleware generic pentru validarea parametrilor numerici din rute
 */
export const validateNumericParam = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const paramValue = req.params[paramName];
        const numericValue = parseInt(paramValue, 10);
        
        if (isNaN(numericValue) || numericValue <= 0) {
            res.status(400).json(ApiResponseHelper.validationError(
                paramName, 
                `Parametrul ${paramName} trebuie să fie un număr pozitiv valid`
            ));
            return;
        }
        
        // Adaugă valoarea numerică în request pentru ușurința utilizării
        (req as any)[`${paramName}Numeric`] = numericValue;
        next();
    };
};

/**
 * Validare pentru parametrii de paginare
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
    const { page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json(ApiResponseHelper.validationError(
            'page', 
            'Numărul paginii trebuie să fie un întreg pozitiv'
        ));
        return;
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json(ApiResponseHelper.validationError(
            'limit', 
            'Limita trebuie să fie între 1 și 100'
        ));
        return;
    }
    
    // Adaugă valorile validate în request
    (req as any).paginationParams = { page: pageNum, limit: limitNum };
    next();
};

/**
 * Factory function pentru crearea validărilor custom
 */
export const createValidationChain = (
    validations: ValidationChain[]
): Array<ValidationChain | typeof validateResults> => {
    return [...validations, validateResults];
};
