import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ArrowRight } from 'lucide-react';

export const ClientList = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const data = await mockService.getClients();
        setClients(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const columns = [
    {
      header: 'Client / Organization',
      key: 'name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#16181D]">{row.name}</div>
          <div className="text-xs text-[#8A8FA3] font-mono">{row.industry}</div>
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
      header: 'Phone Number',
      key: 'phone',
      mono: true,
    },
    {
      header: 'Account Manager',
      key: 'accountManagerName',
      sortable: true,
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/clients/${row.id}`)}
        >
          Client 360° <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-[#16181D]">
            Client Directory
          </h1>
          <p className="text-xs text-[#8A8FA3] mt-0.5">
            Central database of active client accounts and 360° histories
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        loading={loading}
        searchPlaceholder="Search clients by name, contact, or industry..."
        onRowClick={(row) => navigate(`/clients/${row.id}`)}
      />
    </div>
  );
};
