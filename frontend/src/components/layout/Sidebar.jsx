import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  BookMarked,
  FileSpreadsheet,
  ClipboardList,
  FolderArchive,
  FileText,
  Settings,
  LogOut,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Create Daily Record', path: '/create-record', icon: PlusCircle, isAction: true },
  { name: 'Teaching History', path: '/teaching-history', icon: BookMarked },
  { name: 'Marks Entry', path: '/marks-entry', icon: FileSpreadsheet },
  { name: 'Normal Marks Entry', path: '/normal-marks-entry', icon: ClipboardList },
  { name: 'Documents', path: '/documents', icon: FolderArchive },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = ({ isCollapsed, toggleCollapse, isMobileOpen, closeMobile }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('You have successfully logged out.', 'info');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 z-50 flex flex-col h-screen bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  AI Teacher Portal
                </span>
                <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">
                  Documentation Hub
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={closeMobile}
            className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Main Menu
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobileOpen) closeMobile();
                }}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : item.isAction
                      ? 'text-blue-400 hover:text-white hover:bg-blue-600/20 bg-blue-500/10 border border-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`
                }
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${item.isAction ? 'text-blue-400 group-hover:text-white' : ''}`} />
                {!isCollapsed && (
                  <span className="truncate flex-1 font-medium">{item.name}</span>
                )}
                {!isCollapsed && item.isAction && (
                  <span className="text-[10px] font-bold bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded-md">
                    NEW
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* User Quick Info & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-800/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'T'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.fullName || 'Teacher'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user?.schoolName || 'School Educator'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
