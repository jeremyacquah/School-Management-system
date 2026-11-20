import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { OfflineSyncBanner } from './OfflineSyncBanner';
import {
  GraduationCap,
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  Receipt,
  Calendar,
  Bell,
  BookOpen,
  Award,
  Package,
  ShieldAlert,
  Clock,
  LogOut,
  Menu,
  X,
  UserCheck,
  ChevronRight,
  Sparkles,
  GitMerge,
  Smartphone,
  Monitor
} from 'lucide-react';

export const Layout = ({ activeTab, setActiveTab, children }) => {
  const { user, role, isAdmin, isUser, isParent, logout, switchRoleDemo } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);

  // Admin Navigation
  const adminNav = [
    { id: 'dashboard', label: 'Dashboard', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { id: 'grades', label: 'Grades & Reports', icon: FileSpreadsheet },
    { id: 'fees', label: 'Fees & Payments', icon: Receipt },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'notices', label: 'Notices & SMS', icon: Bell },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'exams', label: 'Exam Builder', icon: Award },
    { id: 'assets', label: 'Assets & Gear', icon: Package },
    { id: 'weeks_terms', label: 'Weeks & Terms', icon: Clock },
    { id: 'conflicts', label: 'Sync Conflicts', icon: GitMerge },
    { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
  ];

  // User (Staff / Teacher) Navigation: Create and Read only. No Audit, No Weeks/Terms edit.
  const userNav = [
    { id: 'dashboard', label: 'Staff Dashboard', icon: GraduationCap },
    { id: 'attendance', label: 'Input Attendance', icon: CalendarCheck2 },
    { id: 'grades', label: 'Input Grades & Reports', icon: FileSpreadsheet },
    { id: 'fees', label: 'Record Fee Payments', icon: Receipt },
    { id: 'timetable', label: 'View Timetable', icon: Calendar },
    { id: 'notices', label: 'View Notices', icon: Bell },
    { id: 'library', label: 'Library Issue/Return', icon: BookOpen },
    { id: 'exams', label: 'Exams & Auto-Grading', icon: Award },
    { id: 'assets', label: 'Assets & Inventory', icon: Package },
  ];

  // Parent Navigation: Strictly read only for their own child!
  const parentNav = [
    { id: 'parent_portal', label: 'My Child Portal', icon: Users },
    { id: 'attendance', label: 'Child Attendance', icon: CalendarCheck2 },
    { id: 'grades', label: 'Grades & Report Card', icon: FileSpreadsheet },
    { id: 'fees', label: 'Fees Balance & Receipts', icon: Receipt },
    { id: 'timetable', label: 'Childs Timetable', icon: Calendar },
    { id: 'notices', label: 'School Notices', icon: Bell }
  ];

  const currentNav = isParent ? parentNav : (isUser ? userNav : adminNav);

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col ${isMobilePreview ? 'max-w-md mx-auto shadow-2xl border-x border-slate-300 my-2 rounded-2xl overflow-hidden' : ''}`}>
      {/* Offline Sync Banner at the top */}
      <OfflineSyncBanner />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 bg-navy-800 text-slate-200 border-r border-navy-900 select-none shrink-0">
          {/* Logo & School Header */}
          <div className="p-4 border-b border-navy-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-900/50">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight">GREENWOOD</h1>
              <p className="text-[11px] text-emerald-400 font-medium">Academy Management</p>
            </div>
          </div>

          {/* Role Status Pill & Demo Switcher */}
          <div className="px-3 py-2.5 bg-navy-900/60 border-b border-navy-700/40">
            <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1.5 flex justify-between items-center">
              <span>Active Role</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                isAdmin ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                isUser ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {role.toUpperCase()}
              </span>
            </div>

            {/* Role Switcher Pill buttons */}
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <button
                onClick={() => switchRoleDemo('admin')}
                className={`py-1 rounded font-medium transition-all ${
                  isAdmin ? 'bg-purple-600 text-white font-bold shadow' : 'bg-navy-700/60 hover:bg-navy-700 text-slate-300'
                }`}
                title="Admin: Full CRUD on all modules, change weeks, terms, fee amounts, receipts, conflict resolution, audit logs"
              >
                Admin
              </button>
              <button
                onClick={() => switchRoleDemo('user')}
                className={`py-1 rounded font-medium transition-all ${
                  isUser ? 'bg-blue-600 text-white font-bold shadow' : 'bg-navy-700/60 hover:bg-navy-700 text-slate-300'
                }`}
                title="User: Create & Read only. No update or delete permissions."
              >
                Staff
              </button>
              <button
                onClick={() => switchRoleDemo('parent')}
                className={`py-1 rounded font-medium transition-all ${
                  isParent ? 'bg-emerald-600 text-white font-bold shadow' : 'bg-navy-700/60 hover:bg-navy-700 text-slate-300'
                }`}
                title="Parent: Read only. Only view data for own child (Ethan Miller)"
              >
                Parent
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {currentNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30'
                      : 'text-slate-300 hover:bg-navy-700/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Platform Toggle */}
          <div className="p-3 bg-navy-900/80 border-t border-navy-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || (isParent ? `Child: Ethan Miller` : 'Greenwood Staff')}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-navy-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop / Mobile Form Factor Toggle */}
            <button
              onClick={() => setIsMobilePreview(!isMobilePreview)}
              className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-navy-800 hover:bg-navy-700 text-[11px] text-slate-300 border border-navy-700"
              title="Toggle mobile form factor preview"
            >
              {isMobilePreview ? <Monitor className="w-3 h-3 text-emerald-400" /> : <Smartphone className="w-3 h-3 text-emerald-400" />}
              <span>{isMobilePreview ? 'Desktop View' : 'Mobile View (Android/iOS)'}</span>
            </button>
          </div>
        </aside>

        {/* MOBILE TOP HEADER */}
        <header className="md:hidden bg-navy-800 text-white px-4 py-3 flex items-center justify-between border-b border-navy-900 sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight leading-tight">GREENWOOD</h2>
              <span className="text-[10px] text-emerald-400 font-medium capitalize">{role} Role</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick role selector on mobile */}
            <select
              value={role}
              onChange={(e) => switchRoleDemo(e.target.value)}
              className="bg-navy-900 text-xs text-slate-200 border border-navy-700 rounded px-2 py-1"
            >
              <option value="admin">Admin</option>
              <option value="user">Staff</option>
              <option value="parent">Parent</option>
            </select>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg bg-navy-700 text-slate-200 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* MOBILE SLIDE-OUT DRAWER */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-navy-800 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto space-y-2 border-t border-navy-700">
              <div className="flex justify-between items-center pb-2 border-b border-navy-700">
                <span className="font-bold text-sm text-white">All Modules</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {currentNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-left transition-all ${
                        isActive
                          ? 'bg-brand-600 text-white font-bold shadow'
                          : 'bg-navy-700/60 text-slate-200 hover:bg-navy-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-navy-700 flex justify-between items-center text-xs text-slate-300">
                <span>Signed in as: <strong>{user?.username}</strong></span>
                <button onClick={logout} className="text-rose-400 font-medium flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE / CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM TOUCH BAR (Android & iOS Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-navy-900 border-t border-navy-800 px-2 py-1.5 flex justify-around items-center z-40 text-slate-400 select-none shadow-lg">
        {currentNav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400 scale-110' : ''}`} />
              <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};
