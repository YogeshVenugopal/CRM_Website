import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationsApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, ArrowRight, Send, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

export const QuotationList = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingQt, setDeletingQt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await quotationsApi.list({ limit: 100 });
      setQuotations(data);
    } catch (e) {
      addToast({ title: 'Error', message: e.message || 'Failed to load quotations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleSend = async (qt) => {
    setActionLoading(true);
    try {
      await quotationsApi.send(qt.id);
      addToast({ title: 'Quotation sent', message: `${qt.quotationNumber} sent successfully.`, type: 'success' });
      fetchQuotations();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (qt) => {
    setActionLoading(true);
    try {
      await quotationsApi.accept(qt.id);
      addToast({ title: 'Quotation accepted', message: `${qt.quotationNumber} has been accepted.`, type: 'success' });
      fetchQuotations();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (qt) => {
    setActionLoading(true);
    try {
      await quotationsApi.reject(qt.id, 'Rejected by user');
      addToast({ title: 'Quotation rejected', message: `${qt.quotationNumber} has been rejected.`, type: 'warning' });
      fetchQuotations();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingQt) return;
    setActionLoading(true);
    try {
      await quotationsApi.delete(deletingQt.id);
      addToast({ title: 'Quotation deleted', message: `${deletingQt.quotationNumber} deleted.`, type: 'success' });
      setDeletingQt(null);
      fetchQuotations();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Quotation #',
      key: 'quotationNumber',
      sortable: true,
      mono: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{val}</div>
          <div className="text-[11px] text-[#8A8FA3] font-mono">v{row.version || 1}</div>
        </div>
      ),
    },
    {
      header: 'Client',
      key: 'clientName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-[#16181D]">{val || '—'}</div>
          <div className="text-xs text-[#8A8FA3]">{row.opportunityTitle || 'Direct'}</div>
        </div>
      ),
    },
    {
      header: 'Total',
      key: 'total',
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
      header: 'Valid Until',
      key: 'validityDate',
      render: (val) => <span className="font-mono text-xs text-[#8A8FA3]">{formatDate(val)}</span>,
    },
    {
      header: '',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'draft' && (
            <Button variant="ghost" size="sm" icon={Send} onClick={() => handleSend(row)} className="text-[#3B5BFD]" title="Send" />
          )}
          {row.status === 'sent' && (
            <>
              <Button variant="ghost" size="sm" icon={CheckCircle2} onClick={() => handleAccept(row)} className="text-[#10B981]" title="Accept" />
              <Button variant="ghost" size="sm" icon={XCircle} onClick={() => handleReject(row)} className="text-[#EF4444]" title="Reject" />
            </>
          )}
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeletingQt(row)} className="text-[#EF4444]" title="Delete" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Quotations</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Create, send, and track commercial proposals
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/quotations/new')}>
          New Quotation
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        loading={loading}
        searchPlaceholder="Search by number, client, or opportunity..."
      />

      <ConfirmDialog
        isOpen={Boolean(deletingQt)}
        onClose={() => setDeletingQt(null)}
        onConfirm={handleDelete}
        title="Delete Quotation"
        message={`Are you sure you want to delete "${deletingQt?.quotationNumber}"? This action cannot be undone.`}
        confirmLabel="Delete Quotation"
        loading={actionLoading}
      />
    </div>
  );
};
