import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { opportunitiesApi, quotationsApi, clientsApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { KanbanBoard } from '../../components/ui/KanbanBoard';
import { Button } from '../../components/ui/Button';
import { WonModal } from './WonModal';
import { LostModal } from './LostModal';
import { OpportunityFormModal } from './OpportunityFormModal';
import { Plus } from 'lucide-react';

export const PipelineKanban = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [opportunities, setOpportunities] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedWonOpp, setSelectedWonOpp] = useState(null);
  const [selectedLostOpp, setSelectedLostOpp] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPipelineData = useCallback(async () => {
    setLoading(true);
    try {
      const [oppsRes, qtsRes, clientsRes] = await Promise.allSettled([
        opportunitiesApi.list({ limit: 100 }),
        quotationsApi.list({ limit: 100 }),
        clientsApi.list({ limit: 100 }),
      ]);

      setOpportunities(oppsRes.status === 'fulfilled' ? oppsRes.value.data : []);
      setQuotations(qtsRes.status === 'fulfilled' ? qtsRes.value.data : []);
      setClients(clientsRes.status === 'fulfilled' ? clientsRes.value.data : []);
    } catch (e) {
      addToast({ title: 'Error', message: 'Failed to load pipeline data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  const columns = [
    { key: 'prospecting', label: 'Prospecting' },
    { key: 'qualification', label: 'Qualification' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
  ];

  const columnsWithTotals = columns.map((col) => ({
    ...col,
    totalValue: opportunities
      .filter((o) => o.stage === col.key)
      .reduce((acc, o) => acc + (o.value || 0), 0),
  }));

  const handleStageMoveAttempt = async (itemId, targetStage) => {
    const opp = opportunities.find((o) => o.id === itemId);
    if (!opp) return;

    if (targetStage === 'won') {
      setSelectedWonOpp(opp);
      return;
    }
    if (targetStage === 'lost') {
      setSelectedLostOpp(opp);
      return;
    }

    try {
      await opportunitiesApi.changeStage(itemId, targetStage);
      setOpportunities((prev) =>
        prev.map((o) => (o.id === itemId ? { ...o, stage: targetStage } : o))
      );
      addToast({
        title: 'Stage updated',
        message: `${opp.title} moved to ${targetStage.replace('_', ' ')}`,
        type: 'info',
      });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleCreateOpportunity = async (data) => {
    setActionLoading(true);
    try {
      await opportunitiesApi.create(data);
      addToast({ title: 'Opportunity created', message: `"${data.title}" added to pipeline.`, type: 'success' });
      fetchPipelineData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWon = async (payload) => {
    if (!selectedWonOpp) return;
    setActionLoading(true);
    try {
      const result = await opportunitiesApi.markWon(selectedWonOpp.id, payload.acceptedQuotationId);
      setSelectedWonOpp(null);
      fetchPipelineData();
      addToast({
        title: 'Marked as Won',
        message: `Project and Invoice created automatically.`,
        type: 'success',
        action: result?.project
          ? { label: 'View Project →', onClick: () => navigate(`/projects/${result.project.id || result.project._id}`) }
          : undefined,
        duration: 8000,
      });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmLost = async (reason) => {
    if (!selectedLostOpp) return;
    setActionLoading(true);
    try {
      await opportunitiesApi.markLost(selectedLostOpp.id, reason);
      setSelectedLostOpp(null);
      fetchPipelineData();
      addToast({ title: 'Opportunity marked Lost', message: `Reason: ${reason}`, type: 'warning' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Sales Pipeline</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Drag deals across stages. Marking Won triggers project & invoice creation.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)}>
          New Deal
        </Button>
      </div>

      <KanbanBoard
        columns={columnsWithTotals}
        items={opportunities}
        onItemMove={handleStageMoveAttempt}
        onItemClick={(item) => navigate(`/pipeline/${item.id}`)}
      />

      <OpportunityFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateOpportunity}
        clients={clients}
        loading={actionLoading}
      />

      <WonModal
        isOpen={Boolean(selectedWonOpp)}
        onClose={() => setSelectedWonOpp(null)}
        opportunity={selectedWonOpp}
        quotations={quotations.filter(
          (q) => q.clientId === selectedWonOpp?.clientId || q.opportunityId === selectedWonOpp?.id
        )}
        onConfirmWon={handleConfirmWon}
        loading={actionLoading}
      />

      <LostModal
        isOpen={Boolean(selectedLostOpp)}
        onClose={() => setSelectedLostOpp(null)}
        opportunity={selectedLostOpp}
        onConfirmLost={handleConfirmLost}
        loading={actionLoading}
      />
    </div>
  );
};
