import React, { useState, useEffect, useCallback } from 'react';
import { reportsApi, financeApi, opportunitiesApi } from '../../lib/api';
import { formatCurrency } from '../../utils/formatters';
import { ChartCard } from '../../components/ui/ChartCard';
import { SkeletonMetric } from '../../components/ui/SkeletonRow';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const ReportsOverview = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [pipelineRes, financeRes, projectRes, oppsRes, invsRes] = await Promise.allSettled([
        reportsApi.salesPipeline(),
        reportsApi.financeOverview(),
        reportsApi.projectStatus(),
        opportunitiesApi.list({ limit: 100 }),
        financeApi.listInvoices({ limit: 100 }),
      ]);

      const pipeline = pipelineRes.status === 'fulfilled' ? pipelineRes.value : {};
      const finance = financeRes.status === 'fulfilled' ? financeRes.value : {};
      const projectStatus = projectRes.status === 'fulfilled' ? projectRes.value : {};
      const opps = oppsRes.status === 'fulfilled' ? oppsRes.value.data : [];
      const invs = invsRes.status === 'fulfilled' ? invsRes.value.data : [];

      const pipelineVal = opps.filter(o => o.stage !== 'won' && o.stage !== 'lost').reduce((a, b) => a + (b.value || 0), 0);
      const totalInvoiced = invs.reduce((a, b) => a + (b.total || 0), 0);
      const totalPaid = invs.reduce((a, b) => a + (b.paidAmount || 0), 0);

      setMetrics({
        leadsCount: pipeline.opportunities || opps.length || 0,
        oppsCount: opps.length,
        pipelineVal: pipeline.pipelineValue || pipelineVal,
        totalInvoiced: finance.totalInvoiced || totalInvoiced,
        totalPaid: finance.totalPaid || totalPaid,
        opps,
        projs: [],
        invs,
      });
    } catch (e) {
      console.error('Reports fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    );
  }

  const pipelineByStage = [
    { name: 'Prospecting', value: metrics.opps.filter(o => o.stage === 'prospecting').length, color: '#8A8FA3' },
    { name: 'Qualification', value: metrics.opps.filter(o => o.stage === 'qualification').length, color: '#FDB022' },
    { name: 'Proposal', value: metrics.opps.filter(o => o.stage === 'proposal').length, color: '#22D3EE' },
    { name: 'Negotiation', value: metrics.opps.filter(o => o.stage === 'negotiation').length, color: '#3B5BFD' },
    { name: 'Won', value: metrics.opps.filter(o => o.stage === 'won').length, color: '#10B981' },
  ];

  const financialDistribution = [
    { name: 'Total Paid', value: metrics.totalPaid, color: '#3B5BFD' },
    { name: 'Outstanding Balance', value: metrics.totalInvoiced - metrics.totalPaid, color: '#FDB022' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold font-display text-[#16181D]">
          Business Operations Analytics
        </h1>
        <p className="text-xs text-[#8A8FA3] mt-0.5">
          Cross-departmental performance reports, revenue conversion, and project tracking
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card-shell">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">Active Pipeline Value</span>
          <div className="text-3xl font-extrabold font-mono text-[#3B5BFD] mt-2">
            {formatCurrency(metrics.pipelineVal)}
          </div>
        </div>

        <div className="card-shell">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">Total Invoiced</span>
          <div className="text-3xl font-extrabold font-mono text-[#16181D] mt-2">
            {formatCurrency(metrics.totalInvoiced)}
          </div>
        </div>

        <div className="card-shell">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A8FA3]">Collections Efficiency</span>
          <div className="text-3xl font-extrabold font-mono text-[#10B981] mt-2">
            {Math.round((metrics.totalPaid / (metrics.totalInvoiced || 1)) * 100)}%
          </div>
        </div>
      </div>

      {/* Analytical Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Pipeline Stage Conversion" subtitle="Deals count by stage">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={pipelineByStage}>
              <XAxis dataKey="name" stroke="#8A8FA3" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#8A8FA3" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1B1D29', borderColor: 'transparent', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {pipelineByStage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Collections Distribution" subtitle="Paid revenue vs pending collection">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={financialDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {financialDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [formatCurrency(val), 'Amount']}
                contentStyle={{ backgroundColor: '#1B1D29', borderColor: 'transparent', borderRadius: '16px', color: '#fff', fontSize: '12px' }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};
