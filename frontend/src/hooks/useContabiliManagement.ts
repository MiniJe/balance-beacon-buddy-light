import { useState, useEffect, useCallback } from "react";
import { Contabil, contabilService, CreateContabilDto } from "@/services/contabil.service";
import { toast } from "sonner";

export interface ContabilPermissions {
  PoateModificaParteneri: boolean;
  PoateAdaugaParteneri: boolean;
  PoateVedeaRapoarte: boolean;
  PoateModificaSabloane: boolean;
  PoateCreaCereri: boolean;
  PoateAdaugaUtilizatori: boolean;
  PoateModificaSetari: boolean;
}

export const useContabiliManagement = () => {
  const [contabili, setContabili] = useState<Contabil[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedContabil, setSelectedContabil] = useState<Contabil | null>(null);
  const [newContabil, setNewContabil] = useState<CreateContabilDto>({
    NumeContabil: "",
    PrenumeContabil: "",
    EmailContabil: "",
    RolContabil: "CONTABIL",
    StatusContabil: "Activ",
    PermisiuniAcces: {
      PoateModificaParteneri: false,
      PoateAdaugaParteneri: false,
      PoateVedeaRapoarte: false,
      PoateModificaSabloane: false,
      PoateCreaCereri: false,
      PoateAdaugaUtilizatori: false,
      PoateModificaSetari: false
    }
  });
  const [permissions, setPermissions] = useState<ContabilPermissions>({
    PoateModificaParteneri: false,
    PoateAdaugaParteneri: false,
    PoateVedeaRapoarte: false,
    PoateModificaSabloane: false,
    PoateCreaCereri: false,
    PoateAdaugaUtilizatori: false,
    PoateModificaSetari: false
  });

  // Load contabili list
  const loadContabili = useCallback(async () => {
    try {
      setLoading(true);
      console.log('⏳ Loading contabili list...');
      const data = await contabilService.getContabili();
      console.log('✅ Loaded contabili:', data);
      setContabili(data);
    } catch (error: any) {
      console.error("❌ Eroare la încărcarea contabililor:", error);
      // Mutăm toast-ul într-un setTimeout pentru a evita actualizarea stării în timpul randării
      setTimeout(() => {
        toast.error(error.message || "Eroare la încărcarea contabililor");
      }, 0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open permissions dialog for a contabil
  const openPermissionsDialog = (contabil: Contabil) => {
    setSelectedContabil(contabil);
    if (contabil.PermisiuniContabil) {
      setPermissions({
        PoateModificaParteneri: contabil.PermisiuniContabil.PoateModificaParteneri,
        PoateAdaugaParteneri: contabil.PermisiuniContabil.PoateAdaugaParteneri,
        PoateVedeaRapoarte: contabil.PermisiuniContabil.PoateVedeaRapoarte,
        PoateModificaSabloane: contabil.PermisiuniContabil.PoateModificaSabloane,
        PoateCreaCereri: contabil.PermisiuniContabil.PoateCreaCereri,
        PoateAdaugaUtilizatori: contabil.PermisiuniContabil.PoateAdaugaUtilizatori,
        PoateModificaSetari: contabil.PermisiuniContabil.PoateModificaSetari
      });
    }
    setPermissionsDialogOpen(true);
  };

  // Reset form for new contabil
  const resetNewContabilForm = () => {
    setNewContabil({
      NumeContabil: "",
      PrenumeContabil: "",
      EmailContabil: "",
      RolContabil: "CONTABIL",
      StatusContabil: "Activ",
      PermisiuniAcces: {
        PoateModificaParteneri: false,
        PoateAdaugaParteneri: false,
        PoateVedeaRapoarte: false,
        PoateModificaSabloane: false,
        PoateCreaCereri: false,
        PoateAdaugaUtilizatori: false,
        PoateModificaSetari: false
      }
    });
  };

  // Handle adding a new contabil
  const handleAddContabil = async () => {
    try {
      console.log('⏳ Creating new contabil:', newContabil);
      
      // Validări
      if (!newContabil.NumeContabil || !newContabil.PrenumeContabil || !newContabil.EmailContabil) {
        toast.error("Toate câmpurile sunt obligatorii");
        return;
      }
      
      // Validare email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newContabil.EmailContabil)) {
        toast.error("Adresa de email nu este validă");
        return;
      }
      
      const createdContabil = await contabilService.createContabil(newContabil);
      console.log('✅ Created contabil:', createdContabil);
      
      setContabili(prev => [...prev, createdContabil]);
      setAddDialogOpen(false);
      resetNewContabilForm();
      toast.success("Contabilul a fost adăugat cu succes!");
    } catch (error: any) {
      console.error("❌ Eroare la adăugarea contabilului:", error);
      toast.error(error.message || "Eroare la adăugarea contabilului");
    }
  };
  // Handle saving permissions
  const handleSavePermissions = async () => {
    if (!selectedContabil) return;
    
    try {
      console.log('⏳ Updating permissions for contabil:', selectedContabil.IdContabil);
      
      await contabilService.updateContabilPermisiuni(selectedContabil.IdContabil, permissions);
      console.log('✅ Updated permissions');
      
      // Actualizează lista de contabili cu noile permisiuni
      setContabili(prev => 
        prev.map(c => 
          c.IdContabil === selectedContabil.IdContabil 
            ? { ...c, PermisiuniContabil: permissions } 
            : c
        )
      );
      
      setPermissionsDialogOpen(false);
      toast.success("Permisiunile au fost actualizate cu succes!");
    } catch (error: any) {
      console.error("❌ Eroare la actualizarea permisiunilor:", error);
      toast.error(error.message || "Eroare la actualizarea permisiunilor");
    }  };
  // Handle changing contabil status
  const handleChangeStatus = async (contabil: Contabil) => {
    try {
      const newStatus = contabil.StatusContabil === 'Activ' ? 'Inactiv' : 'Activ';
      console.log(`⏳ Changing status for contabil ${contabil.IdContabil} to ${newStatus}`);
      
      await contabilService.updateContabilStatus(contabil.IdContabil, newStatus);
      console.log('✅ Status updated');
      
      // Actualizează lista de contabili cu noul status
      setContabili(prev => 
        prev.map(c => 
          c.IdContabil === contabil.IdContabil 
            ? { ...c, StatusContabil: newStatus } 
            : c
        )
      );
      
      toast.success(`Statusul contabilului a fost schimbat în "${newStatus}"`);
    } catch (error: any) {
      console.error("❌ Eroare la actualizarea statusului:", error);
      toast.error(error.message || "Eroare la actualizarea statusului");
    }
  };
  // Handle resetting contabil password
  const handleResetPassword = async (contabil: Contabil) => {
    try {
      console.log(`⏳ Resetting password for contabil ${contabil.IdContabil}`);
        const result = await contabilService.resetContabilPassword(contabil.IdContabil);
      console.log('✅ Password reset');
      
      toast.success(`Parola contabilului a fost resetată cu succes!`);
    } catch (error: any) {
      console.error("❌ Eroare la resetarea parolei:", error);
      toast.error(error.message || "Eroare la resetarea parolei");
    }
  };

  // Load contabili on component mount
  useEffect(() => {
    loadContabili();
  }, [loadContabili]);

  return {
    contabili,
    loading,
    addDialogOpen,
    setAddDialogOpen,
    permissionsDialogOpen,
    setPermissionsDialogOpen,
    selectedContabil,
    setSelectedContabil,
    newContabil,
    setNewContabil,
    permissions,
    setPermissions,
    loadContabili,
    openPermissionsDialog,
    handleAddContabil,
    handleSavePermissions,
    handleChangeStatus,
    handleResetPassword,
    resetNewContabilForm
  };
};
