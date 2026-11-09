import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  School,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const TopNavbar = ({ openMobileMenu }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully.', 'info');
    navigate('/login');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      {/* Left section: Hamburger button & School Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={openMobileMenu}
          className="p-2 -ml-2 text-slate-600 rounded-xl hover:bg-slate-100 md:hidden transition"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/60">
            <School className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate max-w-[200px]">
              {user?.schoolName || 'Documentation Portal'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
            <Calendar className="w-3.5 h-3.5" />
            <span>Academic Year 2026-27</span>
          </div>
        </div>
      </div>

      {/* Right section: Date, Notification Bell & Profile Dropdown */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex text-xs font-medium text-slate-500 items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{currentDate}</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-600 rounded-xl hover:bg-slate-100 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Documentation Alerts
                </span>
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                  2 Pending
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="p-3 hover:bg-slate-50 transition cursor-pointer">
                  <p className="font-semibold text-slate-800">
                    Inspection Ready Review
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Maintain this week's lesson plans & practical entries for academic inspection.
                  </p>
                </div>
                <div className="p-3 hover:bg-slate-50 transition cursor-pointer">
                  <p className="font-semibold text-slate-800">
                    Teaching Diary Reminder
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Log today's covered topics and homework assignment.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition focus:outline-hidden"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs shadow-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                {user?.fullName || 'Teacher'}
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-[130px]">
                {user?.designation || 'Faculty'}
              </span>
            </div>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Authenticated Teacher</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <UserIcon className="w-4 h-4" />
                  Teacher Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  <Settings className="w-4 h-4" />
                  Portal Settings
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
