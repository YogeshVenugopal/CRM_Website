import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowRight, Send, CheckCircle2, XCircle } from 'lucide-react';

export const InvoiceList = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await financeApi.listInvoices({ limit: 100 });
      setInvoices(data);
    } catch (e) {
      addToast({ title: 'Error', message: e.message || 'Failed to load invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { action, invoice } = confirmAction;
      if (action === 'send') await financeApi.sendInvoice(invoice.id);
      else if (action === 'approve') await financeApi.approveInvoice(invoice.id);
      else if (action === 'cancel') await financeApi.cancelInvoice(invoice.id);

      addToast({
        title: `Invoice ${action}ed`,
        message: `${invoice.invoiceNumber} has been ${action}ed.`,
        type: action === 'cancel' ? 'warning' : 'success',
      });
      setConfirmAction(null);
      fetchInvoices();
    } catch (e) {
      addToast({ title: 'Error', message: e.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Invoice #',
      key: 'invoiceNumber',
      sortable: true,
      mono: true,
      render: (val) => <div className="font-bold text-[#16181D]">{val}</div>,
    },
    {
      header: 'Client',
      key: 'clientName',
      sortable: true,
      render: (val) => <span className="font-semibold text-[#16181D]">{val || '—'}</span>,
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
      header: 'Paid',
      key: 'paidAmount',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val) => <span className="text-[#3B5BFD] font-semibold">{formatCurrency(val)}</span>,
    },
    {
      header: 'Balance',
      key: 'balance',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val) => (
        <span className={val > 0 ? 'text-[#EF4444] font-bold' : 'text-[#8A8FA3]'}>
          {formatCurrency(val)}
        </span>
      ),
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
          {row.status === 'draft' && (
            <Button variant="ghost" size="sm" icon={Send} onClick={() => setConfirmAction({ action: 'send', invoice: row })} className="text-[#3B5BFD]" title="Send" />
          )}
          {row.status === 'sent' && (
            <>
              <Button variant="ghost" size="sm" icon={CheckCircle2} onClick={() => setConfirmAction({ action: 'approve', invoice: row })} className="text-[#10B981]" title="Approve" />
              <Button variant="ghost" size="sm" icon={XCircle} onClick={() => setConfirmAction({ action: 'cancel', invoice: row })} className="text-[#EF4444]" title="Cancel" />
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${row.id}`)}>
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
          <h1 className="text-2xl font-bold font-display text-[#16181D]">Invoices</h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Track billing, payments, and overdue balances
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        searchPlaceholder="Search by number, client, or status..."
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={`${confirmAction?.action === 'send' ? 'Send' : confirmAction?.action === 'approve' ? 'Approve' : 'Cancel'} Invoice`}
        message={`Are you sure you want to ${confirmAction?.action} ${confirmAction?.invoice?.invoiceNumber}?`}
        confirmLabel={`${confirmAction?.action === 'cancel' ? 'Cancel' : 'Confirm'} Invoice`}
        variant={confirmAction?.action === 'cancel' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
};
