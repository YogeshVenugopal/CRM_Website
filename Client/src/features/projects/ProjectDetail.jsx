import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsApi } from '../../lib/api';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Timeline } from '../../components/ui/Timeline';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, CheckSquare, Sparkles, CheckCircle2 } from 'lucide-react';

export const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const pData = await projectsApi.getById(id);
      setProject(pData);

      try {
        const { data: tData } = await projectsApi.getTasks(id);
        setTasks(tData);
      } catch {
        setTasks([]);
      }

      try {
        const aData = await projectsApi.getActivities(id);
        setActivities(aData);
      } catch {
        setActivities([]);
      }
    } catch (e) {
      console.error('Error fetching project:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchProject();
  }, [id, fetchProject]);

  if (loading || !project) {
    return <div className="p-8 text-center text-sm font-mono text-[#8A8FA3]">Loading Project Details...</div>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        customItems={[
          { label: 'Projects', path: '/projects' },
          { label: `${project.code} — ${project.name}` },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#EEF1FA] p-6 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#3B5BFD]/10 text-[#3B5BFD] font-bold">
              {project.code}
            </span>
            <h1 className="text-xl font-bold font-display text-[#16181D]">
              {project.name}
            </h1>
            <Badge status={project.status} />
          </div>
          <p className="text-xs text-[#8A8FA3] mt-1.5 font-mono">
            Client: <span className="font-semibold text-[#16181D]">{project.clientName || 'N/A'}</span> | Project Manager: {project.managerName || 'Unassigned'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/projects')}>
            Back
          </Button>
          <Button variant="primary" size="sm" icon={CheckSquare} onClick={() => navigate('/tasks')}>
            Manage Tasks
          </Button>
        </div>
      </div>

      {/* SALES HANDOVER RECEIPT */}
      {project.handoverReceipt && (
        <div className="p-6 rounded-[24px] border border-[#3B5BFD]/30 bg-[#3B5BFD]/5 relative overflow-hidden shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#3B5BFD]/20 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wider text-[#3B5BFD]">
              <Sparkles className="w-4 h-4 text-[#3B5BFD]" />
              SALES HANDOVER RECEIPT
            </div>
            <span className="text-[10px] font-mono text-[#8A8FA3]">
              Handover Created: {formatDate(project.handoverReceipt.transferredAt, true)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Source Opportunity</span>
              <span className="font-bold text-[#16181D]">{project.handoverReceipt.sourceOpportunity}</span>
            </div>
            <div>
              <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Accepted Quotation</span>
              <span className="font-bold text-[#3B5BFD]">{project.handoverReceipt.acceptedQuotation}</span>
            </div>
            <div>
              <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Client Organization</span>
              <span className="font-bold text-[#16181D]">{project.handoverReceipt.client}</span>
            </div>
            <div>
              <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Commercial Value</span>
              <span className="font-bold text-sm text-[#3B5BFD]">{formatCurrency(project.handoverReceipt.commercialValue)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#3B5BFD]/20 text-[11px] text-[#8A8FA3] font-mono flex items-center justify-between">
            <span>Workflow Origin: <strong className="text-[#16181D]">Sales Opportunity → Accepted Quotation → Active Project</strong></span>
            <span className="text-[#3B5BFD] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Handover
            </span>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3]">
              Project Timeline & Team
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Start Date</span>
                <span className="text-[#16181D] font-bold">{formatDate(project.startDate)}</span>
              </div>
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Target Due Date</span>
                <span className="text-[#16181D] font-bold">{formatDate(project.dueDate)}</span>
              </div>
              <div>
                <span className="text-[#8A8FA3] block text-[10px] uppercase font-sans">Completion Progress</span>
                <span className="font-bold text-[#3B5BFD]">{project.progress || 0}%</span>
              </div>
            </div>
          </div>

          {/* Associated Tasks */}
          <div className="p-6 rounded-[24px] border border-[#EEF1FA] bg-white space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#EEF1FA] pb-3">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8A8FA3]">
                Project Tasks ({tasks.length})
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
                + New Task
              </Button>
            </div>

            <div className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-xs text-[#8A8FA3] p-4 text-center">No tasks assigned to this project yet.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-4 rounded-2xl bg-[#EEF1FA]/40 border border-[#EEF1FA] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#16181D]">{task.title}</div>
                      <div className="text-[11px] text-[#8A8FA3] font-mono">Assignee: {task.assigneeName || 'Unassigned'}</div>
                    </div>
                    <Badge status={task.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-1 p-6 rounded-[24px] border border-[#EEF1FA] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
          <Timeline
            activities={activities}
            entityType="Project"
            entityId={project.id}
          />
        </div>
      </div>
    </div>
  );
};
