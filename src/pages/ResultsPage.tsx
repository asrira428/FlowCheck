import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

const ResultsPage = () => {
  const navigate = useNavigate();

  // Loan score (0-100)
  const loanScore = 82;
  
  // DTI calculation
  const totalMonthlyDebt = 2400;
  const totalMonthlyIncome = 7000;
  const dtiRatio = ((totalMonthlyDebt / totalMonthlyIncome) * 100).toFixed(1);
  
  const getDtiRisk = (ratio: number) => {
    if (ratio <= 28) return { label: "Low risk", color: "text-emerald-600" };
    if (ratio <= 36) return { label: "Moderate risk", color: "text-yellow-600" };
    return { label: "High risk", color: "text-red-600" };
  };
  
  const dtiRisk = getDtiRisk(parseFloat(dtiRatio));

  const getLoanVerdict = (score: number) => {
    if (score >= 80) return { label: "Likely Approved", color: "text-emerald-600" };
    if (score >= 60) return { label: "Requires Review", color: "text-yellow-600" };
    return { label: "High Risk", color: "text-red-600" };
  };
  
  const loanVerdict = getLoanVerdict(loanScore);

  // Flagged statements data
  const flaggedStatements = [
    { filename: "statement_march_2024.pdf", reason: "Missing transaction data", status: "⚠️ Inconsistent Data" },
    { filename: "statement_april_2024.pdf", reason: "PDF corruption detected", status: "❌ Unreadable" },
  ];

  // Placeholder data for charts
  const monthlyData = [
    { month: 'Jan', deposits: 15000, withdrawals: 12000 },
    { month: 'Feb', deposits: 18000, withdrawals: 14000 },
    { month: 'Mar', deposits: 16000, withdrawals: 13000 },
    { month: 'Apr', deposits: 20000, withdrawals: 15000 },
    { month: 'May', deposits: 22000, withdrawals: 16000 },
    { month: 'Jun', deposits: 19000, withdrawals: 14500 },
  ];

  const balanceData = [
    { month: 'Jan', balance: 45000 },
    { month: 'Feb', balance: 49000 },
    { month: 'Mar', balance: 52000 },
    { month: 'Apr', balance: 57000 },
    { month: 'May', balance: 63000 },
    { month: 'Jun', balance: 67500 },
  ];

  const spendingData = [
    { category: 'Operations', value: 45, amount: 18000 },
    { category: 'Payroll', value: 30, amount: 12000 },
    { category: 'Marketing', value: 15, amount: 6000 },
    { category: 'Utilities', value: 10, amount: 4000 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const chartConfig = {
    deposits: {
      label: "Deposits",
      color: "#10b981",
    },
    withdrawals: {
      label: "Withdrawals", 
      color: "#ef4444",
    },
    balance: {
      label: "Balance",
      color: "#3b82f6",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SB</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">SmartBank Auditor</h1>
            </div>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/processing')}
                className="text-slate-600 border-slate-300 hover:bg-slate-50"
              >
                Back to Processing
              </Button>
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Financial Health Report
          </h2>
          <p className="text-lg text-slate-600">
            Comprehensive analysis based on your bank statement data
          </p>
        </div>

        {/* Loan Score Meter */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-emerald-50 border-blue-200">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-slate-800">Loan Eligibility Score</CardTitle>
            <CardDescription>Overall creditworthiness assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Score Bar */}
              <div className="relative w-full h-8 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full">
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border-4 border-slate-800 rounded-full shadow-lg flex items-center justify-center"
                  style={{ left: `${loanScore}%`, marginLeft: '-12px' }}
                >
                  <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
                </div>
              </div>
              
              {/* Score Label */}
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-800 mb-2">
                  Score: {loanScore}/100
                </div>
                <div className={`text-lg font-semibold ${loanVerdict.color} mb-2`}>
                  {loanVerdict.label}
                </div>
                <p className="text-sm text-slate-600">
                  0 = High Risk, 100 = Excellent Standing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-emerald-700">Net Cash Flow</CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-800">+$25,500</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-600">↗️ 12% increase from last period</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700">Total Deposits</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-800">$110,000</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600">📈 Consistent monthly growth</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-700">Total Withdrawals</CardDescription>
              <CardTitle className="text-3xl font-bold text-red-800">$84,500</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">📊 Well-controlled spending</p>
            </CardContent>
          </Card>

          {/* DTI Ratio Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700">Debt-to-Income Ratio</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-800">{dtiRatio}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm font-medium ${dtiRisk.color}`}>{dtiRisk.label}</p>
              <p className="text-xs text-purple-600 mt-1">
                ${totalMonthlyDebt.toLocaleString()} / ${totalMonthlyIncome.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Deposits vs Withdrawals */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Deposits vs Withdrawals</CardTitle>
              <CardDescription>Cash flow comparison over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="deposits" fill="#10b981" name="Deposits" />
                  <Bar dataKey="withdrawals" fill="#ef4444" name="Withdrawals" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Account Balance Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Account Balance Trend</CardTitle>
              <CardDescription>Balance progression over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} name="Balance" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Statements Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Flagged Statements</CardTitle>
            <CardDescription>Documents requiring attention or review</CardDescription>
          </CardHeader>
          <CardContent>
            {flaggedStatements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Reason Flagged</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedStatements.map((statement, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{statement.filename}</TableCell>
                      <TableCell>{statement.reason}</TableCell>
                      <TableCell>{statement.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>No flagged statements found</p>
                <p className="text-sm">All documents processed successfully</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spending Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Spending Breakdown by Category</CardTitle>
            <CardDescription>Distribution of expenses across different categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center justify-center space-y-6 lg:space-y-0 lg:space-x-12">
              <div className="w-full lg:w-1/2 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={spendingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {spendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold">{data.category}</p>
                              <p className="text-blue-600">${data.amount.toLocaleString()}</p>
                              <p className="text-slate-600">{data.value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2 space-y-4">
                {spendingData.map((item, index) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${item.amount.toLocaleString()}</div>
                      <div className="text-sm text-slate-500">{item.value}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Health Summary */}
        <Card className="bg-gradient-to-br from-emerald-50 to-blue-50 border-emerald-200">
          <CardHeader>
            <CardTitle className="text-emerald-800">Financial Health Assessment</CardTitle>
            <CardDescription>Overall evaluation based on analyzed data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-emerald-800 mb-3">Strengths</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <span className="text-emerald-600">✅</span>
                    <span>Positive cash flow trend</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-emerald-600">✅</span>
                    <span>Consistent deposit patterns</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="text-emerald-600">✅</span>
                    <span>Controlled spending habits</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-3">Loan Eligibility</h4>
                <div className="bg-emerald-100 border border-emerald-300 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <span className="font-bold text-emerald-800">APPROVED</span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    Based on financial analysis, this business shows strong creditworthiness with a recommended loan limit of <strong>$150,000</strong>.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResultsPage;
