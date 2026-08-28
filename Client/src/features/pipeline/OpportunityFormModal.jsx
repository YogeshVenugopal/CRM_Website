import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const STAGES = [
  { label: 'Prospecting', value: 'prospecting' },
  { label: 'Qualification', value: 'qualification' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Negotiation', value: 'negotiation' },
];

export const OpportunityFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  opportunity = null,
  clients = [],
  loading = false,
}) => {
  const isEdit = Boolean(opportunity);

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [probability, setProbability] = useState('50');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [stage, setStage] = useState('prospecting');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (opportunity) {
      setTitle(opportunity.title || '');
      setClientId(opportunity.clientId || '');
      setValue(opportunity.value || '');
      setCurrency(opportunity.currency || 'INR');
      setProbability(String(opportunity.probability || 50));
      setExpectedCloseDate(
        opportunity.expectedCloseDate
          ? new Date(opportunity.expectedCloseDate).toISOString().split('T')[0]
          : ''
      );
      setStage(opportunity.stage || 'prospecting');
    } else {
      setTitle('');
      setClientId('');
      setValue('');
      setCurrency('INR');
      setProbability('50');
      setExpectedCloseDate('');
      setStage('prospecting');
    }
    setErrors({});
  }, [opportunity, isOpen]);

  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!value || Number(value) <= 0) errs.value = 'Value must be greater than 0';
    if (Number(probability) < 0 || Number(probability) > 100) errs.probability = 'Probability must be 0-100';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        title: title.trim(),
        clientId: clientId || undefined,
        value: Number(value),
        currency,
        probability: Number(probability),
        expectedCloseDate: expectedCloseDate || undefined,
        stage: isEdit ? stage : undefined,
      });
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Opportunity' : 'Create New Opportunity'}
      subtitle={isEdit ? 'Update deal information' : 'Add a new deal to the pipeline'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#EF4444] font-medium">
            {errors.submit}
          </div>
        )}

        <Input
          label="Deal Title"
          placeholder="e.g. Website Revamp Project"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
        />

        {clients.length > 0 && (
          <Select
            label="Client (Optional)"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Select a client..."
            options={clients.map((c) => ({ label: c.name, value: c.id }))}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Deal Value (INR)"
            type="number"
            mono
            placeholder="e.g. 500000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={errors.value}
            required
          />
          <Input
            label="Probability (%)"
            type="number"
            mono
            min="0"
            max="100"
            placeholder="50"
            value={probability}
            onChange={(e) => setProbability(e.target.value)}
            error={errors.probability}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expected Close Date"
            type="date"
            mono
            value={expectedCloseDate}
            onChange={(e) => setExpectedCloseDate(e.target.value)}
          />
          {isEdit && (
            <Select
              label="Stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              options={STAGES}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[#EEF1FA]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Opportunity'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
