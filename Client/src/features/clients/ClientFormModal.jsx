import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const ClientFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  client = null,
  loading = false,
}) => {
  const isEdit = Boolean(client);

  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState('active');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (client) {
      setCompanyName(client.companyName || client.name || '');
      setContactName(client.primaryContact || '');
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setIndustry(client.industry || '');
      setAddress(client.billingAddress || client.address || '');
      setWebsite(client.website || '');
      setStatus(client.status || 'active');
    } else {
      setCompanyName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setIndustry('');
      setAddress('');
      setWebsite('');
      setStatus('active');
    }
    setErrors({});
  }, [client, isOpen]);

  const validate = () => {
    const errs = {};
    if (!companyName.trim()) errs.companyName = 'Company name is required';
    if (!contactName.trim()) errs.contactName = 'Primary contact is required';
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
        companyName: companyName.trim(),
        primaryContact: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        industry: industry.trim(),
        billingAddress: address.trim(),
        website: website.trim(),
        status,
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
      title={isEdit ? 'Edit Client' : 'Add New Client'}
      subtitle={isEdit ? 'Update client information' : 'Register a new client account'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#EF4444] font-medium">
            {errors.submit}
          </div>
        )}

        <Input
          label="Company Name"
          placeholder="e.g. Acme Corporation"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          error={errors.companyName}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Primary Contact"
            placeholder="e.g. John Smith"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            error={errors.contactName}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="john@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Phone"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Industry"
            placeholder="e.g. Financial Technology"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>

        <Input
          label="Website"
          placeholder="https://acme.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
            Billing Address
          </label>
          <textarea
            rows={2}
            className="w-full rounded-2xl border border-[#EEF1FA] bg-[#EEF1FA] text-[#16181D] text-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 focus:bg-white placeholder-[#8A8FA3] transition-all"
            placeholder="Full billing address..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {isEdit && (
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-[#EEF1FA]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {isEdit ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
