
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadArea from '@/components/UploadArea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loanAmount, setLoanAmount] = useState<string>('');
  const navigate = useNavigate();

  const handleFileSelect = (file: File) => {
    console.log("Received in Index:", file);
    setSelectedFile(file);
  };

  const handleLoanAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setLoanAmount(value);
    }
  };

  // const handleStartAnalysis = async () => {
  //   if (!selectedFile || !loanAmount) return;
    
  //   // TODO: Integrate with Python backend running LlamaParse
  //   // const formData = new FormData();
  //   // formData.append('pdf', selectedFile);
  //   // formData.append('loanAmount', loanAmount);
  //   // const response = await fetch('/api/analyze', {
  //   //   method: 'POST',
  //   //   body: formData
  //   // });
    
  //   console.log('Starting analysis for:', selectedFile.name, 'Loan amount:', loanAmount);
  //   navigate('/processing', { state: { filename: selectedFile.name, loanAmount } });
  // };
  const handleStartAnalysis = async () => {
    if (!selectedFile || !loanAmount) {
      console.warn("Missing file or loan amount");
      return;
    }
  
    const formData = new FormData();
    formData.append("file", selectedFile); // Must match FastAPI param
    formData.append("loan_amount", loanAmount.toString());
  
    try {
      const response = await fetch("http://localhost:5050/analyze", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        console.error("Server returned an error:", response.statusText);
        return;
      }
  
      const { session_id } = await response.json();
+     console.log("Received session_id:", session_id);
      navigate('/processing', { state: { session_id, filename: selectedFile.name, loanAmount } });
    } catch (error) {
      console.error("Failed to analyze file:", error);
    }
  };
  

  const isFormValid = selectedFile && loanAmount && parseFloat(loanAmount) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FC</span>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">FlowCheck</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Analyze Your Business Financial Health
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Upload your bank statements and get instant insights into your business loan eligibility 
            and financial performance using advanced AI analysis.
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Upload Bank Statement
            </h3>
            <p className="text-slate-600">
              Select a PDF bank statement from any financial institution for analysis.
            </p>
          </div>

          {/* Loan Amount Input */}
          <div className="mb-6">
            <label htmlFor="loanAmount" className="block text-sm font-medium text-slate-700 mb-2">
              Loan Amount Requested (USD)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-500 text-sm">$</span>
              </div>
              <Input
                id="loanAmount"
                type="text"
                value={loanAmount}
                onChange={handleLoanAmountChange}
                placeholder="0.00"
                className="pl-8 text-slate-900"
              />
            </div>
          </div>

          <UploadArea onFileSelect={handleFileSelect} selectedFile={selectedFile} />

          {selectedFile && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{selectedFile.name}</p>
                  <p className="text-sm text-slate-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="text-emerald-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleStartAnalysis}
            disabled={!isFormValid}
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!selectedFile ? 'Select a file to continue' : 
             !loanAmount ? 'Enter loan amount to continue' :
             'Start Analysis'}
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Smart Parsing</h4>
            <p className="text-sm text-slate-600">Advanced AI automatically detects document structure and extracts transaction data</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Financial Analysis</h4>
            <p className="text-sm text-slate-600">Comprehensive evaluation of cash flow patterns and financial health indicators</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Instant Results</h4>
            <p className="text-sm text-slate-600">Get immediate loan eligibility assessment and actionable financial insights</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
