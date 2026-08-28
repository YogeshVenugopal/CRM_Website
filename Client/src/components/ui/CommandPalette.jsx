import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Kanban, FileText, CheckSquare, CreditCard } from 'lucide-react';
import { MOCK_LEADS, MOCK_CLIENTS, MOCK_PROJECTS, MOCK_INVOICES } from '../../mock/mockData';

export const CommandPalette = ({ isOpen, onClose, onQuickAction }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search Results
  const term = query.toLowerCase();
  const searchResults = [
    ...MOCK_LEADS.filter((l) => l.name.toLowerCase().includes(term) || l.company.toLowerCase().includes(term)).map((l) => ({
      id: l.id,
      title: `${l.name} (${l.company})`,
      category: 'Leads',
      path: `/leads`,
    })),
    ...MOCK_CLIENTS.filter((c) => c.name.toLowerCase().includes(term)).map((c) => ({
      id: c.id,
      title: c.name,
      category: 'Clients',
      path: `/clients`,
    })),
    ...MOCK_PROJECTS.filter((p) => p.name.toLowerCase().includes(term) || p.code.toLowerCase().includes(term)).map((p) => ({
      id: p.id,
      title: `${p.code} — ${p.name}`,
      category: 'Projects',
      path: `/projects/${p.id}`,
    })),
    ...MOCK_INVOICES.filter((i) => i.invoiceNumber.toLowerCase().includes(term) || i.clientName.toLowerCase().includes(term)).map((i) => ({
      id: i.id,
      title: `${i.invoiceNumber} — ${i.clientName}`,
      category: 'Invoices',
      path: `/invoices/${i.id}`,
    })),
  ].slice(0, 6);

  const quickActions = [
    { label: 'New Lead', icon: UserPlus, action: 'lead' },
    { label: 'New Opportunity', icon: Kanban, action: 'opportunity' },
    { label: 'New Quotation', icon: FileText, action: 'quotation' },
    { label: 'New Task', icon: CheckSquare, action: 'task' },
    { label: 'New Invoice', icon: CreditCard, action: 'invoice' },
  ];

  const handleSelect = (path, action) => {
    onClose();
    if (action && onQuickAction) {
      onQuickAction(action);
    } else if (path) {
      navigate(path);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#16181D]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Box */}
      <div className="relative w-full max-w-xl bg-white border border-[#EEF1FA] rounded-[24px] shadow-2xl overflow-hidden">
        {/* Input Header */}
        <div className="flex items-center px-5 py-4 border-b border-[#EEF1FA] bg-[#EEF1FA]/30">
          <Search className="w-5 h-5 text-[#3B5BFD] mr-3 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-[#16181D] text-sm focus:outline-none placeholder-[#8A8FA3]"
            placeholder="Search leads, clients, projects, invoices, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="text-[10px] font-mono font-bold bg-[#EEF1FA] text-[#3B5BFD] px-2 py-1 rounded-full border border-transparent">
            ESC
          </span>
        </div>

        {/* Action Items */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-4">
          {/* Quick Actions */}
          <div>
            <div className="text-[10px] uppercase font-mono font-bold text-[#8A8FA3] px-2 mb-2">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(null, item.action)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-[#16181D] bg-[#EEF1FA]/50 hover:bg-[#3B5BFD] hover:text-white rounded-full transition-all text-left group"
                >
                  <item.icon className="w-4 h-4 text-[#3B5BFD] group-hover:text-white shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Results */}
          {query && (
            <div>
              <div className="text-[10px] uppercase font-mono font-bold text-[#8A8FA3] px-2 mb-2">
                Search Results ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="px-3 py-4 text-xs text-[#8A8FA3] text-center">
                  No matching records found.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelect(res.path)}
                      className="flex items-center justify-between px-4 py-2.5 text-xs rounded-2xl bg-white hover:bg-[#3B5BFD]/5 border border-[#EEF1FA] cursor-pointer transition-colors"
                    >
                      <span className="font-bold text-[#16181D]">
                        {res.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#EEF1FA] text-[#3B5BFD]">
                        {res.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
