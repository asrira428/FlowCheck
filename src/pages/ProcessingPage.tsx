
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ProcessingStep {
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed';
}

const ProcessingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const filename = location.state?.filename || 'document.pdf';
  const [currentStep, setCurrentStep] = useState(0);

  const steps: ProcessingStep[] = [
    {
      title: 'Understanding Format',
      description: 'Inferring layout structure (tabular vs freeform)',
      status: 'pending'
    },
    {
      title: 'Transaction Extraction',
      description: 'Pulling financial activity with LlamaParse',
      status: 'pending'
    },
    {
      title: 'Currency Mapping',
      description: 'Recognizing symbols, formats, and normalization',
      status: 'pending'
    },
    {
      title: 'Data Integrity Checks',
      description: 'Identifying gaps, misalignments, and duplications',
      status: 'pending'
    },
    {
      title: 'Financial Signal Analysis',
      description: 'Detecting trends, volatility, and balance health',
      status: 'pending'
    },
    {
      title: 'Insight Generation',
      description: 'Mapping findings to risk and reliability metrics',
      status: 'pending'
    },
    {
      title: 'Report Ready',
      description: 'Summary generated — ready for review',
      status: 'pending'
    }
  ];

  const [processedSteps, setProcessedSteps] = useState<ProcessingStep[]>(steps);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = prev + 1;
        if (nextStep <= steps.length) {
          setProcessedSteps((prevSteps) => 
            prevSteps.map((step, index) => ({
              ...step,
              status: index < nextStep - 1 ? 'completed' : 
                     index === nextStep - 1 ? 'processing' : 'pending'
            }))
          );
          return nextStep;
        }
        clearInterval(interval);
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const isComplete = currentStep >= steps.length;

  const getStepIcon = (status: 'pending' | 'processing' | 'completed') => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '⏳';
      default:
        return '⭕';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">SmartBank Auditor</h1>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="text-slate-600 border-slate-300 hover:bg-slate-50"
            >
              New Analysis
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Processing Case for {filename}
          </h2>
          <p className="text-lg text-slate-600">
            {isComplete 
              ? 'Analysis complete! Your financial assessment is ready.'
              : 'Our AI is analyzing your bank statement. This usually takes 2-3 minutes.'
            }
          </p>
        </div>

        {/* Horizontal Timeline */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-600 to-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <p className="text-center text-sm text-slate-500">
              Step {currentStep} of {steps.length}
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="relative">
            <div className="flex justify-between items-start mb-8">
              {processedSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center flex-1">
                  {/* Step Icon */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-3 transition-all duration-500 ${
                    step.status === 'completed' ? 'bg-emerald-100' :
                    step.status === 'processing' ? 'bg-blue-100 animate-pulse' :
                    'bg-slate-100'
                  }`}>
                    {getStepIcon(step.status)}
                  </div>
                  
                  {/* Step Title */}
                  <h4 className="font-semibold text-slate-800 text-sm mb-1 max-w-24">
                    {step.title}
                  </h4>
                  
                  {/* Step Number */}
                  <span className="text-xs text-slate-500">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Active Step Description */}
            {currentStep > 0 && currentStep <= steps.length && (
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-slate-700">
                  {processedSteps[currentStep - 1]?.description}
                </p>
              </div>
            )}
          </div>

          {/* View Report Button */}
          <div className="mt-8 text-center">
            <Button
              onClick={() => navigate('/results')}
              disabled={!isComplete}
              className={`px-8 py-3 text-lg font-medium transition-all duration-700 transform ${
                isComplete 
                  ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg opacity-100 translate-y-0' 
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50 translate-y-2'
              }`}
              style={{
                transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              View Financial Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingPage;
