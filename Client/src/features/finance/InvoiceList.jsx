import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowRight } from 'lucide-react';

export const InvoiceList = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      try {
        const data = await mockService.getInvoices();
        setInvoices(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const columns = [
    {
      header: 'Invoice #',
      key: 'invoiceNumber',
      sortable: true,
      mono: true,
      render: (val) => (
        <div className="font-bold text-[#16181D]">
          {val}
        </div>
      ),
    },
    {
      header: 'Client',
      key: 'clientName',
      sortable: true,
      render: (val) => <span className="font-semibold text-[#16181D]">{val}</span>,
    },
    {
      header: 'Total Invoiced',
      key: 'total',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Paid Amount',
      key: 'paidAmount',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val) => <span className="text-[#3B5BFD] font-semibold">{formatCurrency(val)}</span>,
    },
    {
      header: 'Remaining Balance',
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/invoices/${row.id}`)}
        >
          View Invoice <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Financial Invoices
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Track customer invoicing, payment collection, and overdue balances
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        searchPlaceholder="Search invoices by number, client name, or status..."
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
      />
    </div>
  );
};
