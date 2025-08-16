
interface StepProgressProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const StepProgress = ({ currentStep, onStepClick }: StepProgressProps) => {
  const handleStepClick = (step: number) => {
    // Permite navigarea doar înapoi sau la step-ul curent
    if (step <= currentStep && onStepClick) {
      onStepClick(step);
    }
  };

  return (
    <div className="flex items-center space-x-2 mb-6">
      <button
        onClick={() => handleStepClick(1)}
        className={`rounded-full p-2 transition-colors ${
          currentStep >= 1 ? 'bg-primary text-white' : 'bg-muted'
        } ${currentStep > 1 ? 'hover:bg-primary/80 cursor-pointer' : ''}`}
        disabled={currentStep === 1}
        title="Step 1: Selectare parteneri"
      >
        <span className="w-6 h-6 flex items-center justify-center">1</span>
      </button>
      <div className="h-0.5 flex-1 bg-muted">
        <div className={`h-full bg-primary transition-all duration-300 ${currentStep >= 2 ? 'w-full' : 'w-0'}`} />
      </div>
      <button
        onClick={() => handleStepClick(2)}
        className={`rounded-full p-2 transition-colors ${
          currentStep >= 2 ? 'bg-primary text-white' : 'bg-muted'
        } ${currentStep > 2 ? 'hover:bg-primary/80 cursor-pointer' : ''}`}
        disabled={currentStep < 2}
        title="Step 2: Configurare și generare"
      >
        <span className="w-6 h-6 flex items-center justify-center">2</span>
      </button>
      <div className="h-0.5 flex-1 bg-muted">
        <div className={`h-full bg-primary transition-all duration-300 ${currentStep >= 3 ? 'w-full' : 'w-0'}`} />
      </div>
      <button
        onClick={() => handleStepClick(3)}
        className={`rounded-full p-2 transition-colors ${
          currentStep >= 3 ? 'bg-primary text-white' : 'bg-muted'
        } ${currentStep > 3 ? 'hover:bg-primary/80 cursor-pointer' : ''}`}
        disabled={currentStep < 3}
        title="Step 3: Încărcare documente"
      >
        <span className="w-6 h-6 flex items-center justify-center">3</span>
      </button>
      <div className="h-0.5 flex-1 bg-muted">
        <div className={`h-full bg-primary transition-all duration-300 ${currentStep >= 4 ? 'w-full' : 'w-0'}`} />
      </div>
      <button
        onClick={() => handleStepClick(4)}
        className={`rounded-full p-2 transition-colors ${
          currentStep >= 4 ? 'bg-primary text-white' : 'bg-muted'
        } ${currentStep > 4 ? 'hover:bg-primary/80 cursor-pointer' : ''}`}
        disabled={currentStep < 4}
        title="Step 4: Verificare și trimitere"
      >
        <span className="w-6 h-6 flex items-center justify-center">4</span>
      </button>
    </div>
  );
};
