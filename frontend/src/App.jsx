import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AttendanceModule } from './pages/AttendanceModule';
import { GradesModule } from './pages/GradesModule';
import { FeesModule } from './pages/FeesModule';
import { TimetableModule } from './pages/TimetableModule';
import { NoticesModule } from './pages/NoticesModule';
import { LibraryModule } from './pages/LibraryModule';
import { ExamsModule } from './pages/ExamsModule';
import { AssetsModule } from './pages/AssetsModule';
import { AuditLogModule } from './pages/AuditLogModule';
import { WeeksTermsModule } from './pages/WeeksTermsModule';
import { SyncConflictsPage } from './pages/SyncConflictsPage';
import { ParentPortal } from './pages/ParentPortal';
import { GraduationCap, Lock, User, Key, Sparkles } from 'lucide-react';

export function App() {
  const { user, role, token, login, switchRoleDemo } = useAuth();
  const [activeTab, setActiveTab] = useState(role === 'parent' ? 'parent_portal' : 'dashboard');

  // Login form state
  const [loginMode, setLoginMode] = useState('parent'); // 'parent' | 'staff'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user changes role, adjust default tab
  React.useEffect(() => {
    const allowedParentTabs = ['parent_portal', 'attendance', 'grades', 'fees', 'timetable', 'notices'];
    if (role === 'parent') {
      if (!allowedParentTabs.includes(activeTab)) {
        setActiveTab('parent_portal');
      }
    } else {
      if (activeTab === 'parent_portal') {
        setActiveTab('dashboard');
      }
    }
  }, [role, activeTab]);

  const handleLoginForm = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setLoginError(err.message || 'Invalid credentials. Please verify details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not logged in, render authentication screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-700">
          <div className="bg-navy-800 p-6 text-white text-center">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-brand-900/50">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">GREENWOOD ACADEMY</h1>
            <p className="text-xs text-slate-300 mt-1">School Management System • Desktop & Mobile</p>
          </div>

          <div className="p-6 space-y-4">
            {/* Login Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('parent');
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                className={`py-2 rounded-lg transition-all ${loginMode === 'parent'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                👨‍👩‍👧 Parent Portal
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('staff');
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                className={`py-2 rounded-lg transition-all ${loginMode === 'staff'
                    ? 'bg-white text-brand-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                  }`}
              >
                🏫 Staff / Admin
              </button>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginForm} className="space-y-3.5 text-xs">
              {loginMode === 'parent' ? (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Student Full Name or Admission No
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="e.g. Kofi Mensah or SCH-KG1-001"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Child's Unique Parent Password (PIN)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        placeholder="Enter unique 6-digit PIN (e.g. 378017)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                    🔒 <strong>Strict Privacy:</strong> You will only have access to your child's academic records, fees, and attendance. Other students remain private.
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Username</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Enter admin or staff username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        placeholder="Enter staff password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full font-bold py-2.5 rounded-lg text-xs shadow transition-colors text-white ${loginMode === 'parent'
                    ? 'bg-emerald-700 hover:bg-emerald-600'
                    : 'bg-navy-800 hover:bg-navy-700'
                  }`}
              >
                {isSubmitting ? 'Verifying...' : loginMode === 'parent' ? 'Access Child Portal' : 'Sign In as Staff'}
              </button>
            </form>

            {/* Quick Demo Switcher on Login Screen */}
            <div className="pt-4 border-t border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Or Quick Login as:
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => switchRoleDemo('admin')}
                  className="p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-lg font-bold transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => switchRoleDemo('user')}
                  className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-lg font-bold transition-colors"
                >
                  Staff
                </button>
                <button
                  type="button"
                  onClick={() => switchRoleDemo('parent')}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-lg font-bold transition-colors"
                >
                  Parent
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active module router
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'attendance':
        return <AttendanceModule />;
      case 'grades':
        return <GradesModule />;
      case 'fees':
        return <FeesModule />;
      case 'timetable':
        return <TimetableModule />;
      case 'notices':
        return <NoticesModule />;
      case 'library':
        return <LibraryModule />;
      case 'exams':
        return <ExamsModule />;
      case 'assets':
        return <AssetsModule />;
      case 'audit':
        return <AuditLogModule />;
      case 'weeks_terms':
        return <WeeksTermsModule />;
      case 'conflicts':
        return <SyncConflictsPage />;
      case 'parent_portal':
        return <ParentPortal />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveTab()}
    </Layout>
  );
}

export default App;
