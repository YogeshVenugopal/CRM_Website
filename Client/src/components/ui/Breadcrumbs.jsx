import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = ({ customItems }) => {
  const location = useLocation();

  if (customItems) {
    return (
      <nav className="flex items-center space-x-1.5 text-xs text-[#8A8FA3]">
        <Link to="/dashboard" className="hover:text-[#3B5BFD] transition-colors">
          <Home className="w-3.5 h-3.5" />
        </Link>
        {customItems.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-[#8A8FA3]/50" />
            {item.path ? (
              <Link to={item.path} className="hover:text-[#3B5BFD] transition-colors font-medium">
                {item.label}
              </Link>
            ) : (
              <span className="text-[#16181D] font-bold">
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>
    );
  }

  // Automatic path generator
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-[#8A8FA3]">
      <Link to="/dashboard" className="hover:text-[#3B5BFD] transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((seg, idx) => {
        const path = `/${segments.slice(0, idx + 1).join('/')}`;
        const isLast = idx === segments.length - 1;
        const formatted = seg.replace(/-/g, ' ');

        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-3 h-3 text-[#8A8FA3]/50" />
            {isLast ? (
              <span className="text-[#16181D] font-bold capitalize">
                {formatted}
              </span>
            ) : (
              <Link to={path} className="hover:text-[#3B5BFD] transition-colors font-medium capitalize">
                {formatted}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
