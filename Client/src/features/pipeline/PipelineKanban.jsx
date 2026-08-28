import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { useNotification } from '../../contexts/NotificationContext';
import { KanbanBoard } from '../../components/ui/KanbanBoard';
import { WonModal } from './WonModal';
import { LostModal } from './LostModal';
import { queryClient } from '../../lib/queryClient';

export const PipelineKanban = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [opportunities, setOpportunities] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedWonOpp, setSelectedWonOpp] = useState(null);
  const [selectedLostOpp, setSelectedLostOpp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPipelineData = async () => {
    setLoading(true);
    try {
      const [opps, qts] = await Promise.all([
        mockService.getOpportunities(),
        mockService.getQuotations(),
      ]);
      setOpportunities(opps);
      setQuotations(qts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const columns = [
    { key: 'prospecting', label: 'Prospecting' },
    { key: 'qualification', label: 'Qualification' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
  ];

  // Calculate total stage values
  const columnsWithTotals = columns.map((col) => {
    const totalValue = opportunities
      .filter((o) => o.stage === col.key)
      .reduce((acc, o) => acc + (o.value || 0), 0);
    return { ...col, totalValue };
  });

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
      await mockService.updateOpportunityStage(itemId, targetStage);
      setOpportunities((prev) =>
        prev.map((o) => (o.id === itemId ? { ...o, stage: targetStage } : o))
      );
      addToast({
        title: 'Stage updated',
        message: `${opp.title} moved to ${targetStage.replace('_', ' ')}`,
        type: 'info',
      });
    } catch (err) {
      addToast({ title: 'Error moving stage', message: err.message, type: 'error' });
    }
  };

  const handleConfirmWon = async (payload) => {
    if (!selectedWonOpp) return;
    setActionLoading(true);
    try {
      const result = await mockService.markOpportunityWon(selectedWonOpp.id, payload);

      queryClient.invalidateQueries(['opportunities']);
      queryClient.invalidateQueries(['projects']);

      setSelectedWonOpp(null);
      fetchPipelineData();

      addToast({
        title: 'Marked as Won — project created',
        message: `Project ${result.project.code} and Draft Invoice created.`,
        type: 'success',
        action: {
          label: 'View Project →',
          onClick: () => navigate(`/projects/${result.project.id}`),
        },
        duration: 8000,
      });
    } catch (err) {
      addToast({ title: 'Error marking Won', message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmLost = async (reason) => {
    if (!selectedLostOpp) return;
    setActionLoading(true);
    try {
      await mockService.markOpportunityLost(selectedLostOpp.id, reason);
      setSelectedLostOpp(null);
      fetchPipelineData();
      addToast({
        title: 'Opportunity marked Lost',
        message: `Reason recorded: ${reason}`,
        type: 'warning',
      });
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
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Sales Pipeline
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Kanban view of deals across sales stages. Marking Won triggers project creation.
          </p>
        </div>
      </div>

      <KanbanBoard
        columns={columnsWithTotals}
        items={opportunities}
        onItemMove={handleStageMoveAttempt}
        onItemClick={(item) => navigate(`/pipeline/${item.id}`)}
      />

      <WonModal
        isOpen={Boolean(selectedWonOpp)}
        onClose={() => setSelectedWonOpp(null)}
        opportunity={selectedWonOpp}
        quotations={quotations.filter((q) => q.clientId === selectedWonOpp?.clientId)}
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
