import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Timeline } from '../../components/ui/Timeline';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, Kanban, Briefcase, CreditCard } from 'lucide-react';

export const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch360 = async () => {
      setLoading(true);
      try {
        const res = await mockService.getClient360(id || 'cli-201');
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch360();
  }, [id]);

  if (loading || !data) {
    return <div className="p-8 text-center text-sm font-mono text-[#8A8FA3]">Loading Client 360° Profile...</div>;
  }

  const { client, opportunities, quotations, projects, invoices, activities } = data;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        customItems={[
          { label: 'Clients', path: '/clients' },
          { label: `${client.name} (360°)` },
        ]}
      />

      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#EEF1FA] p-6 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#3B5BFD] text-white flex items-center justify-center font-display font-bold text-xl shrink-0 shadow-md shadow-[#3B5BFD]/25">
            {client.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-display text-[#16181D]">
                {client.name}
              </h1>
              <Badge status={client.status} />
            </div>
            <p className="text-xs text-[#8A8FA3] mt-1 font-mono">
              {client.industry} • Account Manager: {client.accountManagerName}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/clients')}>
          Back to Directory
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Client Core & Linked Summaries */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Contact & Address Card */}
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] border-b border-[#EEF1FA] pb-3">
              Primary Contact & Account Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase">Primary Contact</span>
                <span className="font-semibold text-[#16181D]">{client.primaryContact}</span>
              </div>
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase">Email</span>
                <span className="font-mono text-[#16181D]">{client.email}</span>
              </div>
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase">Phone</span>
                <span className="font-mono text-[#16181D]">{client.phone}</span>
              </div>
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase">Address</span>
                <span className="text-[#16181D]">{client.address}</span>
              </div>
            </div>
          </div>

          {/* Linked Opportunities */}
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] flex items-center gap-2">
              <Kanban className="w-4 h-4 text-[#3B5BFD]" /> Linked Opportunities ({opportunities.length})
            </h3>
            <div className="space-y-2 text-xs">
              {opportunities.map((opp) => (
                <div key={opp.id} className="p-4 rounded-2xl bg-[#EEF1FA]/40 border border-[#EEF1FA] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#16181D]">{opp.title}</div>
                    <div className="font-mono text-[#3B5BFD] text-[11px] font-bold">{formatCurrency(opp.value)}</div>
                  </div>
                  <Badge status={opp.stage} />
                </div>
              ))}
            </div>
          </div>

          {/* Linked Projects */}
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#3B5BFD]" /> Linked Projects ({projects.length})
            </h3>
            <div className="space-y-2 text-xs">
              {projects.map((proj) => (
                <div key={proj.id} className="p-4 rounded-2xl bg-[#EEF1FA]/40 border border-[#EEF1FA] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#16181D]">{proj.code} — {proj.name}</div>
                    <div className="text-[11px] text-[#8A8FA3]">Manager: {proj.managerName}</div>
                  </div>
                  <Badge status={proj.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Linked Invoices */}
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#3B5BFD]" /> Financial Invoices ({invoices.length})
            </h3>
            <div className="space-y-2 text-xs">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 rounded-2xl bg-[#EEF1FA]/40 border border-[#EEF1FA] flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-[#16181D]">{inv.invoiceNumber}</div>
                    <div className="text-[#8A8FA3]">Total: <span className="font-mono text-[#16181D] font-bold">{formatCurrency(inv.total)}</span> | Balance: <span className="font-mono font-semibold text-[#EF4444]">{formatCurrency(inv.balance)}</span></div>
                  </div>
                  <Badge status={inv.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Signature Activity Timeline */}
        <div className="lg:col-span-1 p-6 rounded-[24px] border border-[#EEF1FA] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <Timeline
            activities={activities}
            entityType="Client"
            entityId={client.id}
          />
        </div>
      </div>
    </div>
  );
};
