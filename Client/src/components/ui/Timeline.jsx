import React, { useState } from 'react';
import { formatDate, getStatusConfig } from '../../utils/formatters';
import {
  PhoneCall,
  Mail,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  DollarSign,
  Plus,
  Clock,
} from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';

const getActivityIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'call':
      return PhoneCall;
    case 'email':
      return Mail;
    case 'meeting':
      return Calendar;
    case 'won':
    case 'complete':
    case 'accepted':
      return CheckCircle2;
    case 'quotation_sent':
    case 'quotation':
      return FileText;
    case 'project':
    case 'handover':
      return Briefcase;
    case 'payment':
      return DollarSign;
    default:
      return AlertCircle;
  }
};

export const Timeline = ({
  activities = [],
  entityType,
  entityId,
  onAddActivity,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    if (onAddActivity) {
      onAddActivity({
        entityType,
        entityId,
        type: activityType,
        title,
        description,
        performedBy: 'Current User',
        createdAt: new Date().toISOString(),
      });
    }
    setTitle('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Add Action */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold font-display text-[#16181D] uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#3B5BFD]" />
          Activity Timeline
        </h3>
        {onAddActivity && (
          <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
            Log Activity
          </Button>
        )}
      </div>

      {/* Vertical Timeline Structure */}
      {activities.length === 0 ? (
        <div className="p-6 text-center text-xs text-[#8A8FA3] border border-dashed border-[#8A8FA3]/30 rounded-2xl bg-[#EEF1FA]/30">
          No activity logs recorded yet for this {entityType || 'record'}.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EEF1FA]">
          {activities.map((item) => {
            const IconComponent = getActivityIcon(item.type);
            const statusCfg = getStatusConfig(item.type);

            return (
              <div key={item.id} className="relative group">
                {/* Node Dot / Icon */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ring-white ${statusCfg.dotColor}`}
                >
                  <IconComponent className="w-3 h-3 text-white" />
                </div>

                {/* Event Content Card */}
                <div className="bg-white border border-[#EEF1FA] rounded-2xl p-4 shadow-xs hover:border-[#3B5BFD]/40 transition-all">
                  <div className="flex items-start justify-between">
                    <h4 className="text-xs font-bold text-[#16181D]">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-mono text-[#8A8FA3] shrink-0 ml-2">
                      {formatDate(item.createdAt, true)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-[#8A8FA3] mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                  {item.performedBy && (
                    <div className="mt-2 text-[11px] font-mono text-[#8A8FA3] flex items-center gap-1">
                      <span>by</span>
                      <span className="font-semibold text-[#16181D]">
                        {item.performedBy}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log Activity Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log New Activity"
        subtitle={`Record communication or event for ${entityType}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Activity Type"
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            options={[
              { label: 'Phone Call', value: 'call' },
              { label: 'Email Sent / Received', value: 'email' },
              { label: 'Meeting Held', value: 'meeting' },
              { label: 'Status / Note', value: 'note' },
            ]}
          />
          <Input
            label="Title / Summary"
            placeholder="e.g. Discovery Call with Client"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider pl-1">
              Detailed Notes
            </label>
            <textarea
              rows={3}
              className="w-full rounded-2xl border border-[#EEF1FA] bg-[#EEF1FA] text-[#16181D] text-xs sm:text-sm p-4 focus:outline-none focus:ring-2 focus:ring-[#3B5BFD]/40 focus:bg-white placeholder-[#8A8FA3]"
              placeholder="Key discussion points, action items, next steps..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF1FA]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Activity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
