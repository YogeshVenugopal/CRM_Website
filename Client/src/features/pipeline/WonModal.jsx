import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, Briefcase, FileText } from 'lucide-react';

export const WonModal = ({
  isOpen,
  onClose,
  opportunity,
  quotations = [],
  onConfirmWon,
  loading,
}) => {
  const [selectedQuotationId, setSelectedQuotationId] = useState(
    opportunity?.acceptedQuotationId || (quotations[0]?.id || '')
  );
  const [notes, setNotes] = useState('');

  if (!opportunity) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmWon({
      acceptedQuotationId: selectedQuotationId,
      notes,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Opportunity Won"
      subtitle={`Marking "${opportunity.title}" as Won will trigger downstream project & financial creation.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Explanation Banner */}
        <div className="p-4 rounded-2xl bg-[#3B5BFD]/10 border border-[#3B5BFD]/30 text-xs text-[#3B5BFD] space-y-2">
          <div className="font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3B5BFD]" />
            Marking this opportunity as Won will create:
          </div>
          <ul className="list-disc list-inside space-y-1 font-medium pl-1">
            <li className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Project (for delivery & handover)
            </li>
            <li className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Draft Invoice (from commercial quote value)
            </li>
          </ul>
        </div>

        {/* Commercial Summary */}
        <div className="p-4 rounded-2xl bg-[#EEF1FA]/50 border border-[#EEF1FA] flex items-center justify-between text-xs">
          <div>
            <span className="text-[#8A8FA3] block text-[10px] uppercase font-semibold">Client</span>
            <span className="font-bold text-[#16181D]">{opportunity.clientName}</span>
          </div>
          <div className="text-right">
            <span className="text-[#8A8FA3] block text-[10px] uppercase font-semibold">Commercial Value</span>
            <span className="font-mono font-bold text-[#3B5BFD] text-sm">
              {formatCurrency(opportunity.value)}
            </span>
          </div>
        </div>

        {/* Accepted Quotation Picker */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
            Select Accepted Commercial Quotation
          </label>
          <select
            value={selectedQuotationId}
            onChange={(e) => setSelectedQuotationId(e.target.value)}
            className="w-full h-10 rounded-full border border-transparent bg-[#EEF1FA] text-xs px-4 text-[#16181D] focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 focus:bg-white"
          >
            {quotations.length === 0 ? (
              <option value="">QT-DEFAULT — Auto-generated quotation from value</option>
            ) : (
              quotations.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quotationNumber} — {formatCurrency(q.total)} ({q.status})
                </option>
              ))
            )}
          </select>
        </div>

        <Input
          label="Handover Notes for Project Manager"
          placeholder="e.g. Key client expectations, agreed timelines, special terms..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF1FA]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Confirm & Mark Won
          </Button>
        </div>
      </form>
    </Modal>
  );
};
