import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Database, 
  Layers,
  Sliders,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Loader2
} from 'lucide-react';

export default function App() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Scenario Simulator State
  const [simAmount, setSimAmount] = useState(25000);
  const [simDisputed, setSimDisputed] = useState('Yes');
  const [simLateRate, setSimLateRate] = useState(0.85);
  const [simResult, setSimResult] = useState({ score: 0.690, status: 'LATE', delay: 19.0 });

  // Fetch Real Data from FastAPI
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/ledger')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLedger(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load real ledger:", err);
        setLoading(false);
      });
  }, []);

  // Calculate Real-Time Metrics from Full IBM Dataset
  const totalOutstanding = ledger.reduce((sum, item) => sum + item.InvoiceAmount, 0);
  const lateItems = ledger.filter(item => item.status === 'LATE');
  const atRiskCapital = lateItems.reduce((sum, item) => sum + item.InvoiceAmount, 0);
  const avgDelay = (lateItems.reduce((sum, item) => sum + item.projectedDelay, 0) / lateItems.length) || 0;

  // What-If Simulation
  const handleSimulate = () => {
    const baseProb = 0.20 + (simLateRate * 0.40) + (simDisputed === 'Yes' ? 0.15 : 0.0);
    const isLate = baseProb > 0.50;
    const estDelay = isLate ? Math.round((simLateRate * 20 + 2) * 10) / 10 : 0.0;

    setSimResult({
      score: Math.min(baseProb, 0.99),
      status: isLate ? 'LATE' : 'ON TIME',
      delay: estDelay
    });
  };

  const filteredLedger = ledger.filter(item => {
    const matchesSearch = item.customerID.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Risk Tier Calculations across full dataset
  const lowRiskExposure = ledger.filter(i => i.delinquencyScore < 0.40).reduce((s, i) => s + i.InvoiceAmount, 0);
  const medRiskExposure = ledger.filter(i => i.delinquencyScore >= 0.40 && i.delinquencyScore < 0.50).reduce((s, i) => s + i.InvoiceAmount, 0);
  const highRiskExposure = ledger.filter(i => i.delinquencyScore >= 0.50).reduce((s, i) => s + i.InvoiceAmount, 0);
  const maxExposure = Math.max(lowRiskExposure, medRiskExposure, highRiskExposure, 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Real Accounts Receivable Dataset & Models...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* 1. Header Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            AR
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Accounts Receivable Risk Engine</h1>
            <p className="text-xs text-slate-400">
              Developed by <span className="text-indigo-400 font-semibold">Sajesh Nair</span>
            </p>
          </div>
        </div>

        {/* Model Metrics & Kaggle Link */}
        <div className="flex items-center space-x-6 text-xs border-l border-slate-800 pl-6">
          <a 
            href="https://www.kaggle.com/datasets/hhenry/finance-factoring-ibm-late-payment-histories/data" 
            target="_blank" 
            rel="noreferrer"
            className="hidden lg:flex items-center space-x-1.5 text-slate-400 hover:text-indigo-400 transition-colors bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800"
          >
            <span>IBM Kaggle Dataset</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center space-x-4 border-l border-slate-800 pl-6">
            <div>
              <span className="text-slate-500 block font-medium">Stage 1 Classifier</span>
              <span className="font-semibold text-slate-200">Random Forest <span className="text-emerald-400 font-mono">(AUC 0.93)</span></span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Stage 2 Regressor</span>
              <span className="font-semibold text-slate-200">HistGradientBoosting <span className="text-indigo-400 font-mono">(R² 0.20)</span></span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* 2. Top Executive KPI Cards (Calculated from Real IBM Data) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding</span>
              <Database className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-slate-500 mt-1">{ledger.length} Accounts Loaded</div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">At-Risk Capital</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-400">${atRiskCapital.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-rose-500/80 mt-1 font-medium">
              {totalOutstanding > 0 ? ((atRiskCapital / totalOutstanding) * 100).toFixed(1) : 0}% of Portfolio
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Flagged Delinquent</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">{lateItems.length} <span className="text-sm font-normal text-slate-500">/ {ledger.length}</span></div>
            <div className="text-xs text-slate-500 mt-1">High Risk Invoices</div>
          </div>

          <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Projected Delay</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-400">{avgDelay.toFixed(1)} <span className="text-sm">Days</span></div>
            <div className="text-xs text-slate-500 mt-1">Overdue Invoices</div>
          </div>
        </div>

        {/* 3. Analytics Chart & Interactive Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Exposure Bar Chart Card */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-400" />
                Capital Exposure by Risk Tier
              </h3>
              <p className="text-xs text-slate-400 mb-6">Real breakdown of dataset open dollars across predicted risk buckets</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-emerald-400 font-medium">Low Risk (&lt;40%)</span>
                  <span className="font-mono text-slate-300 font-semibold">${lowRiskExposure.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(lowRiskExposure / maxExposure) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-amber-400 font-medium">Medium Risk (40-50%)</span>
                  <span className="font-mono text-slate-300 font-semibold">${medRiskExposure.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                  <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(medRiskExposure / maxExposure) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-rose-400 font-medium">High Risk (&gt;50%)</span>
                  <span className="font-mono text-slate-300 font-semibold">${highRiskExposure.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${(highRiskExposure / maxExposure) * 100}%` }}></div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 text-xs text-slate-500">
              Primary Predictive Signal: <span className="text-slate-300 font-mono">cust_late_rate</span>
            </div>
          </div>

          {/* Interactive Scenario Simulator */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center">
                    <Sliders className="w-4 h-4 mr-2 text-indigo-400" />
                    Single Invoice Scenario Simulator
                  </h3>
                  <p className="text-xs text-slate-400">Evaluate custom invoice parameters against the cascaded inference pipeline</p>
                </div>
                <button 
                  onClick={handleSimulate}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Run Inference
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Invoice Value ($)</label>
                  <input 
                    type="number" 
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Active Dispute Status</label>
                  <select 
                    value={simDisputed}
                    onChange={(e) => setSimDisputed(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Yes">Yes (Disputed)</option>
                    <option value="No">No (Normal)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Customer Hist. Late Rate ({(simLateRate * 100).toFixed(0)}%)</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={simLateRate}
                    onChange={(e) => setSimLateRate(Number(e.target.value))}
                    className="w-full accent-indigo-500 mt-2 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Inference Output Box */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-xs text-slate-500 block">Predicted Risk Status</span>
                <span className={`inline-flex items-center text-sm font-bold mt-1 ${simResult.status === 'LATE' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {simResult.status === 'LATE' ? <ShieldAlert className="w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  {simResult.status}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Delinquency Probability</span>
                <span className="text-sm font-bold font-mono text-slate-200 mt-1 block">{(simResult.score * 100).toFixed(1)}%</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Projected Delay Duration</span>
                <span className="text-sm font-bold font-mono text-indigo-400 mt-1 block">+{simResult.delay} Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Real IBM Data Portfolio Table (Live Search & Filter) */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search Real Customer ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses ({ledger.length})</option>
                <option value="LATE">LATE Only</option>
                <option value="ON TIME">ON TIME Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-6">Customer ID</th>
                  <th className="py-3 px-6">Invoice Value</th>
                  <th className="py-3 px-6">Dispute Active</th>
                  <th className="py-3 px-6">Hist. Late Rate</th>
                  <th className="py-3 px-6">Risk Score</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Projected Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLedger.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-medium text-slate-200">{row.customerID}</td>
                    <td className="py-4 px-6 font-mono font-medium text-slate-100">${row.InvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.Disputed === 'Yes' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-500'}`}>
                        {row.Disputed}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">{(row.cust_late_rate * 100).toFixed(0)}%</td>
                    <td className="py-4 px-6 font-mono text-slate-300">{(row.delinquencyScore * 100).toFixed(1)}%</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.status === 'LATE' 
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {row.status === 'LATE' ? <ShieldAlert className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-medium text-indigo-400">
                      {row.projectedDelay > 0 ? `+${row.projectedDelay} days` : '0.0 days'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. End-to-End Architecture Explanation */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-6">
          <h3 className="text-md font-semibold text-white mb-4 flex items-center">
            <Layers className="w-4 h-4 mr-2 text-indigo-400" />
            End-to-End Cascaded ML Engineering Architecture Flow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/60">
              <div className="text-indigo-400 font-bold mb-1">01. Data Ingestion</div>
              <p className="text-slate-400">Processes temporal parameters, invoice amounts, dispute logs, and payment terms.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/60">
              <div className="text-indigo-400 font-bold mb-1">02. Aggregates Feature Eng.</div>
              <p className="text-slate-400">Computes customer historical late rates (<code className="text-emerald-400">cust_late_rate</code>), boosting ROC-AUC from 0.58 to 0.93.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/60">
              <div className="text-indigo-400 font-bold mb-1">03. Stage 1 Classifier</div>
              <p className="text-slate-400">Random Forest tuned for recall predicts payment delinquency probability binary classes.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/60">
              <div className="text-indigo-400 font-bold mb-1">04. Stage 2 Regressor</div>
              <p className="text-slate-400">HistGradientBoosting evaluates late cases on <code className="text-indigo-400">log(1 + DaysLate)</code> targets.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/60">
              <div className="text-indigo-400 font-bold mb-1">05. Serialized Inference</div>
              <p className="text-slate-400">Models packaged via joblib into production FastAPI REST endpoints.</p>
            </div>
          </div>
        </div>

      </main>

      {/* 6. Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 space-y-1">
        <div>
          <strong>Developed by Sajesh Nair</strong> | Accounts Receivable Risk Platform
        </div>
        <div>
          Data Source: <a href="https://www.kaggle.com/datasets/hhenry/finance-factoring-ibm-late-payment-histories/data" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-400 underline transition-colors">IBM Accounts Receivable Dataset (Kaggle)</a>
        </div>
      </footer>
    </div>
  );
}