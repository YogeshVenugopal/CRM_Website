import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';

export const LostModal = ({
  isOpen,
  onClose,
  opportunity,
  onConfirmLost,
  loading,
}) => {
  const [reason, setReason] = useState('Price / Budget constraint');
  const [details, setDetails] = useState('');

  if (!opportunity) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirmLost(`${reason} — ${details}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mark Opportunity as Lost"
      subtitle={`Require loss reason for analytics on "${opportunity.title}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Primary Loss Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={[
            { label: 'Price / Budget constraint', value: 'Price / Budget constraint' },
            { label: 'Competitor selected', value: 'Competitor selected' },
            { label: 'Project cancelled internally', value: 'Project cancelled internally' },
            { label: 'Timeline misalignment', value: 'Timeline misalignment' },
            { label: 'Feature gap', value: 'Feature gap' },
          ]}
        />
        <Input
          label="Additional Details"
          placeholder="Brief explanation of loss feedback..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF1FA]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={loading}>
            Confirm Mark Lost
          </Button>
        </div>
      </form>
    </Modal>
  );
};
