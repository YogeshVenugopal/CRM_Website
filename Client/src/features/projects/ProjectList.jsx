import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockService } from '../../mock/mockService';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Briefcase, ArrowRight } from 'lucide-react';

export const ProjectList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const data = await mockService.getProjects();
        setProjects(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const columns = [
    {
      header: 'Code & Name',
      key: 'name',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[#14181A] dark:text-[#EDF3EC]">{row.code} — {row.name}</div>
          <div className="text-xs text-[#6B7168]">{row.clientName}</div>
        </div>
      ),
    },
    {
      header: 'Commercial Value',
      key: 'commercialValue',
      sortable: true,
      mono: true,
      align: 'right',
      render: (val) => formatCurrency(val),
    },
    {
      header: 'Project Manager',
      key: 'managerName',
      sortable: true,
    },
    {
      header: 'Handover Status',
      key: 'handoverReceipt',
      render: (val) => (
        val ? (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#2FA84C]/10 text-[#2FA84C] dark:text-[#3FCB63] font-semibold border border-[#2FA84C]/30">
            ✓ Handover Verified
          </span>
        ) : (
          <span className="text-[11px] font-mono text-[#6B7168]">Manual Direct</span>
        )
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <Badge status={val} />,
    },
    {
      header: 'Target Due',
      key: 'dueDate',
      render: (val) => <span className="font-mono text-xs text-[#6B7168]">{formatDate(val)}</span>,
    },
    {
      header: '',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/projects/${row.id}`)}
        >
          Details <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-[#14181A] dark:text-[#EDF3EC]">
            Active Projects & Handovers
          </h1>
          <p className="text-xs text-[#6B7168] dark:text-[#95A99B]">
            Operational projects spawned from accepted quotations and won opportunities
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={projects}
        loading={loading}
        searchPlaceholder="Search projects by code, title, client, or manager..."
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
      />
    </div>
  );
};
