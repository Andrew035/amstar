import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavbarProps {
  isAdmin: boolean;
  currentUser: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdmin, currentUser, onLogout }) => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    // select-none prevents highlighting, transition-all unifies hover effects
    `px-4 py-2 rounded-lg font-bold text-sm transition-all select-none ${isActive
      ? 'bg-amstar-blue text-white shadow-md'
      : 'text-slate-600 hover:bg-slate-100 hover:text-amstar-blue'
    }`;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">

        {/* Brand Title */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-4 h-8 bg-amstar-red rounded-sm" />
          <div>
            <h1 className="text-lg font-black text-amstar-blue tracking-tight leading-none">AM STAR</h1>
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Transmissions</span>
          </div>
        </div>

        {/* Navigation Links - draggable={false} stops the ghost dragging! */}
        <nav className="flex items-center gap-2">
          <NavLink to="/" className={linkClass} draggable={false}>Shop Overview</NavLink>
          <NavLink to="/queue" className={linkClass} draggable={false}>Active Queue</NavLink>
          {isAdmin && (
            <>
              <NavLink to="/pricing" className={linkClass} draggable={false}>Pricing Calculator</NavLink>
              <NavLink to="/history" className={linkClass} draggable={false}>Completed History</NavLink>
            </>
          )}
        </nav>

        {/* User Account / Logout */}
        <div className="flex items-center gap-4 select-none">
          <span className="text-xs font-bold bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 shadow-inner">
            {isAdmin ? `Admin: ${currentUser}` : `Viewer: ${currentUser}`}
          </span>
          <button
            onClick={onLogout}
            className="text-xs font-black text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 px-4 py-1.5 rounded-lg transition-all shadow-sm"
          >
            Log Out
          </button>
        </div>

      </div>
    </header>
  );
};
