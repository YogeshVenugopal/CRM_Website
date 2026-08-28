import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { mockService } from '../../mock/mockService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ChartCard } from '../../components/ui/ChartCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonMetric } from '../../components/ui/SkeletonRow';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const DashboardView = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('1m');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const [opps, projs, invs, leads, tasks] = await Promise.all([
          mockService.getOpportunities(),
          mockService.getProjects(),
          mockService.getInvoices(),
          mockService.getLeads(),
          mockService.getTasks(),
        ]);

        const pipelineVal = opps
          .filter((o) => o.stage !== 'won' && o.stage !== 'lost')
          .reduce((acc, curr) => acc + (curr.value || 0), 0);

        const wonThisMonth = opps
          .filter((o) => o.stage === 'won')
          .reduce((acc, curr) => acc + (curr.value || 0), 0);

        const overdueTotal = invs
          .filter((i) => i.status === 'overdue')
          .reduce((acc, curr) => acc + (curr.balance || 0), 0);

        setData({
          pipelineVal,
          wonThisMonth,
          overdueTotal,
          oppsCount: opps.length,
          leadsCount: leads.length,
          projsCount: projs.length,
          invs,
          opps,
          projs,
          tasks,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [role]);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    );
  }

  // Monthly Revenue Trend Data
  const trendData = [
    { label: 'Jan', value: 450000, secondary: 210000 },
    { label: 'Feb', value: 520000, secondary: 300000 },
    { label: 'Mar', value: 680000, secondary: 410000 },
    { label: 'Apr', value: 850000, secondary: 590000 },
    { label: 'May', value: 940000, secondary: 620000 },
    { label: 'Jun', value: 1250000, secondary: 880000 },
  ];

  // Pipeline Stage Distribution
  const stageDistribution = [
    { name: 'Prospecting', value: 25, color: '#3B5BFD' },
    { name: 'Proposal', value: 45, color: '#22D3EE' },
    { name: 'Negotiation', value: 20, color: '#FDB022' },
    { name: 'Won', value: 10, color: '#10B981' },
  ];

  const timeRanges = ['1d', '1w', '2w', '1m', '1y', 'all'];

  // Custom Dark Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1B1D29] text-white p-3 rounded-2xl shadow-xl text-xs font-mono border border-white/10">
          <p className="font-bold text-white mb-1">{label}</p>
          <p className="text-[#3B5BFD] font-bold">
            Revenue: {formatCurrency(payload[0].value)}
          </p>
          {payload[1] && (
            <p className="text-[#FDB022] font-semibold">
              Target: {formatCurrency(payload[1].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Welcome back, {user?.name || 'Executive'}
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Operational dashboard for role: <span className="font-semibold text-[#3B5BFD] capitalize">{role}</span>
          </p>
        </div>
      </div>

      {/* Overview Stat Cards with Segmented Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Pipeline Value */}
        <div className="card-shell space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">
              Active Pipeline Value
            </span>
            <span className="w-8 h-8 rounded-full bg-[#3B5BFD]/10 text-[#3B5BFD] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>

          <div className="text-3xl font-extrabold font-mono text-[#16181D]">
            {formatCurrency(data.pipelineVal)}
          </div>

          {/* Segmented Horizontal Stacked Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="h-2 w-full bg-[#EEF1FA] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#3B5BFD] w-[45%]" />
              <div className="h-full bg-[#22D3EE] w-[30%]" />
              <div className="h-full bg-[#FDB022] w-[25%]" />
            </div>

            {/* Dot Legend Row */}
            <div className="flex items-center justify-between text-[11px] text-[#8A8FA3] font-medium pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3B5BFD]" />
                <span>Proposal 45%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                <span>Negotiation 30%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FDB022]" />
                <span>Initial 25%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Won Deals This Month */}
        <div className="card-shell space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">
              Won Revenue (This Month)
            </span>
            <span className="w-8 h-8 rounded-full bg-[#3B5BFD]/10 text-[#3B5BFD] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>

          <div className="text-3xl font-extrabold font-mono text-[#16181D]">
            {formatCurrency(data.wonThisMonth)}
          </div>

          <div className="space-y-2 pt-2">
            <div className="h-2 w-full bg-[#EEF1FA] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#3B5BFD] w-[70%]" />
              <div className="h-full bg-[#EEF1FA] w-[30%]" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A8FA3] font-medium pt-1">
              <span className="text-[#3B5BFD] font-bold">70% Target Reached</span>
              <span>Goal: ₹2,000,000</span>
            </div>
          </div>
        </div>

        {/* Card 3: Overdue Receivables */}
        <div className="card-shell space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">
              Overdue Receivables
            </span>
            <span className="w-8 h-8 rounded-full bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </span>
          </div>

          <div className="text-3xl font-extrabold font-mono text-[#EF4444]">
            {formatCurrency(data.overdueTotal)}
          </div>

          <div className="space-y-2 pt-2">
            <div className="h-2 w-full bg-[#EEF1FA] rounded-full overflow-hidden flex">
              <div className="h-full bg-[#EF4444] w-[35%]" />
              <div className="h-full bg-[#EEF1FA] w-[65%]" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8A8FA3] font-medium pt-1">
              <span className="text-[#EF4444] font-bold">2 Invoices Pending</span>
              <span>Requires Collections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Chart Card: Dual-Tone Smooth Line/Area Chart */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Commercial Revenue Trend"
            subtitle="Closed deal value vs monthly baseline projection"
            action={
              <div className="flex items-center gap-1 bg-[#EEF1FA] p-1 rounded-full">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      timeRange === range
                        ? 'bg-[#3B5BFD] text-white shadow-xs'
                        : 'text-[#8A8FA3] hover:text-[#16181D]'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B5BFD" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B5BFD" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FDB022" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FDB022" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#8A8FA3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A8FA3" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#3B5BFD" strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" />
                <Area type="monotone" dataKey="secondary" stroke="#FDB022" strokeWidth={2} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorSecondary)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Breakdown Card: Concentric Multi-Ring Radial Chart */}
        <div className="lg:col-span-1">
          <ChartCard title="Deal Stage Breakdown" subtitle="Opportunity concentration">
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Legend List */}
              <div className="w-full space-y-2 pt-2 border-t border-[#EEF1FA]">
                {stageDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-medium text-[#16181D]">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono text-[#8A8FA3]">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Actionable Exceptions Card */}
      <div className="card-shell space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A8FA3]">
          Priority Actionable Items
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#EEF1FA]/50 border border-[#EEF1FA] space-y-2">
            <Badge status="overdue" customLabel="Overdue Invoice" />
            <div className="font-bold text-xs text-[#16181D]">Acme Corp — ₹4,50,000</div>
            <div className="text-[11px] text-[#8A8FA3]">Payment past due by 12 days</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#EEF1FA]/50 border border-[#EEF1FA] space-y-2">
            <Badge status="proposal" customLabel="Pending Proposal" />
            <div className="font-bold text-xs text-[#16181D]">Website Revamp & CMS</div>
            <div className="text-[11px] text-[#8A8FA3]">Quotation QT-2026-001 sent</div>
          </div>
          <div className="p-4 rounded-2xl bg-[#EEF1FA]/50 border border-[#EEF1FA] space-y-2">
            <Badge status="in_progress" customLabel="Project Milestones" />
            <div className="font-bold text-xs text-[#16181D]">ERP Phase 1 Setup</div>
            <div className="text-[11px] text-[#8A8FA3]">3 tasks remaining for sprint</div>
          </div>
        </div>
      </div>
    </div>
  );
};
