// Stub contabil.service.ts - serviciul Azure vechi a fost eliminat.
// Orice cod activ trebuie să folosească ContabilSQLiteService.

export class ContabilServiceStub {
    private fail(method: string): never { throw new Error(`ContabilService (Azure) eliminat. Metodă indisponibilă: ${method}`); }
    createContabil() { this.fail('createContabil'); }
    getAllContabili() { this.fail('getAllContabili'); }
    getContabilById() { this.fail('getContabilById'); }
    updateContabil() { this.fail('updateContabil'); }
    resetPassword() { this.fail('resetPassword'); }
    deleteContabil() { this.fail('deleteContabil'); }
    changePassword() { this.fail('changePassword'); }
}

export const contabilService = new ContabilServiceStub();
// Implementare Azure veche eliminată complet.