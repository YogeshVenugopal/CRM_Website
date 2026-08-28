import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { useNotification } from '../../contexts/NotificationContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { UserPlus, Plus, ArrowRight } from 'lucide-react';

export const LeadList = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [source, setSource] = useState('Website');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await mockService.getLeads();
      setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const newLead = await mockService.createLead({
        companyName,
        contactName,
        email,
        phone,
        estimatedValue: Number(estimatedValue) || 0,
        source,
      });

      addToast({
        title: 'Lead created',
        message: `Lead "${companyName}" added successfully.`,
        type: 'success',
      });

      setIsModalOpen(false);
      // Reset form
      setCompanyName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setEstimatedValue('');
      fetchLeads();
    } catch (err) {
      addToast({
        title: 'Error creating lead',
        message: err.message,
        type: 'error',
      });
    }
  };

  const columns = [
    {
      header: 'Company & Contact',
      key: 'companyName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{val}</div>
          <div className="text-xs text-[#8A8FA3]">{row.contactName} ({row.email})</div>
        </div>
      ),
    },
    {
      header: 'Source',
      key: 'source',
      sortable: true,
    },
    {
      header: 'Est. Value',
      key: 'estimatedValue',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <Badge status={val} />,
    },
    {
      header: 'Assigned To',
      key: 'assignedToName',
    },
    {
      header: 'Created Date',
      key: 'createdAt',
      render: (val) => <span className="font-mono text-xs text-[#8A8FA3]">{formatDate(val)}</span>,
    },
    {
      header: '',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/leads/${row.id}`);
          }}
        >
          View 360° <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Leads Directory
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Capture, qualify, and convert potential business prospects into active sales opportunities
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          New Lead
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        searchPlaceholder="Search leads by company, contact, or email..."
        onRowClick={(row) => navigate(`/leads/${row.id}`)}
      />

      {/* New Lead Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Prospect Lead"
        subtitle="Add a new lead to start the qualification workflow"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <Input
            label="Company Name"
            placeholder="e.g. Apex Global Solutions"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person Name"
              placeholder="e.g. Sarah Jenkins"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="sarah@apexglobal.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Estimated Deal Value (INR)"
              type="number"
              mono
              placeholder="e.g. 500000"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
          </div>

          <Select
            label="Lead Source Channel"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            options={[
              { label: 'Website Inquiry', value: 'Website' },
              { label: 'Inbound Referral', value: 'Referral' },
              { label: 'LinkedIn Outbound', value: 'LinkedIn' },
              { label: 'Industry Conference / Event', value: 'Conference' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF1FA]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
