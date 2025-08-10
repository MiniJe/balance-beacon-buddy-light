import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import refactored components
import { useRequestSettings } from "@/hooks/useRequestSettings";
import { StepProgress } from "@/components/requests/StepProgress";
import { Step1SelectPartners } from "@/components/requests/Step1SelectPartners";
import { Step2Configure } from "@/components/requests/Step2Configure";
import { Step2GenerateDocuments } from "@/components/requests/Step2GenerateDocuments";
import { Step3UploadFiles } from "@/components/requests/Step3UploadFiles";
import { Step4ReviewSend } from "@/components/requests/Step4ReviewSend";

const RequestSettings = () => {
  const {
    // State
    step,
    setStep,
    partnerCategory,
    setPartnerCategory,
    partners,
    filteredPartners,
    loading,
    error,
    setError,
    date,
    setDate,
    emailSubject,
    setEmailSubject,
    folderLocal,
    setFolderLocal,
    currentSession,
    documentsGenerated,
    processing,
    selectedPartnersCount,
    allDocumentsUploaded,
    
    // Actions
    handlePartnerSelection,
    handleSelectAll,
    handleInitializeSession,
    handleGenerateDocuments,
    handleUploadFile,
    handleUploadBulkFiles,
    handleFinalizeSession,
    handleResetWizard,
    handleStepNavigation,
    validateUploadedFiles // ✅ ADĂUGAT: funcție de validare hash-uri
  } = useRequestSettings();

  // Funcție pentru trecerea de la Step 3 la Step 4 cu validare hash-uri
  const handleNextToStep4 = async () => {
    console.log('🔍 Verificare înainte de trecerea la Step 4...');
    
    // Validează hash-urile fișierelor încărcate
    const validation = await validateUploadedFiles();
    
    if (!validation.isValid) {
      console.error('❌ VALIDARE EȘUATĂ - aplicația NU trece la Step 4!');
      // Eroarea este deja setată în validateUploadedFiles
      return;
    }
    
    console.log('✅ VALIDARE REUȘITĂ - se poate trece la Step 4');
    setStep(4);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Trimite Cereri de Confirmare</h1>
      </div>

      <Tabs defaultValue="wizard" className="w-full">
        <TabsList>
          <TabsTrigger value="wizard">Asistent Trimitere</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wizard" className="space-y-4 mt-6">
          <StepProgress currentStep={step} onStepClick={handleStepNavigation} />
          
          {/* Step 1: Select Partners */}
          {step === 1 && (
            <Step1SelectPartners
              partners={filteredPartners}
              loading={loading}
              error={error}
              partnerCategory={partnerCategory}
              onPartnerSelection={handlePartnerSelection}
              onSelectAll={handleSelectAll}
              onFilterChange={setPartnerCategory}
              onNext={() => setStep(2)}
            />
          )}
          
          {/* Step 2: Configure or Generate (depending on session state) */}
          {step === 2 && !currentSession && (
            <Step2Configure
              date={date}
              onDateChange={setDate}
              folderLocal={folderLocal}
              onFolderChange={setFolderLocal}
              emailSubject={emailSubject}
              onEmailSubjectChange={setEmailSubject}
              selectedPartnersCount={selectedPartnersCount}
              partnerCategory={partnerCategory}
              processing={processing}
              error={error}
              onBack={() => setStep(1)}
              onNext={handleInitializeSession}
            />
          )}
          
          {step === 2 && currentSession && (
            <Step2GenerateDocuments
              currentSession={currentSession}
              processing={processing}
              error={error}
              onBack={() => setStep(1)}
              onGenerateDocuments={handleGenerateDocuments}
              onResetToConfiguration={handleResetWizard}
            />
          )}
          
          {/* Step 3: Upload Files */}
          {step === 3 && (
            <Step3UploadFiles
              documentsGenerated={documentsGenerated}
              folderLocal={folderLocal}
              error={error}
              onUploadFile={handleUploadFile}
              onUploadBulkFiles={handleUploadBulkFiles}
              onBack={() => setStep(2)}
              onNext={handleNextToStep4} // ✅ FOLOSEȘTE VALIDAREA HASH-URILOR
              allDocumentsUploaded={allDocumentsUploaded}
            />
          )}
          
          {/* Step 4: Review and Send */}
          {step === 4 && (
            <Step4ReviewSend
              date={date}
              selectedPartnersCount={selectedPartnersCount}
              partnerCategory={partnerCategory}
              emailSubject={emailSubject}
              documentsGenerated={documentsGenerated}
              onBack={() => setStep(3)}
              onSend={handleFinalizeSession}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestSettings;

