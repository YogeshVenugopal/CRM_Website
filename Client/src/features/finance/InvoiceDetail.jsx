import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { useNotification } from '../../contexts/NotificationContext';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PaymentModal } from './PaymentModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, DollarSign } from 'lucide-react';

export const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const data = await mockService.getInvoiceById(id || 'inv-801');
      setInvoice(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const handleConfirmPayment = async (paymentPayload) => {
    setActionLoading(true);
    try {
      const updatedInv = await mockService.recordPayment(invoice.id, paymentPayload);
      setInvoice(updatedInv);
      setIsPaymentModalOpen(false);
      addToast({
        title: 'Payment recorded',
        message: `Amount ${formatCurrency(paymentPayload.amount)} credited to ${invoice.invoiceNumber}`,
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Error recording payment', message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !invoice) {
    return <div className="p-8 text-center text-sm font-mono text-[#8A8FA3]">Loading Invoice Details...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs
        customItems={[
          { label: 'Invoices', path: '/invoices' },
          { label: `${invoice.invoiceNumber}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#EEF1FA] p-6 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-[#16181D]">
              {invoice.invoiceNumber}
            </h1>
            <Badge status={invoice.status} />
          </div>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Billed To: <span className="font-semibold text-[#16181D]">{invoice.clientName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/invoices')}>
            Back
          </Button>
          {invoice.balance > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={DollarSign}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Financial Details Card */}
      <div className="p-6 sm:p-8 rounded-[24px] border border-[#EEF1FA] bg-white space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#EEF1FA] pb-4 text-xs font-mono">
          <div>
            <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Issue Date</span>
            <span className="text-[#16181D] font-bold">{formatDate(invoice.issueDate)}</span>
          </div>
          <div>
            <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Payment Due Date</span>
            <span className="text-[#16181D] font-bold">{formatDate(invoice.dueDate)}</span>
          </div>
          <div>
            <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Payment Status</span>
            <span className="font-semibold text-[#3B5BFD] uppercase">{invoice.status}</span>
          </div>
        </div>

        {/* Billed Items Breakdown */}
        <div>
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] mb-3">
            Invoice Line Items
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-[#EEF1FA]">
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#EEF1FA]/60 text-[#8A8FA3]">
                <tr>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-center w-16">Qty</th>
                  <th className="p-3 text-right w-28">Unit Price</th>
                  <th className="p-3 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1FA]">
                {invoice.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 text-[#16181D] font-sans font-medium">{item.description}</td>
                    <td className="p-3 text-center">{item.quantity}</td>
                    <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-3 text-right font-semibold text-[#16181D]">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Breakdown */}
        <div className="border-t border-[#EEF1FA] pt-4 flex flex-col items-end space-y-1.5 font-mono text-xs">
          <div className="flex justify-between w-64 text-[#8A8FA3]">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between w-64 text-[#8A8FA3]">
            <span>Tax (18% GST):</span>
            <span>{formatCurrency(invoice.tax)}</span>
          </div>
          <div className="flex justify-between w-64 text-sm font-bold text-[#16181D]">
            <span>Total Invoiced:</span>
            <span>{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between w-64 text-xs font-semibold text-[#3B5BFD]">
            <span>Paid Amount:</span>
            <span>{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between w-64 pt-2 border-t border-[#EEF1FA] text-sm font-bold text-[#EF4444]">
            <span>Remaining Balance:</span>
            <span>{formatCurrency(invoice.balance)}</span>
          </div>
        </div>

        {/* Payment History Audit Log */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="border-t border-[#EEF1FA] pt-4 space-y-3">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3]">
              Recorded Payments Audit Log
            </h3>
            <div className="space-y-2 font-mono text-xs">
              {invoice.payments.map((p, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#EEF1FA]/40 border border-[#EEF1FA] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#3B5BFD]">
                      + {formatCurrency(p.amount)} via {p.paymentMethod}
                    </div>
                    <div className="text-[11px] text-[#8A8FA3]">Ref: {p.transactionRef}</div>
                  </div>
                  <div className="text-right text-[11px] text-[#8A8FA3]">
                    {formatDate(p.createdAt, true)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Record Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={invoice}
        onConfirmPayment={handleConfirmPayment}
        loading={actionLoading}
      />
    </div>
  );
};
