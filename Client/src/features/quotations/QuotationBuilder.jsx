import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { useNotification } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2, ArrowLeft, Calculator } from 'lucide-react';

export const QuotationBuilder = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();

  const [clients, setClients] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const [clientId, setClientId] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('Payment terms: 30% advance on order confirmation, 70% on final handover.');

  // Dynamic Line Items with Live Recalculation
  const [items, setItems] = useState([
    { description: 'Enterprise Software Customization & Setup', quantity: 1, unitPrice: 250000 },
  ]);

  useEffect(() => {
    const loadSelects = async () => {
      const [cList, oList] = await Promise.all([
        mockService.getClients(),
        mockService.getOpportunities(),
      ]);
      setClients(cList);
      setOpportunities(oList);
      if (cList.length > 0) setClientId(cList[0].id);
    };
    loadSelects();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index][field] = field === 'description' ? value : Number(value) || 0;
      return updated;
    });
  };

  // Live Recalculation Engine
  const subtotal = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * 0.18); // 18% GST / Tax
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0 || subtotal <= 0) {
      addToast({
        title: 'Validation Error',
        message: 'Quotation total must be greater than ₹0 — add at least one line item.',
        type: 'error',
      });
      return;
    }

    const selectedClient = clients.find((c) => c.id === clientId);
    const selectedOpp = opportunities.find((o) => o.id === opportunityId);

    try {
      const formattedItems = items.map((item) => ({
        ...item,
        total: item.quantity * item.unitPrice,
      }));

      const newQt = await mockService.createQuotation({
        clientId,
        clientName: selectedClient?.name || 'Client',
        opportunityId,
        opportunityTitle: selectedOpp?.title || 'General Opportunity',
        validityDate,
        items: formattedItems,
        subtotal,
        tax,
        total,
        notes,
      });

      addToast({
        title: 'Quotation created',
        message: `${newQt.quotationNumber} total ${formatCurrency(total)} saved as draft.`,
        type: 'success',
      });

      navigate('/quotations');
    } catch (err) {
      addToast({ title: 'Error creating quotation', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Breadcrumbs
        customItems={[
          { label: 'Quotations', path: '/quotations' },
          { label: 'Create New Quotation' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Commercial Quotation Builder
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Draft formal pricing proposal with live tax calculations
          </p>
        </div>
        <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/quotations')}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client & Opportunity Selection */}
        <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3]">
            Target Client & Commercial Link
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Select Client Account"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              options={clients.map((c) => ({ label: `${c.name} (${c.industry})`, value: c.id }))}
              required
            />

            <Select
              label="Link Opportunity (Optional)"
              value={opportunityId}
              onChange={(e) => setOpportunityId(e.target.value)}
              placeholder="No linked opportunity"
              options={opportunities.map((o) => ({ label: o.title, value: o.id }))}
            />

            <Input
              label="Validity Expiry Date"
              type="date"
              mono
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Dynamic Line Items Editor */}
        <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between border-b border-[#EEF1FA] pb-3">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#3B5BFD]" /> Quotation Line Items
            </h3>
            <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
              Add Line Item
            </Button>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-[#EEF1FA]/40 border border-[#EEF1FA]"
                >
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Item description or service scope..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full h-9 px-3 rounded-full border border-[#EEF1FA] bg-white text-xs text-[#16181D]"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full h-9 px-3 rounded-full border border-[#EEF1FA] bg-white text-xs font-mono text-center text-[#16181D]"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full h-9 px-3 rounded-full border border-[#EEF1FA] bg-white text-xs font-mono text-right text-[#16181D]"
                      required
                    />
                  </div>

                  <div className="col-span-1 text-right font-mono font-bold text-xs text-[#3B5BFD]">
                    {formatCurrency(lineTotal)}
                  </div>

                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-[#EF4444] hover:opacity-80 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Financial Calculation Breakdown in IBM Plex Mono */}
          <div className="border-t border-[#EEF1FA] pt-4 flex flex-col items-end space-y-1.5 font-mono text-xs">
            <div className="flex justify-between w-64 text-[#8A8FA3]">
              <span>Subtotal:</span>
              <span className="font-semibold text-[#16181D]">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-[#8A8FA3]">
              <span>Estimated Tax (18%):</span>
              <span className="font-semibold text-[#16181D]">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between w-64 pt-2 border-t border-[#EEF1FA] text-sm font-bold text-[#3B5BFD]">
              <span>Total Amount:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <Input
          label="Terms & Conditions / Payment Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate('/quotations')}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save Quotation
          </Button>
        </div>
      </form>
    </div>
  );
};
