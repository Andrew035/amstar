import React from "react";
import { NavLink } from "react-router-dom";

interface NavbarProps {
  isAdmin: boolean;
  currentUser: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAdmin,
  currentUser,
  onLogout,
}) => {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    // select-none prevents highlighting, transition-all unifies hover effects
    `px-2 lg:px-4 py-2 rounded-sm font-cond uppercase tracking-wider text-sm transition-all select-none ${
      isActive
        ? "bg-amstar-raised text-white shadow-[inset_0_-2px_0_theme(colors.amstar.red)]"
        : "text-amstar-ink-dim hover:bg-amstar-raised/50 hover:text-white"
    }`;

  /** Full wording on a desktop, short below - five long labels do not fit an iPad. */
  const Label: React.FC<{ full: string; short: string }> = ({
    full,
    short,
  }) => (
    <>
      <span className="hidden lg:inline">{full}</span>
      <span className="lg:hidden">{short}</span>
    </>
  );

  return (
    <header className="bg-amstar-blue border-b border-amstar-line sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* Brand: welded AM badge + wordmark */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-9 h-9 bg-amstar-red rounded-sm grid place-items-center font-cond font-bold text-white text-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.28),0_1px_0_rgba(255,255,255,0.2)]">
            AM
          </div>
          <div>
            <h1 className="font-cond text-lg font-bold text-white tracking-tight leading-none">
              AM STAR
            </h1>
            <span className="font-cond text-[10px] font-bold text-amstar-ink-faint tracking-[0.22em] uppercase">
              Transmissions
            </span>
          </div>
        </div>

        {/* Navigation Links - draggable={false} stops the ghost dragging! */}
        <nav className="flex items-center gap-1 lg:gap-2">
          <NavLink to="/" className={linkClass} draggable={false}>
            <Label full="Shop Overview" short="Overview" />
          </NavLink>
          <NavLink to="/queue" className={linkClass} draggable={false}>
            <Label full="Active Queue" short="Queue" />
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/pricing" className={linkClass} draggable={false}>
                <Label full="Pricing Calculator" short="Pricing" />
              </NavLink>
              <NavLink to="/history" className={linkClass} draggable={false}>
                <Label full="Completed History" short="History" />
              </NavLink>
              <NavLink to="/roster" className={linkClass} draggable={false}>
                Roster
              </NavLink>
            </>
          )}
        </nav>

        {/* User Account / Logout */}
        <div className="flex items-center gap-4 select-none">
          <span className="font-cond text-[11px] uppercase tracking-widest bg-amstar-raised border border-amstar-line px-3 py-1.5 rounded-sm text-amstar-ink-dim">
            {isAdmin ? `Admin: ${currentUser}` : `Viewer: ${currentUser}`}
          </span>
          <button
            onClick={onLogout}
            className="font-cond text-[11px] uppercase tracking-widest text-amstar-red-ink hover:text-white bg-transparent hover:bg-amstar-red border border-amstar-red px-4 py-1.5 rounded-sm transition-all"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};
