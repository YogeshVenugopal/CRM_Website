import React, { useState, useEffect } from 'react';
import { mockService } from '../../mock/mockService';
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

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const [leads, opps, projs, invs] = await Promise.all([
          mockService.getLeads(),
          mockService.getOpportunities(),
          mockService.getProjects(),
          mockService.getInvoices(),
        ]);

        const pipelineVal = opps.filter(o => o.stage !== 'won').reduce((a, b) => a + (b.value || 0), 0);
        const totalInvoiced = invs.reduce((a, b) => a + (b.total || 0), 0);
        const totalPaid = invs.reduce((a, b) => a + (b.paidAmount || 0), 0);

        setMetrics({
          leadsCount: leads.length,
          oppsCount: opps.length,
          pipelineVal,
          totalInvoiced,
          totalPaid,
          opps,
          projs,
          invs,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

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
