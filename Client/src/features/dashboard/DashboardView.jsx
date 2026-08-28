import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { opportunitiesApi, projectsApi, financeApi, leadsApi, tasksApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ChartCard } from '../../components/ui/ChartCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonMetric } from '../../components/ui/SkeletonRow';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowRight,
  BarChart3,
  Briefcase,
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [oppsRes, projsRes, invsRes, leadsRes, tasksRes] = await Promise.allSettled([
        opportunitiesApi.list({ limit: 100 }),
        projectsApi.list({ limit: 100 }),
        financeApi.listInvoices({ limit: 100 }),
        leadsApi.list({ limit: 100 }),
        tasksApi.list({ limit: 100 }),
      ]);

      const opps = oppsRes.status === 'fulfilled' ? oppsRes.value.data : [];
      const projs = projsRes.status === 'fulfilled' ? projsRes.value.data : [];
      const invs = invsRes.status === 'fulfilled' ? invsRes.value.data : [];
      const leads = leadsRes.status === 'fulfilled' ? leadsRes.value.data : [];
      const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];

      // Compute real metrics
      const pipelineVal = opps
        .filter((o) => !['won', 'lost'].includes(o.stage))
        .reduce((acc, curr) => acc + (curr.value || 0), 0);

      const wonValue = opps
        .filter((o) => o.stage === 'won')
        .reduce((acc, curr) => acc + (curr.value || 0), 0);

      const lostValue = opps
        .filter((o) => o.stage === 'lost')
        .reduce((acc, curr) => acc + (curr.value || 0), 0);

      const totalInvoiced = invs.reduce((acc, curr) => acc + (curr.total || 0), 0);
      const totalPaid = invs.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
      const overdueTotal = invs
        .filter((i) => i.status === 'overdue')
        .reduce((acc, curr) => acc + (curr.balance || 0), 0);

      // Pipeline by stage for pie chart
      const stageCounts = {};
      opps.forEach((o) => {
        if (!['won', 'lost'].includes(o.stage)) {
          stageCounts[o.stage] = (stageCounts[o.stage] || 0) + 1;
        }
      });

      // Recent opportunities for activity feed
      const recentOpps = [...opps]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      // Open tasks
      const openTasks = tasks.filter((t) => t.status !== 'done');

      setData({
        pipelineVal,
        wonValue,
        lostValue,
        totalInvoiced,
        totalPaid,
        overdueTotal,
        oppsCount: opps.length,
        leadsCount: leads.length,
        projsCount: projs.length,
        tasksCount: openTasks.length,
        stageCounts,
        invs,
        opps,
        projs,
        tasks,
        recentOpps,
        openTasks: openTasks.slice(0, 5),
      });
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
        </div>
      </div>
    );
  }

  // Pipeline stage distribution for pie chart
  const stageColors = {
    prospecting: '#8A8FA3',
    qualification: '#FDB022',
    proposal: '#22D3EE',
    negotiation: '#3B5BFD',
  };

  const pieData = Object.entries(data.stageCounts).map(([stage, count]) => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    value: count,
    color: stageColors[stage] || '#8A8FA3',
  }));

  // Monthly trend (last 6 months from real data)
  const monthlyData = (() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });
      const monthStart = d.toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();

      const monthInvoiced = data.invs
        .filter((inv) => {
          const created = new Date(inv.createdAt);
          return created >= new Date(monthStart) && created <= new Date(monthEnd);
        })
        .reduce((acc, inv) => acc + (inv.total || 0), 0);

      const monthPaid = data.invs
        .filter((inv) => {
          const created = new Date(inv.createdAt);
          return created >= new Date(monthStart) && created <= new Date(monthEnd);
        })
        .reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);

      months.push({ label: monthLabel, invoiced: monthInvoiced, paid: monthPaid });
    }
    return months;
  })();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1B1D29] text-white p-3 rounded-2xl shadow-xl text-xs font-mono border border-white/10">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }} className="font-semibold">
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-[#16181D]">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-xs text-[#8A8FA3] mt-0.5">
          Here's what's happening across your business today
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Value */}
        <div className="card-shell space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8FA3]">Pipeline Value</span>
            <div className="w-8 h-8 rounded-lg bg-[#3B5BFD]/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#3B5BFD]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#16181D]">
            {formatCurrency(data.pipelineVal)}
          </div>
          <div className="text-[11px] text-[#8A8FA3]">
            {data.opps.filter((o) => !['won', 'lost'].includes(o.stage)).length} active deals
          </div>
        </div>

        {/* Won Revenue */}
        <div className="card-shell space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8FA3]">Won Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-[#10B981]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#10B981]">
            {formatCurrency(data.wonValue)}
          </div>
          <div className="text-[11px] text-[#8A8FA3]">
            {data.opps.filter((o) => o.stage === 'won').length} won deals
          </div>
        </div>

        {/* Overdue */}
        <div className="card-shell space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8FA3]">Overdue</span>
            <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#EF4444]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#EF4444]">
            {formatCurrency(data.overdueTotal)}
          </div>
          <div className="text-[11px] text-[#8A8FA3]">
            {data.invs.filter((i) => i.status === 'overdue').length} overdue invoices
          </div>
        </div>

        {/* Open Tasks */}
        <div className="card-shell space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A8FA3]">Open Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-[#F59E0B]" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#16181D]">
            {data.tasksCount}
          </div>
          <div className="text-[11px] text-[#8A8FA3]">
            across {data.projsCount} projects
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2">
          <ChartCard title="Revenue Trend" subtitle="Invoiced vs collected over last 6 months">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradInvoiced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B5BFD" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B5BFD" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#8A8FA3" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#8A8FA3" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#3B5BFD" strokeWidth={2} fillOpacity={1} fill="url(#gradInvoiced)" />
                <Area type="monotone" dataKey="paid" name="Collected" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#gradPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Pipeline Breakdown */}
        <div>
          <ChartCard title="Pipeline Breakdown" subtitle="Active deals by stage">
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2 pt-2 border-t border-[#EEF1FA]">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs font-medium text-[#16181D]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-mono text-[#8A8FA3]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-xs text-[#8A8FA3]">
                <BarChart3 className="w-8 h-8 mb-2 text-[#8A8FA3]/30" />
                No pipeline data yet
              </div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Activity & Tasks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <div className="card-shell space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">Recent Deals</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>
              View Pipeline <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {data.recentOpps.length === 0 ? (
            <EmptyState title="No deals yet" description="Create your first opportunity to get started." />
          ) : (
            <div className="space-y-2">
              {data.recentOpps.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => navigate('/pipeline')}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#EEF1FA]/40 border border-[#EEF1FA] hover:border-[#3B5BFD]/30 cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#16181D] truncate">{opp.title}</div>
                    <div className="text-[11px] text-[#8A8FA3]">{opp.clientName || 'No client'}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono font-bold text-[#3B5BFD]">{formatCurrency(opp.value)}</span>
                    <Badge status={opp.stage} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Tasks */}
        <div className="card-shell space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">Open Tasks</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
              View Board <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {data.openTasks.length === 0 ? (
            <EmptyState title="No open tasks" description="All caught up!" />
          ) : (
            <div className="space-y-2">
              {data.openTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate('/tasks')}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#EEF1FA]/40 border border-[#EEF1FA] hover:border-[#3B5BFD]/30 cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#16181D] truncate">{task.title}</div>
                    <div className="text-[11px] text-[#8A8FA3]">{task.projectName || 'No project'}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge status={task.priority} size="sm" />
                    <Badge status={task.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
