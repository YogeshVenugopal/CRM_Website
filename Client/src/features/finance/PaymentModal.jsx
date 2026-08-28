import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatCurrency } from '../../utils/formatters';
import { AlertCircle } from 'lucide-react';

export const PaymentModal = ({
  isOpen,
  onClose,
  invoice,
  onConfirmPayment,
  loading,
}) => {
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!invoice || !isOpen) return;

    setAmount(invoice.balance || 0);
    setPaymentMethod('Bank Transfer');
    setTransactionRef('');
    setNotes('');
    setValidationError('');
  }, [invoice, isOpen]);

  if (!invoice) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setValidationError('Payment amount must be greater than ₹0.');
      return;
    }

    if (numAmount > invoice.balance) {
      setValidationError(
        `Payment amount (${formatCurrency(numAmount)}) cannot exceed remaining balance (${formatCurrency(invoice.balance)}).`
      );
      return;
    }

    onConfirmPayment({
      amount: numAmount,
      paymentMethod,
      transactionRef: transactionRef || `TXN-${Math.floor(Math.random() * 900000 + 100000)}`,
      notes,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Invoice Payment"
      subtitle={`Submit verified payment entry for ${invoice.invoiceNumber}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Financial Overview Card */}
        <div className="p-4 rounded-2xl bg-[#EEF1FA]/50 border border-[#EEF1FA] space-y-2 text-xs font-mono">
          <div className="flex justify-between text-[#8A8FA3]">
            <span>Invoice Total Amount:</span>
            <span className="font-bold text-[#16181D]">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between text-[#8A8FA3]">
            <span>Already Paid:</span>
            <span className="font-bold text-[#3B5BFD]">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#EEF1FA] text-sm font-bold text-[#EF4444]">
            <span>Remaining Balance:</span>
            <span>{formatCurrency(invoice.balance)}</span>
          </div>
        </div>

        {validationError && (
          <div className="p-3.5 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {validationError}
          </div>
        )}

        <Input
          label="Payment Amount (INR)"
          type="number"
          mono
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setValidationError('');
          }}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { label: 'Bank Transfer / NEFT / RTGS', value: 'Bank Transfer' },
              { label: 'UPI / IMPS', value: 'UPI / IMPS' },
              { label: 'Credit / Debit Card', value: 'Card' },
              { label: 'Cheque', value: 'Cheque' },
            ]}
          />

          <Input
            label="Transaction Reference #"
            placeholder="e.g. TXN-98231456"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
          />
        </div>

        <Input
          label="Payment Notes"
          placeholder="e.g. Received via HDFC Bank wire transfer"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF1FA]">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
