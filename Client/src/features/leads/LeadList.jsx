import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LeadFormModal } from './LeadFormModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, ArrowRight, Pencil, Trash2 } from 'lucide-react';

export const LeadList = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [deletingLead, setDeletingLead] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await leadsApi.list({ limit: 100 });
      setLeads(data);
    } catch (e) {
      addToast({ title: 'Error', message: e.message || 'Failed to load leads', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      await leadsApi.create(data);
      addToast({ title: 'Lead created', message: `"${data.company}" added successfully.`, type: 'success' });
      fetchLeads();
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    try {
      await leadsApi.update(editingLead.id, data);
      addToast({ title: 'Lead updated', message: `"${data.company}" updated successfully.`, type: 'success' });
      fetchLeads();
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingLead) return;
    setDeleteLoading(true);
    try {
      await leadsApi.delete(deletingLead.id);
      addToast({ title: 'Lead deleted', message: `"${deletingLead.company || deletingLead.name}" deleted.`, type: 'success' });
      setDeletingLead(null);
      fetchLeads();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      header: 'Company & Contact',
      key: 'companyName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{val || row.company || row.name}</div>
          <div className="text-xs text-[#8A8FA3]">{row.contactName || row.name} ({row.email})</div>
        </div>
      ),
    },
    {
      header: 'Source',
      key: 'source',
      sortable: true,
      render: (val) => <span className="capitalize text-xs">{val}</span>,
    },
    {
      header: 'Est. Value',
      key: 'estimatedValue',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val, row) => formatCurrency(val || row.budget),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <Badge status={val} />,
    },
    {
      header: 'Assigned To',
      key: 'assignedToName',
      render: (val, row) => val || row.ownerName || '—',
    },
    {
      header: 'Created',
      key: 'createdAt',
      render: (val) => <span className="font-mono text-xs text-[#8A8FA3]">{formatDate(val)}</span>,
    },
    {
      header: '',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => { setEditingLead(row); setIsFormOpen(true); }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setDeletingLead(row)}
            className="text-[#EF4444] hover:text-[#DC2626]"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/leads/${row.id}`)}
          >
            View <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Leads</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Capture, qualify, and convert prospects into opportunities
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => { setEditingLead(null); setIsFormOpen(true); }}
        >
          New Lead
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        searchPlaceholder="Search by company, contact, or email..."
        onRowClick={(row) => navigate(`/leads/${row.id}`)}
      />

      <LeadFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingLead(null); }}
        onSubmit={editingLead ? handleEdit : handleCreate}
        lead={editingLead}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingLead)}
        onClose={() => setDeletingLead(null)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message={`Are you sure you want to delete "${deletingLead?.company || deletingLead?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Lead"
        loading={deleteLoading}
      />
    </div>
  );
};
