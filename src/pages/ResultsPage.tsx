import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLocation, useNavigate } from 'react-router-dom';

interface GeminiResult {
  session_id: string;
  loan_amount_requested: number;
  parsed_text: string[];
  transactions: Array<{
    description: string;
    currency: string;
    amount: number;
    direction: 'debit' | 'credit';
    balance: number;
  }>;
  normalized_data: Array<{
    description: string;
    amount: number;
    direction: 'debit' | 'credit';
    balance: number;
  }>;
  analysis_summary: {
    total_deposits: number;
    total_withdrawals: number;
    net_cash_flow: number;
    debt_to_income: number;
    monthly_flows: Record<
      string,
      {
        deposits: number;
        withdrawals: number;
        end_balance: number;
        debt_to_income: number;
      }
    >;
  };
  loan_score: number;
  summary_paragraph: string;
  spending_by_category: Record<string, number>;
  data_issues: Array<{ reason: string; transaction: any }>;
  status: string;
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Pull the Gemini result object out of location.state, or default to empty structure
  const finalResult = (location.state as GeminiResult) || ({} as GeminiResult);

  // If no session_id, send user back
  if (!finalResult || !finalResult.session_id) {
    navigate('/');
    return null;
  }

  // Destructure—use 0 or empty arrays when missing
  const {
    loan_score = 0,
    loan_amount_requested = 0,
    analysis_summary = {
      total_deposits: 0,
      total_withdrawals: 0,
      net_cash_flow: 0,
      debt_to_income: 0,
    },
    data_issues = [],
  } = finalResult;

  const {
    total_deposits = 0,
    total_withdrawals = 0,
    net_cash_flow = 0,
    debt_to_income = 0,
  } = analysis_summary;

  // Compute DTI % (e.g. debt_to_income = 0.1449 → 14.49%)
  const dtiRatio = (debt_to_income * 100).toFixed(1);
  const getDtiRisk = (ratio: number) => {
    if (ratio <= 28) return { label: 'Low risk', color: 'text-emerald-600' };
    if (ratio <= 36) return { label: 'Moderate risk', color: 'text-yellow-600' };
    return { label: 'High risk', color: 'text-red-600' };
  };
  const dtiRisk = getDtiRisk(parseFloat(dtiRatio));

  // Loan verdict based on numeric loan_score
  const getLoanVerdict = (score: number) => {
    if (score >= 80) return { label: 'Likely Approved', color: 'text-emerald-600' };
    if (score >= 60) return { label: 'Requires Review', color: 'text-yellow-600' };
    return { label: 'High Risk', color: 'text-red-600' };
  };
  const loanVerdict = getLoanVerdict(loan_score);

  // Empty arrays for now; charts will render but be empty
  // const monthlyData: Array<{ month: string; deposits: number; withdrawals: number }> = [];
  // const balanceData: Array<{ month: string; balance: number }> = [];
  // pull in the last 6 months from analysis_summary.monthly_flows
  const flows = finalResult.analysis_summary.monthly_flows || {};
  const entries = Object.entries(flows);
  // keep only the last 6 in chronological order
  const last6 = entries.slice(-6);

  const monthlyData = last6.map(([month, f]) => ({
    month,
    deposits: f.deposits,
    withdrawals: f.withdrawals,
  }));

  const balanceData = last6.map(([month, f]) => ({
    month,
    balance: f.end_balance,
  }));
  // const spendingData: Array<{ category: string; value: number; amount: number }> = [];
  const pct = finalResult.spending_by_category || {};
  const spendingData = Object.entries(pct).map(([category, value]) => ({
    category,
    value,
    amount: Math.round((value / 100) * total_withdrawals),
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const chartConfig = {
    deposits: {
      label: 'Deposits',
      color: '#10b981',
    },
    withdrawals: {
      label: 'Withdrawals',
      color: '#ef4444',
    },
    balance: {
      label: 'Balance',
      color: '#3b82f6',
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
                <span className="text-white font-bold text-sm">FC</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">FlowCheck</h1>
            </div>
            <div className="flex space-x-3">
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
        {/* Page Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Financial Health Report</h2>
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
                  style={{ left: `${loan_score}%`, marginLeft: '-12px' }}
                >
                  <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
                </div>
              </div>

              {/* Score Label */}
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-800 mb-2">Score: {loan_score}/100</div>
                <div className={`text-lg font-semibold ${loanVerdict.color} mb-2`}>
                  {loanVerdict.label}
                </div>
                <p className="text-sm text-slate-600">0 = High Risk, 100 = Excellent Standing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Net Cash Flow */}
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-emerald-700">Net Cash Flow</CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-800">
                ${net_cash_flow.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-emerald-600">
                {net_cash_flow === 0
                  ? '––'
                  : ` ${(
                      (net_cash_flow /
                        (total_deposits + total_withdrawals || 1)) *
                      100
                    ).toFixed(1)}% of total activity`}
              </p>
            </CardContent>
          </Card>

          {/* Total Deposits */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-blue-700">Total Deposits</CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-800">
                ${total_deposits.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-600">
                {total_deposits === 0 ? '––' : 'Year-to-date'}
              </p>
            </CardContent>
          </Card>

          {/* Total Withdrawals */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-red-700">Total Withdrawals</CardDescription>
              <CardTitle className="text-3xl font-bold text-red-800">
                ${total_withdrawals.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">
                {total_withdrawals === 0 ? '––' : 'Year-to-date'}
              </p>
            </CardContent>
          </Card>

          {/* Debt-to-Income Ratio */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-purple-700">Debt-to-Income Ratio</CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-800">{dtiRatio}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-purple-600 mt-1">
                {debt_to_income === 0 ? '––' : `${(debt_to_income * 100).toFixed(1)}% of income`}
              </p>
              <p className={`text-sm font-medium ${dtiRisk.color}`}>{dtiRisk.label}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Deposits vs Withdrawals */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Deposits vs Withdrawals</CardTitle>
              <CardDescription>Cash flow comparison over the last 3 months</CardDescription>
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
                  {/* allow negative */}
                  <YAxis domain={['dataMin', 'dataMax']} />
                  <ReferenceLine y={0} stroke="#aaa" strokeDasharray="3 3" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Balance"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        {/* Executive Summary */}
        <Card className="mb-8 bg-white border-slate-200">
          <CardHeader>
            <CardTitle>Financial Health Assessment</CardTitle>
            <CardDescription>Overall evaluation based on analyzed data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-base text-slate-700">
              {finalResult.summary_paragraph}
            </p>
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
                          const data = payload[0].payload as {
                            category: string;
                            amount: number;
                            value: number;
                          };
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold">{data.category}</p>
                              <p className="text-blue-600">
                                ${data.amount.toLocaleString()}
                              </p>
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
                {spendingData.length > 0 ? (
                  spendingData.map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="font-medium">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          ${item.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-slate-500">{item.value}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500">No category data</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Flagged Statements Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Flagged Statements</CardTitle>
            <CardDescription>Documents requiring attention or review</CardDescription>
          </CardHeader>
          <CardContent>
            {data_issues.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data_issues.map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{issue.reason}</TableCell>
                      <TableCell>
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(issue.transaction, null, 2)}
                        </pre>
                      </TableCell>
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
      </div>
    </div>
  );
};

export default ResultsPage;
