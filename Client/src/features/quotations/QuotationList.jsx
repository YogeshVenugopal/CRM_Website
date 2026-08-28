import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus } from 'lucide-react';

export const QuotationList = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuotations = async () => {
      setLoading(true);
      try {
        const data = await mockService.getQuotations();
        setQuotations(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotations();
  }, []);

  const columns = [
    {
      header: 'Quotation #',
      key: 'quotationNumber',
      sortable: true,
      mono: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{val}</div>
          <div className="text-[11px] text-[#8A8FA3] font-mono">v{row.version}</div>
        </div>
      ),
    },
    {
      header: 'Client',
      key: 'clientName',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-[#16181D]">{val}</div>
          <div className="text-xs text-[#8A8FA3]">{row.opportunityTitle || 'Direct Quotation'}</div>
        </div>
      ),
    },
    {
      header: 'Total Value',
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
      header: 'Created By',
      key: 'createdByName',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Commercial Quotations
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Draft and sent pricing proposals linked to client opportunities
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/quotations/new')}>
          Create Quotation
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={quotations}
        loading={loading}
        searchPlaceholder="Search quotations by number, client, or opportunity..."
      />
    </div>
  );
};
