import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, ArrowRight, Pencil, Trash2 } from 'lucide-react';

const PROJECT_STATUSES = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'On Hold', value: 'on_hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const ProjectList = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [statusProject, setStatusProject] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await projectsApi.list({ limit: 100 });
      setProjects(data);
    } catch (e) {
      addToast({ title: 'Error', message: e.message || 'Failed to load projects', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleStatusChange = async () => {
    if (!statusProject || !newStatus) return;
    setFormLoading(true);
    try {
      await projectsApi.changeStatus(statusProject.id, newStatus);
      addToast({ title: 'Status updated', message: `${statusProject.name} → ${newStatus.replace(/_/g, ' ')}`, type: 'success' });
      setStatusProject(null);
      fetchProjects();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    setFormLoading(true);
    try {
      await projectsApi.delete(deletingProject.id);
      addToast({ title: 'Project deleted', message: `${deletingProject.name} deleted.`, type: 'success' });
      setDeletingProject(null);
      fetchProjects();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      header: 'Code & Name',
      key: 'name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{row.code} — {val}</div>
          <div className="text-xs text-[#8A8FA3]">{row.clientName || 'No client'}</div>
        </div>
      ),
    },
    {
      header: 'Budget',
      key: 'commercialValue',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val, row) => formatCurrency(val || row.budget),
    },
    {
      header: 'Manager',
      key: 'managerName',
      sortable: true,
      render: (val) => val || '—',
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <Badge status={val} />,
    },
    {
      header: 'Due Date',
      key: 'dueDate',
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
            onClick={() => {
              setStatusProject(row);
              setNewStatus(row.status);
            }}
            title="Change status"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setDeletingProject(row)}
            className="text-[#EF4444]"
            title="Delete"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/projects/${row.id}`)}
          >
            Details <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Projects</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Track delivery, handovers, and team assignments
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        searchPlaceholder="Search by code, name, or client..."
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
      />

      {/* Status Change Modal */}
      <Modal
        isOpen={Boolean(statusProject)}
        onClose={() => setStatusProject(null)}
        title="Change Project Status"
        subtitle={`Update status for ${statusProject?.name || ''}`}
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={PROJECT_STATUSES}
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-[#EEF1FA]">
            <Button variant="secondary" onClick={() => setStatusProject(null)} disabled={formLoading}>Cancel</Button>
            <Button variant="primary" onClick={handleStatusChange} loading={formLoading}>Update Status</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingProject)}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deletingProject?.name}"? This will also remove all associated tasks.`}
        confirmLabel="Delete Project"
        loading={formLoading}
      />
    </div>
  );
};
