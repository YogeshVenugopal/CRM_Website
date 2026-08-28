import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ClientFormModal } from './ClientFormModal';
import { Plus, ArrowRight, Pencil, Trash2 } from 'lucide-react';

export const ClientList = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await clientsApi.list({ limit: 100 });
      setClients(data);
    } catch (e) {
      addToast({ title: 'Error', message: e.message || 'Failed to load clients', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      await clientsApi.create(data);
      addToast({ title: 'Client created', message: `"${data.companyName}" added.`, type: 'success' });
      fetchClients();
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setFormLoading(true);
    try {
      await clientsApi.update(editingClient.id, data);
      addToast({ title: 'Client updated', message: `"${data.companyName}" updated.`, type: 'success' });
      fetchClients();
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    setDeleteLoading(true);
    try {
      await clientsApi.delete(deletingClient.id);
      addToast({ title: 'Client deleted', message: `"${deletingClient.name}" deleted.`, type: 'success' });
      setDeletingClient(null);
      fetchClients();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      header: 'Client / Organization',
      key: 'name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{val}</div>
          <div className="text-xs text-[#8A8FA3] font-mono">{row.industry || '—'}</div>
        </div>
      ),
    },
    {
      header: 'Primary Contact',
      key: 'primaryContact',
      sortable: true,
      render: (val, row) => (
        <div className="text-xs">
          <div className="font-semibold text-[#16181D]">{val}</div>
          <div className="text-[#8A8FA3] font-mono text-[11px]">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Phone',
      key: 'phone',
      mono: true,
      render: (val) => val || '—',
    },
    {
      header: 'Account Manager',
      key: 'accountManagerName',
      sortable: true,
      render: (val) => val || '—',
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <Badge status={val} />,
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
            onClick={() => { setEditingClient(row); setIsFormOpen(true); }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setDeletingClient(row)}
            className="text-[#EF4444] hover:text-[#DC2626]"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/clients/${row.id}`)}
          >
            360° <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Clients</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Manage client accounts and 360° views
          </p>
        </div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={() => { setEditingClient(null); setIsFormOpen(true); }}
        >
          New Client
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        searchPlaceholder="Search by name, contact, or industry..."
        onRowClick={(row) => navigate(`/clients/${row.id}`)}
      />

      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingClient(null); }}
        onSubmit={editingClient ? handleEdit : handleCreate}
        client={editingClient}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingClient)}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        message={`Are you sure you want to delete "${deletingClient?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Client"
        loading={deleteLoading}
      />
    </div>
  );
};
