import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { AmstarLogo } from "./AmstarLogo";
import { HOVER, PRESS } from "../styles/controls";
import { DropdownArrow } from "./DropdownArrow";

interface NavbarProps {
  isAdmin: boolean;
  // For the chip's label. `isAdmin` means "may edit" and both roles may.
  currentRole: string | null;
  currentUser: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAdmin,
  currentRole,
  currentUser,
  onLogout,
}) => {
  /*
   * The account menu.
   *
   * Roster moves behind the chip because its one job - add, rename, retire a
   * name - is maintenance done a few times a year, while it was costing a
   * permanent navbar slot. "Who has capacity" already answers the daily
   * question on the Overview.
   *
   * A plain `absolute` panel, not the fixed/panelCoords pattern the rest of
   * the app uses. That is safe *here specifically*: <header> is a flex sibling
   * of <main> and nothing animates it, so there is no transformed ancestor to
   * position against. The fixed dropdowns elsewhere exist because their
   * triggers sit inside scrolling, overflow-hidden table cells.
   */
  const [menu, setMenu] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const MENU_ROW =
    `w-full text-left min-h-11 px-4 flex items-center gap-3 font-cond uppercase ` +
    `tracking-widest text-[11px] text-amstar-ink-dim ${HOVER} ` +
    `hover:bg-amstar-surface hover:text-amstar-ink ` +
    `border-b border-amstar-line-soft last:border-0 ` +
    `focus:outline-none focus:bg-amstar-surface focus:text-amstar-ink`;
  /*
   * The active tab used to be a static inset border. It is now a bar that
   * grows out of the middle when a tab is picked, so when you move between
   * pages the marker travels with you instead of blinking out and in.
   * `select-none` keeps a double-tap on an iPad from highlighting the label.
   */
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-2 lg:px-4 py-2 min-h-11 flex items-center rounded-sm font-cond uppercase tracking-wider text-sm
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
          {/* Invoices is the owner's alone. Everything else the shop can see,
              the bookkeeper can see. */}
          {isAdmin && (
            <NavLink to="/invoices" className={linkClass} draggable={false}>
              <Label full="Invoices" short="Invoices" />
            </NavLink>
          )}
          <NavLink to="/history" className={linkClass} draggable={false}>
            <Label full="History" short="History" />
          </NavLink>
        </nav>

        {/* Account: the chip is the trigger, roster and logout live behind it. */}
        <div className="relative flex items-center select-none" ref={wrap}>
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-expanded={menu}
            aria-haspopup="menu"
            className={`font-cond text-[11px] uppercase tracking-widest bg-amstar-raised
              border px-2 lg:px-4 py-2 min-h-11 relative rounded-sm flex items-center gap-2 ${HOVER} ${PRESS}
              focus:outline-none focus:border-amstar-red-edge focus:ring-2 focus:ring-amstar-red-edge/40
              ${
                menu
                  ? "border-amstar-red text-amstar-ink"
                  : "border-amstar-line text-amstar-ink-dim hover:border-amstar-red hover:text-amstar-ink"
              }`}
          >
            <span className="truncate max-w-[12rem]">
              {currentRole
                ? `${currentRole.replace(/_/g, " ")}: ${currentUser}`
                : currentUser}
            </span>
            <DropdownArrow isOpen={menu} />
          </button>

          {menu && (
            <div
              role="menu"
              className="anim-pop absolute right-0 top-full mt-2 w-52 bg-amstar-raised
                border border-amstar-line rounded shadow-2xl overflow-hidden origin-top-right"
            >
              <NavLink
                to="/roster"
                role="menuitem"
                onClick={() => setMenu(false)}
                className={MENU_ROW}
              >
                Shop roster
              </NavLink>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(false);
                  onLogout();
                }}
                className={`${MENU_ROW} text-amstar-red-ink hover:text-white hover:bg-amstar-red`}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
