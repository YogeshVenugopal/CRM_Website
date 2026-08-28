import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NAV_ITEMS, ROLE_LABELS } from '../../utils/rbac';
import {
  LayoutDashboard,
  UserPlus,
  Kanban,
  Building2,
  FileText,
  Briefcase,
  CheckSquare,
  CreditCard,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';

const iconMap = {
  LayoutDashboard,
  UserPlus,
  Kanban,
  Building2,
  FileText,
  Briefcase,
  CheckSquare,
  CreditCard,
  BarChart3,
};

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { user, role } = useAuth();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (role === 'admin') return true;
    return item.roles.includes(role);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#16181D]/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-20 md:w-20 bg-white border-r border-[#EEF1FA] flex flex-col items-center justify-between py-6 transition-transform duration-200 ease-in-out shadow-[0_10px_30px_rgba(0,0,0,0.02)] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Pinned User Avatar & Brand Logo */}
        <div className="flex flex-col items-center space-y-5">
          {/* Brand Logo */}
          <div className="w-10 h-10 rounded-2xl bg-[#3B5BFD] text-white flex items-center justify-center font-bold font-display text-lg shadow-md shadow-[#3B5BFD]/30">
            C
          </div>

          {/* User Avatar */}
          <div className="relative group cursor-pointer" title={`${user?.name} (${role})`}>
            <Avatar name={user?.name || 'User'} src={user?.avatar} size="md" className="ring-2 ring-[#EEF1FA]" />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#3B5BFD] border-2 border-white" />
          </div>

          <div className="w-8 h-px bg-[#EEF1FA]" />
        </div>

        {/* Center: Icon Navigation Rail with Crystal Clear Icon Rendering */}
        <nav className="flex flex-col items-center space-y-3 my-auto">
          {visibleNavItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onCloseMobile}
                title={item.label}
                className={({ isActive }) =>
                  `w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative group ${
                    isActive
                      ? 'bg-[#3B5BFD] text-white shadow-lg shadow-[#3B5BFD]/30 scale-105'
                      : 'text-[#8A8FA3] hover:bg-[#EEF1FA] hover:text-[#16181D]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 shrink-0 stroke-[2.25] ${isActive ? 'text-white' : 'text-[#8A8FA3] group-hover:text-[#16181D]'}`} />
                    
                    {/* Tooltip on Hover */}
                    <span className="absolute left-16 bg-[#1B1D29] text-white text-xs font-semibold px-3 py-1.5 rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-xl">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Context Info */}
        <div className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-2xl bg-[#EEF1FA] text-[#3B5BFD] flex items-center justify-center font-bold text-xs"
            title={`Role: ${user?.role ? ROLE_LABELS[user.role] : 'User'}`}
          >
            <ShieldCheck className="w-5 h-5 stroke-[2]" />
          </div>
        </div>
      </aside>
    </>
  );
};
