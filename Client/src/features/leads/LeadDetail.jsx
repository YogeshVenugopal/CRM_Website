import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { useNotification } from '../../contexts/NotificationContext';
import { Timeline } from '../../components/ui/Timeline';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const lData = await mockService.getLeadById(id || 'lead-101');
      const aData = await mockService.getActivities(id || 'lead-101');
      setLead(lData);
      setActivities(aData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [id]);

  const handleAddActivity = (newAct) => {
    mockService.addActivity(newAct);
    setActivities((prev) => [newAct, ...prev]);
    addToast({ title: 'Activity logged', message: 'Timeline updated', type: 'info' });
  };

  const handleQualifyLead = async () => {
    await mockService.updateLead(lead.id, { status: 'qualified' });
    setLead((prev) => ({ ...prev, status: 'qualified' }));
    addToast({ title: 'Lead qualified', message: 'Status updated to Qualified', type: 'success' });
  };

  if (loading || !lead) {
    return <div className="p-8 text-center text-sm font-mono text-[#8A8FA3]">Loading Lead Details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <Breadcrumbs
          customItems={[
            { label: 'Leads', path: '/leads' },
            { label: `${lead.name} (${lead.company})` },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 bg-white p-6 rounded-[24px] border border-[#EEF1FA] shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/leads')} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-display text-[#16181D]">
                  {lead.company}
                </h1>
                <Badge status={lead.status} />
              </div>
              <p className="text-xs text-[#8A8FA3] mt-0.5">
                Primary Contact: <span className="font-semibold text-[#16181D]">{lead.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {lead.status !== 'qualified' && (
              <Button variant="outline" size="sm" icon={CheckCircle2} onClick={handleQualifyLead}>
                Mark Qualified
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                addToast({ title: 'Converted to Opportunity', message: 'Redirecting to Sales Pipeline...', type: 'success' });
                navigate('/pipeline');
              }}
            >
              Convert to Opportunity
            </Button>
          </div>
        </div>
      </div>

      {/* Split Layout: Main Information (Left) + Activity Timeline (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] border-b border-[#EEF1FA] pb-3">
              Lead Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#8A8FA3] block text-[11px] uppercase">Email</span>
                <span className="font-mono text-[#16181D] font-medium">{lead.email}</span>
              </div>

              <div>
                <span className="text-[#8A8FA3] block text-[11px] uppercase">Phone</span>
                <span className="font-mono text-[#16181D] font-medium">{lead.phone}</span>
              </div>

              <div>
                <span className="text-[#8A8FA3] block text-[11px] uppercase">Lead Source</span>
                <span className="font-mono text-[#16181D] font-medium">{lead.source}</span>
              </div>

              <div>
                <span className="text-[#8A8FA3] block text-[11px] uppercase">Est. Budget</span>
                <span className="font-mono text-[#3B5BFD] font-bold text-sm">
                  {formatCurrency(lead.budget)}
                </span>
              </div>

              <div>
                <span className="text-[#8A8FA3] block text-[11px] uppercase">Owner</span>
                <span className="text-[#16181D] font-semibold">{lead.ownerName}</span>
              </div>

              <div>
                <span className="text-[#8A8FA3] block text-[11px] uppercase">Created Date</span>
                <span className="font-mono text-[#8A8FA3]">{formatDate(lead.createdAt, true)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-2 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3]">
              Requirement Notes
            </h3>
            <p className="text-xs text-[#16181D] leading-relaxed">
              {lead.notes || 'No detailed requirement notes provided.'}
            </p>
          </div>
        </div>

        {/* Reusable Polymorphic Activity Timeline Component (Right) */}
        <div className="lg:col-span-2 p-6 rounded-[24px] border border-[#EEF1FA] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <Timeline
            activities={activities}
            entityType="Lead"
            entityId={lead.id}
            onAddActivity={handleAddActivity}
          />
        </div>
      </div>
    </div>
  );
};
