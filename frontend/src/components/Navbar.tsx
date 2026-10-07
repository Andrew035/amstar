import React from "react";
import { NavLink } from "react-router-dom";
import { AmstarLogo } from "./AmstarLogo";
import { HOVER } from "../styles/controls";

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
  /*
   * The active tab used to be a static inset border. It is now a bar that
   * grows out of the middle when a tab is picked, so when you move between
   * pages the marker travels with you instead of blinking out and in.
   * `select-none` keeps a double-tap on an iPad from highlighting the label.
   */
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-2 lg:px-4 py-2 rounded-sm font-cond uppercase tracking-wider text-sm
    select-none ${HOVER} after:absolute after:left-2 after:right-2 after:bottom-0
    after:h-0.5 after:rounded-full after:bg-amstar-red after:origin-center
    after:transition-transform after:duration-200 after:ease-out ${
      isActive
        ? "bg-amstar-raised text-white after:scale-x-100"
        : "text-amstar-ink-dim hover:bg-amstar-raised/50 hover:text-white after:scale-x-0"
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
    /*
     * `shrink-0` rather than `sticky`: the bar is a flex item outside the
     * scrolling area now (see App.tsx), so it stays put without needing to
     * stick to anything, and it spans the window with no scrollbar beside it.
     */
    <header className="shrink-0 relative z-40 bg-amstar-blue border-b border-amstar-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* Brand: the shop's wordmark. `group` drives the logo's hover. */}
        <div className="group shrink-0">
          <AmstarLogo />
        </div>

        {/* Navigation Links - draggable={false} stops the ghost dragging! */}
        <nav className="flex items-center gap-1 lg:gap-2">
          <NavLink to="/" className={linkClass} draggable={false}>
            <Label full="Overview" short="Overview" />
          </NavLink>
          <NavLink to="/queue" className={linkClass} draggable={false}>
            <Label full="Queue" short="Queue" />
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/pricing" className={linkClass} draggable={false}>
                <Label full="Pricing" short="Pricing" />
              </NavLink>
              <NavLink to="/history" className={linkClass} draggable={false}>
                <Label full="History" short="History" />
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
            className="font-cond text-[11px] uppercase tracking-widest text-amstar-red-ink
            hover:text-white bg-transparent hover:bg-amstar-red border border-amstar-red
            px-4 py-1.5 rounded-sm active:translate-y-px
            transition-[color,background-color,transform] duration-150 ease-out"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
};
