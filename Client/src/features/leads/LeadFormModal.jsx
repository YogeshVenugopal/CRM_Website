import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const LEAD_SOURCES = [
  { label: 'Website Form', value: 'website' },
  { label: 'Referral', value: 'referral' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Cold Call', value: 'cold_call' },
  { label: 'Event / Conference', value: 'event' },
  { label: 'Advertisement', value: 'ads' },
  { label: 'Other', value: 'other' },
];

const LEAD_STATUSES = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Unqualified', value: 'unqualified' },
];

export const LeadFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  lead = null,
  loading = false,
}) => {
  const isEdit = Boolean(lead);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('website');
  const [status, setStatus] = useState('new');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (lead) {
      setName(lead.name || lead.contactName || '');
      setCompany(lead.company || lead.companyName || '');
      setEmail(lead.email || '');
      setPhone(lead.phone || '');
      setSource(lead.source || 'website');
      setStatus(lead.status || 'new');
      setBudget(lead.budget || lead.estimatedValue || '');
      setNotes(lead.notes || '');
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setSource('website');
      setStatus('new');
      setBudget('');
      setNotes('');
    }
    setErrors({});
  }, [lead, isOpen]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Contact name is required';
    if (!company.trim()) errs.company = 'Company name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Invalid email format';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        source,
        status,
        budget: Number(budget) || 0,
        notes: notes.trim(),
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
      title={isEdit ? 'Edit Lead' : 'Create New Lead'}
      subtitle={isEdit ? 'Update lead information' : 'Add a new prospect to the pipeline'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#EF4444] font-medium">
            {errors.submit}
          </div>
        )}

        <Input
          label="Contact Name"
          placeholder="e.g. John Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          required
        />

        <Input
          label="Company"
          placeholder="e.g. Acme Corporation"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          error={errors.company}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="john@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label="Phone"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={LEAD_SOURCES}
          />
          {isEdit && (
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={LEAD_STATUSES}
            />
          )}
        </div>

        <Input
          label="Estimated Budget (INR)"
          type="number"
          mono
          placeholder="e.g. 500000"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
            Notes
          </label>
          <textarea
            rows={3}
            className="w-full rounded-2xl border border-[#EEF1FA] bg-[#EEF1FA] text-[#16181D] text-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 focus:bg-white placeholder-[#8A8FA3] transition-all"
            placeholder="Additional context about this lead..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[#EEF1FA]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
