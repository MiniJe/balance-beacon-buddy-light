import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Key, Users, Mail, Phone, Building, Clock, User } from 'lucide-react';
import { Contabil, CreateContabilDto, contabilService } from '../../services/contabil.service';
import { ContabilFormDialog } from './ContabilFormDialog';

interface ContabiliTabProps {}

const ContabiliTab: React.FC<ContabiliTabProps> = () => {
  const [contabili, setContabili] = useState<Contabil[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [selectedContabil, setSelectedContabil] = useState<Contabil | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CreateContabilDto>({
    NumeContabil: '',
    PrenumeContabil: '',
    EmailContabil: '',
    TelefonContabil: '',
    DepartmentContabil: '',
    RolContabil: 'CONTABIL',
    StatusContabil: 'Activ',
    DatăAngajareContabil: '',
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

  useEffect(() => {
    loadContabili();
  }, []);

  const loadContabili = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contabilService.getContabili();
      setContabili(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea contabililor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContabil = async () => {
    setSaving(true);
    try {
      await contabilService.createContabil(formData);
      setShowFormDialog(false);
      resetForm();
      await loadContabili();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la adăugarea contabilului');
    } finally {
      setSaving(false);
    }
  };

  const handleEditContabil = async () => {
    if (!selectedContabil) return;
    
    setSaving(true);
    try {
      await contabilService.updateContabil(selectedContabil.IdContabil, formData);
      setShowFormDialog(false);
      resetForm();
      await loadContabili();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la actualizarea contabilului');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (selectedContabil) {
      handleEditContabil();
    } else {
      handleAddContabil();
    }
  };

  const handleDeleteContabil = async (id: string) => {
    if (!confirm('Sunteți sigur că doriți să ștergeți acest contabil?')) return;
    
    try {
      await contabilService.deleteContabil(id);
      await loadContabili();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la ștergerea contabilului');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!confirm('Sunteți sigur că doriți să resetați parola pentru acest contabil?')) return;
    
    try {
      await contabilService.resetPassword(id);
      alert('Parola a fost resetată cu succes. Noua parolă a fost trimisă pe email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la resetarea parolei');
    }
  };  const resetForm = () => {
    setFormData({
      NumeContabil: '',
      PrenumeContabil: '',
      EmailContabil: '',
      TelefonContabil: '',
      DepartmentContabil: '',
      RolContabil: 'CONTABIL',
      StatusContabil: 'Activ',
      DatăAngajareContabil: '',
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
    setSelectedContabil(null);
  };

  const openEditModal = (contabil: Contabil) => {
    setSelectedContabil(contabil);
    setFormData({
      NumeContabil: contabil.NumeContabil,
      PrenumeContabil: contabil.PrenumeContabil,
      EmailContabil: contabil.EmailContabil,
      TelefonContabil: contabil.TelefonContabil || '',
      DepartmentContabil: contabil.DepartmentContabil || '',
      RolContabil: contabil.RolContabil,
      StatusContabil: contabil.StatusContabil,
      DatăAngajareContabil: contabil.DatăAngajareContabil 
        ? (() => {
            const d = new Date(contabil.DatăAngajareContabil);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`; // local YYYY-MM-DD for input[type=date]
          })()
        : '',
      PermisiuniAcces: contabil.PermisiuniContabil || {
        PoateModificaParteneri: false,
        PoateAdaugaParteneri: false,
        PoateVedeaRapoarte: false,
        PoateModificaSabloane: false,
        PoateCreaCereri: false,
        PoateAdaugaUtilizatori: false,
        PoateModificaSetari: false
      }
    });
    setShowFormDialog(true);
  };

  const openAddModal = () => {
    setSelectedContabil(null);
    resetForm();
    setShowFormDialog(true);
  };

  const closeFormDialog = () => {
    setShowFormDialog(false);
    resetForm();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activ': return 'text-green-600 bg-green-100';
      case 'Inactiv': return 'text-red-600 bg-red-100';
      case 'Suspendat': return 'text-yellow-600 bg-yellow-100';
      case 'În Concediu': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Administrator': return 'text-purple-600 bg-purple-100';
      case 'Manager': return 'text-blue-600 bg-blue-100';
      case 'Contabil': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Se încarcă contabilii...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Gestionare Contabili
          </h2>
          <p className="text-gray-600 mt-1">Administrează contabilii și permisiunile acestora</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={loadContabili}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reîncarcă
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adaugă Contabil
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Contabili Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contabil
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ultima Logare
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contabili.map((contabil) => (
                <tr key={contabil.IdContabil} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {contabil.NumeContabil} {contabil.PrenumeContabil}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Building className="w-3 h-3 mr-1" />
                          {contabil.DepartmentContabil || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {contabil.EmailContabil}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {contabil.TelefonContabil || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(contabil.RolContabil)}`}>
                        {contabil.RolContabil}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contabil.StatusContabil)}`}>
                        {contabil.StatusContabil}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {contabil.DataUltimeiLogări 
                        ? new Date(contabil.DataUltimeiLogări).toLocaleDateString('ro-RO')
                        : 'Niciodată'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(contabil)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                        title="Editează"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(contabil.IdContabil)}
                        className="text-yellow-600 hover:text-yellow-900 p-1 rounded transition-colors"
                        title="Resetează parola"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContabil(contabil.IdContabil)}
                        className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                        title="Șterge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {contabili.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există contabili</h3>
            <p className="text-gray-500 mb-4">Adaugă primul contabil pentru a începe.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Contabil
            </button>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <ContabilFormDialog
        isOpen={showFormDialog}
        onClose={closeFormDialog}
        formData={formData}
        onFormDataChange={setFormData}
        onSave={handleSave}
        isEditing={!!selectedContabil}
        saving={saving}
      />
    </div>
  );
};

export { ContabiliTab };
