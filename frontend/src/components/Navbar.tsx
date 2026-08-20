import React from 'react';
import { NavLink } from 'react-router-dom'; // Important for active route styling

interface NavbarProps {
  isAdmin: boolean;
  currentUser: string;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdmin, currentUser, onLogout }) => {
  // Tailwind active & inactive link styles
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md font-semibold text-sm transition-colors ${isActive
      ? 'bg-amstar-blue text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
    }`;

  return (
    <header className='bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16'>

        {/* Brand Title */}
        <div className='flex items-center gap-3'>
          <div className='w-4 h-8 bg-amstar-red rounded-sm' />
          <div>
            <h1 className='text-lg font-black text-amstar-blue tracking-tight leading-none'>AMSTAR</h1>
            <span className='text-xs font-semibold text-slate-500 tracking-wider'>TRANSMISSIONS</span>
          </div>
        </div>

        {/* Router Nav Links */}
        <nav className='flex items-center gap-2'>
          <NavLink to='/' className={linkClass}>
            Shop Overview
          </NavLink>
          <NavLink to='/queue' className={linkClass}>
            Active Vehicles
          </NavLink>

          {/* Admin Protected Routes */}
          {isAdmin && (
            <>
              <NavLink to='/pricing' className={linkClass}>
                Pricing
              </NavLink>
              <NavLink to='/history' className={linkClass}>
                Vehicle History
              </NavLink>
            </>
          )}
        </nav>

        {/* User Account / Logout */}
        <div className='flex items-center gap-4'>
          <span className='text-xs font-medium bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full text-slate-600'>
            {isAdmin ? `Admin: ${currentUser}` : `Viewer: ${currentUser}`}
          </span>
          <button
            onClick={onLogout}
            className='text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded transition'
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
  )
}
