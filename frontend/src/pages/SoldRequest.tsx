import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Send, Users, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSoldSettings } from "@/hooks/useSoldSettings";
import { StepProgress } from "@/components/requests/StepProgress";
import { Step1SelectPartners } from "@/components/sold/Step1SelectPartners";
import { Step2ConfigureEmail } from "@/components/sold/Step2ConfigureEmail";
import { Step3ReviewSend } from "@/components/sold/Step3ReviewSend";

export const SoldRequest: React.FC = () => {
  const {
    step,
    setStep,
    partners,
    loading,
    error,
    date,
    setDate,
    emailSubject,
    setEmailSubject,
    emailTemplate,
    processing,
    selectedPartnersCount,
    handleGenerateOrderNumbers,
    handleSendEmails,
    canProceedToStep2,
    canProceedToStep3,
    orderNumbers,
    resetAll,
    togglePartnerSelection
  } = useSoldSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Se încarcă partenerii...</p>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    if (step === 1 && canProceedToStep2) {
      setStep(2);
    } else if (step === 2 && canProceedToStep3) {
      // Generăm numerele de ordine înainte de a trece la pasul 3
      await handleGenerateOrderNumbers();
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleReset = () => {
    resetAll();
    setStep(1);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Step1SelectPartners
            partners={partners}
            onPartnerToggle={togglePartnerSelection}
            selectedCount={selectedPartnersCount}
          />
        );
      case 2:
        return (
          <Step2ConfigureEmail
            date={date}
            setDate={setDate}
            emailSubject={emailSubject}
            setEmailSubject={setEmailSubject}
            selectedPartnersCount={selectedPartnersCount}
          />
        );
      case 3:
        return (
          <Step3ReviewSend
            partners={partners.filter((p: any) => p.selected)}
            date={date}
            emailSubject={emailSubject}
            emailTemplate={emailTemplate}
            orderNumbers={orderNumbers}
            onSendEmails={handleSendEmails}
            processing={processing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Solicitare Fișe Partener
        </h1>
        <p className="text-gray-600">
          Trimiteți solicitări către parteneri pentru emiterea fișelor partener
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Send className="h-5 w-5 text-blue-600" />
                Configurare Solicitare
              </CardTitle>
              <CardDescription className="mt-1">
                Configurați și trimiteți solicitări pentru fișe partener
              </CardDescription>
            </div>
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="text-sm"
              >
                Resetează
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Step Progress */}
          <div className="mb-8">
            <StepProgress
              currentStep={step}
              onStepClick={(newStep) => {
                if (newStep <= step) {
                  setStep(newStep);
                }
              }}
            />
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div>
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={processing}
                >
                  Înapoi
                </Button>
              )}
            </div>
            
            <div>
              {step < 3 && (
                <Button
                  onClick={handleNext}
                  disabled={
                    processing ||
                    (step === 1 && !canProceedToStep2) ||
                    (step === 2 && !canProceedToStep3)
                  }
                  className="min-w-[120px]"
                >
                  {step === 2 ? "Generează & Continuă" : "Continuă"}
                </Button>
              )}
              
              {step === 3 && (
                <Button
                  onClick={handleSendEmails}
                  disabled={processing}
                  className="min-w-[120px] bg-green-600 hover:bg-green-700"
                >
                  {processing ? "Se trimite..." : "Trimite Solicitări"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
