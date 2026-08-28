// Utility functions for formatting and status colors aligned with royal blue design tokens

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';

  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
};

export const getStatusConfig = (status) => {
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  switch (normalized) {
    // Neutral / New / Draft
    case 'new':
    case 'draft':
    case 'todo':
    case 'planned':
    case 'prospecting':
      return {
        label: status ? status.replace(/_/g, ' ') : 'New',
        bgColor: 'bg-[#EEF1FA]',
        textColor: 'text-[#6B7280]',
        dotColor: 'bg-[#9CA3AF]',
        borderColor: 'border-l-[#9CA3AF]',
        badgeBorder: 'border-[#E5E7EB]',
        type: 'neutral'
      };

    // In Progress / Negotiation / Review / Qualification / Amber / Orange
    case 'contacted':
    case 'negotiation':
    case 'in_progress':
    case 'proposal':
    case 'qualification':
    case 'review':
    case 'partially_paid':
    case 'medium':
      return {
        label: status ? status.replace(/_/g, ' ') : 'In Progress',
        bgColor: 'bg-[#FFFBEB]',
        textColor: 'text-[#D97706]',
        dotColor: 'bg-[#FDB022]',
        borderColor: 'border-l-[#FDB022]',
        badgeBorder: 'border-[#FDE68A]',
        type: 'progress'
      };

    // Positive / Qualified / Won / Paid / Completed / Done / Vivid Royal Blue
    case 'qualified':
    case 'won':
    case 'paid':
    case 'completed':
    case 'done':
    case 'accepted':
    case 'active':
      return {
        label: status ? status.replace(/_/g, ' ') : 'Completed',
        bgColor: 'bg-[#EFF6FF]',
        textColor: 'text-[#3B5BFD]',
        dotColor: 'bg-[#3B5BFD]',
        borderColor: 'border-l-[#3B5BFD]',
        badgeBorder: 'border-[#BFDBFE]',
        type: 'positive'
      };

    // Negative / Unqualified / Lost / Overdue / Cancelled / Urgent / High / Soft Red
    case 'unqualified':
    case 'lost':
    case 'overdue':
    case 'cancelled':
    case 'rejected':
    case 'on_hold':
    case 'urgent':
    case 'high':
      return {
        label: status ? status.replace(/_/g, ' ') : 'Negative',
        bgColor: 'bg-[#FEF2F2]',
        textColor: 'text-[#EF4444]',
        dotColor: 'bg-[#EF4444]',
        borderColor: 'border-l-[#EF4444]',
        badgeBorder: 'border-[#FCA5A5]',
        type: 'negative'
      };

    // Cyan / Info / Sent / Low
    case 'sent':
    case 'active_project':
    case 'low':
    default:
      return {
        label: status ? status.replace(/_/g, ' ') : status,
        bgColor: 'bg-[#ECFEFF]',
        textColor: 'text-[#0891B2]',
        dotColor: 'bg-[#22D3EE]',
        borderColor: 'border-l-[#22D3EE]',
        badgeBorder: 'border-[#A5F3FC]',
        type: 'info'
      };
  }
};
