import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, ListTodo, FolderGit, History, LogOut, 
  User, Menu, X, RefreshCw, Terminal 
} from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import CategoriesView from './components/CategoriesView';
import AuditLogsView from './components/AuditLogsView';

import { TaskTrackerRepository } from './repositories/TaskTrackerRepository';
import { Task, Category, AuditLog, UserProfile } from './types';

type TabId = 'dashboard' | 'tasks' | 'categories' | 'audit';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  // Main lists states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Specific task filter for Audit Logs
  const [selectedTaskIdForAudit, setSelectedTaskIdForAudit] = useState<string | undefined>(undefined);

  // App sync/refresh state
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = TaskTrackerRepository.listenToAuthState((profile) => {
      setCurrentUser(profile);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch all application data from Firebase
  const loadAppData = useCallback(async () => {
    if (!currentUser) return;
    setSyncing(true);
    try {
      const [fetchedTasks, fetchedCategories, fetchedLogs] = await Promise.all([
        TaskTrackerRepository.fetchTasks(),
        TaskTrackerRepository.fetchCategories(),
        TaskTrackerRepository.fetchAuditLogs()
      ]);
      
      setTasks(fetchedTasks);
      setCategories(fetchedCategories);
      setAuditLogs(fetchedLogs);
    } catch (err) {
      console.error("Error loading workspace data from Firestore:", err);
    } finally {
      setSyncing(false);
    }
  }, [currentUser]);

  // Load app data whenever current user is verified
  useEffect(() => {
    if (currentUser) {
      loadAppData();
    }
  }, [currentUser, loadAppData]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const executeLogout = async () => {
    setShowLogoutConfirm(false);
    await TaskTrackerRepository.logout();
    setCurrentUser(null);
    setTasks([]);
    setCategories([]);
    setAuditLogs([]);
  };

  // Switch to audit logs and filter by specific task ID
  const handleViewTaskAuditLogs = (taskId: string) => {
    setSelectedTaskIdForAudit(taskId);
    setActiveTab('audit');
  };

  // Auth checking state screen
  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans select-none">
        <div className="h-12 w-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 mt-4 tracking-wide">Syncing Security Credentials...</p>
      </div>
    );
  }

  // Not logged in -> Auth Screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(profile) => setCurrentUser(profile)} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans" id="app-workspace-root">
      
      {/* Mobile Top Navbar */}
      <header className="lg:hidden bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs" id="mobile-top-nav">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm bg-indigo-500 flex items-center justify-center text-white font-sans font-bold text-sm">
            T
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-md">TaskFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAppData}
            disabled={syncing}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
            title="Refresh database"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative min-h-0">
        
        {/* SIDEBAR NAVIGATION - Responsive (slide over on mobile, permanent on desktop) */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `} id="main-sidebar">
          
          <div className="space-y-8">
            {/* Sidebar branding */}
            <div className="hidden lg:flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-sm bg-indigo-500 flex items-center justify-center text-white font-sans font-bold text-md">
                T
              </div>
              <div>
                <h1 className="text-md font-bold text-white tracking-tight">TASKFLOW</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {TaskTrackerRepository.isLocalMode() ? 'Sandbox Mode' : 'Cloud Engine'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1" id="sidebar-navigation">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Main Menu</p>
              
              <button
                id="tab-dashboard"
                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
                <span>Dashboard</span>
              </button>

              <button
                id="tab-tasks"
                onClick={() => { setActiveTab('tasks'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'tasks' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ListTodo className="h-4.5 w-4.5" />
                <span>Tasks Management</span>
              </button>

              <button
                id="tab-categories"
                onClick={() => { setActiveTab('categories'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'categories' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FolderGit className="h-4.5 w-4.5" />
                <span>Categories</span>
              </button>

              <button
                id="tab-audit"
                onClick={() => { setActiveTab('audit'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'audit' 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <History className="h-4.5 w-4.5" />
                <span>Audit Ledger</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer (User Info & Logout) */}
          <div className="pt-6 border-t border-slate-800 space-y-4" id="sidebar-footer">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-snug">{currentUser.fullName}</p>
                <p className="text-[10px] text-slate-500 font-semibold truncate">@{currentUser.username}</p>
                {TaskTrackerRepository.isLocalMode() && (
                  <span className="inline-block mt-1 text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-sm font-extrabold tracking-wider uppercase">
                    Sandbox Mode
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadAppData}
                disabled={syncing}
                className="flex-1 py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="Refresh App"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                id="logout-btn"
                onClick={handleLogout}
                className="py-1.5 px-3 rounded-lg border border-rose-900/30 bg-rose-950/20 hover:bg-rose-950/40 text-xs font-semibold text-rose-400 flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)} 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-3xs z-30 lg:hidden" 
          />
        )}

        {/* MAIN WORKSPACE CONTENT WINDOW */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative" id="workspace-main-window">
          {/* Main loader indicator */}
          {syncing && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-xs text-[10px] font-bold text-slate-400">
              <div className="h-2.5 w-2.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              <span>{TaskTrackerRepository.isLocalMode() ? 'Syncing Local Sandbox...' : 'Syncing Live Cloud...'}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full max-w-6xl mx-auto"
            >
              {activeTab === 'dashboard' && (
                <DashboardView 
                  tasks={tasks} 
                  categories={categories} 
                />
              )}

              {activeTab === 'tasks' && (
                <TasksView 
                  tasks={tasks} 
                  categories={categories} 
                  currentUser={currentUser} 
                  onRefresh={loadAppData}
                  onSelectTaskForAudit={handleViewTaskAuditLogs}
                />
              )}

              {activeTab === 'categories' && (
                <CategoriesView 
                  categories={categories} 
                  currentUser={currentUser} 
                  onRefresh={loadAppData}
                />
              )}

              {activeTab === 'audit' && (
                <AuditLogsView 
                  auditLogs={auditLogs} 
                  selectedTaskId={selectedTaskIdForAudit}
                  onRefresh={loadAppData}
                  onClearFilter={() => setSelectedTaskIdForAudit(undefined)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
              id="logout-modal-backdrop"
            />
            
            {/* Dialog Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-xl flex flex-col gap-4 text-slate-800"
              id="logout-modal-dialog"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <LogOut className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-base">Sign Out from Workspace</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to log out from the enterprise Task Tracker workspace? Your session will end.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  id="logout-cancel"
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-lg text-xs transition-all border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="logout-confirm"
                  type="button"
                  onClick={executeLogout}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
