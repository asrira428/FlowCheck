
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Circle } from 'lucide-react'

interface ProcessingStep {
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed';
}

const ProcessingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    session_id = '',
    filename = 'document.pdf',
    loanAmount = 0,
  } = (location.state as { session_id?: string; filename?: string; loanAmount?: number }) || {};

  const [currentStep, setCurrentStep] = useState<number>(0);

  const [finalResult, setFinalResult] = useState<any>(null);

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
      title: 'Financial Analysis',
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
    // We must have a session_id to proceed
    if (!session_id) {
      console.error('ProcessingPage: no session_id in location.state!');
      navigate('/');
      return;
    }
  
    let isMounted = true;
    let pollInterval: number;
  
    const pollProgress = async () => {
      try {
        const progressRes = await fetch(`http://localhost:5050/progress/${session_id}`);
        if (!progressRes.ok) throw new Error(`Progress ${progressRes.status}`);
        const { current_step: step } = await progressRes.json();
  
        if (!isMounted) return;
        setCurrentStep(step);
  
        setProcessedSteps(prev =>
          prev.map((stepObj, idx) => ({
            ...stepObj,
            status:
              idx < step
                ? 'completed'
                : idx === step
                ? 'processing'
                : 'pending',
          }))
        );
  
        if (step >= processedSteps.length) {
          clearInterval(pollInterval);
          const resultsRes = await fetch(`http://localhost:5050/results/${session_id}`);
          if (!resultsRes.ok) throw new Error(`Results ${resultsRes.status}`);
          const resultsJson = await resultsRes.json();
          if (!isMounted) return;
          setFinalResult(resultsJson);
          // navigate('/results', { state: resultsJson });
        }
      } catch (err) {
        console.error('Error polling /progress or fetching results:', err);
        if (!isMounted) return;
        clearInterval(pollInterval);
      }
    };
  
    pollInterval = window.setInterval(pollProgress, 1000);
    pollProgress();
  
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [session_id, navigate, processedSteps.length]);  


  const isComplete = currentStep >= steps.length;

  // const getStepIcon = (status: 'pending' | 'processing' | 'completed') => {
  //   switch (status) {
  //     case 'completed':
  //       return '✅';
  //     case 'processing':
  //       return '⏳';
  //     default:
  //       return '⭕';
  //   }
  // };
  const getStepIcon = (status: 'pending' | 'processing' | 'completed') => {
    switch (status) {
      case 'completed':
        return (
          <CheckCircle 
            className="w-6 h-6 text-emerald-500" 
            aria-label="Completed" 
          />
        )
      case 'processing':
        return (
          <Clock 
            className="w-6 h-6 text-yellow-500 animate-pulse" 
            aria-label="Processing" 
          />
        )
      default:
        return (
          <Circle 
            className="w-6 h-6 text-slate-300" 
            aria-label="Pending" 
          />
        )
    }
  }  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FC</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">FlowCheck</h1>
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
              : 'Our AI is analyzing your bank statement. This usually takes a minute.'
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
            {/* <Button
              onClick={() =>
                navigate('/results', {
                  state: analyzeResult,
                })
              }
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
            </Button> */}
            <Button
              onClick={() =>
                finalResult &&
                navigate('/results', {
                  state: finalResult,
                })
              }
              disabled={!isComplete}
              className={`px-8 py-3 text-lg font-medium transition-all duration-700 transform ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-lg opacity-100 translate-y-0'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50 translate-y-2'
              }`}
              style={{
                transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
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
