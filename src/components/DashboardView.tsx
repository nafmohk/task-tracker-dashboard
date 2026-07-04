import { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { CheckCircle2, CircleDot, Play, AlertTriangle, HelpCircle } from 'lucide-react';
import { Task, Category } from '../types';

interface DashboardViewProps {
  tasks: Task[];
  categories: Category[];
}

export default function DashboardView({ tasks, categories }: DashboardViewProps) {
  // Deduplicate tasks to ensure each is counted once
  const uniqueTasks = useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter(t => {
      if (!t.id) return false;
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tasks]);

  const getTaskProgress = (t: Task) => {
    if (t.status === 'Done') return 100;
    if (t.status === 'To Do') return 0;
    return typeof t.progress === 'number' ? t.progress : 0;
  };

  // Statistics
  const stats = useMemo(() => {
    const total = uniqueTasks.length;
    const todo = uniqueTasks.filter(t => t.status === 'To Do').length;
    const inProgress = uniqueTasks.filter(t => t.status === 'In Progress').length;
    const done = uniqueTasks.filter(t => t.status === 'Done').length;
    
    // Overdue tasks (In Progress or To Do, past end date)
    const todayStr = new Date().toISOString().split('T')[0];
    const overdue = uniqueTasks.filter(t => t.status !== 'Done' && t.endDate < todayStr).length;

    const totalProgress = uniqueTasks.reduce((sum, t) => sum + getTaskProgress(t), 0);
    const completionRate = total > 0 ? Math.round(totalProgress / total) : 0;

    return { total, todo, inProgress, done, overdue, completionRate };
  }, [uniqueTasks]);

  // Tasks status distribution for Pie Chart
  const statusData = useMemo(() => {
    return [
      { name: 'To Do', value: stats.todo, color: '#94a3b8' }, // Slate-400
      { name: 'In Progress', value: stats.inProgress, color: '#4f46e5' }, // Indigo-600
      { name: 'Done', value: stats.done, color: '#10b981' } // Emerald-500
    ].filter(item => item.value > 0);
  }, [stats]);

  // Categories progress calculations
  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const catTasks = uniqueTasks.filter(t => t.category === cat.name);
      const total = catTasks.length;
      const done = catTasks.filter(t => t.status === 'Done').length;
      
      const totalProgress = catTasks.reduce((sum, t) => sum + getTaskProgress(t), 0);
      const progressPercent = total > 0 ? Math.round(totalProgress / total) : 0;

      return {
        name: cat.name,
        color: cat.color,
        total,
        done,
        progress: progressPercent
      };
    });
  }, [uniqueTasks, categories]);

  // Bar Chart Data (Progress % per category)
  const barChartData = useMemo(() => {
    return categoryStats.map(c => ({
      name: c.name,
      Progress: c.progress,
      color: c.color,
      Tasks: c.total
    }));
  }, [categoryStats]);

  // Live Workflow Summary: recent 4 tasks
  const recentTasks = useMemo(() => {
    return uniqueTasks.slice(0, 4);
  }, [uniqueTasks]);

  return (
    <div className="space-y-8 select-none" id="dashboard-view-root">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm" id="dashboard-header">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Real-time task tracking analytics and workflow statistics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Progress</p>
            <p className="text-2xl font-black text-slate-800">{stats.completionRate}%</p>
          </div>
          <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500" 
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-grid">
        {/* Total Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="stat-total">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="h-12 w-12 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center">
            <CircleDot className="h-6 w-6" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="stat-in-progress">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.inProgress}</p>
          </div>
          <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="stat-done">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.done}</p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between" id="stat-overdue">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue</p>
            <p className="text-3xl font-bold text-rose-600 mt-1">{stats.overdue}</p>
          </div>
          <div className="h-12 w-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="charts-row">
        
        {/* Progress % per Category (Bar Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-8 flex flex-col justify-between" id="category-progress-chart">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Category Progress</h3>
            <p className="text-xs text-slate-400">Completion percentage across dynamically created task categories.</p>
          </div>
          
          <div className="h-72 mt-6">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                    formatter={(value, name) => [`${value}%`, name]}
                  />
                  <Bar dataKey="Progress" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#4f46e5'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <HelpCircle className="h-8 w-8 mb-2 opacity-50" />
                <span>No categories found. Create a category to seed data.</span>
              </div>
            )}
          </div>
        </div>

        {/* Task State Distribution (Pie Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-4 flex flex-col" id="workflow-distribution-chart">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Workflow State</h3>
            <p className="text-xs text-slate-400">Total volume of tasks divided by state.</p>
          </div>

          <div className="h-56 mt-4 flex items-center justify-center relative">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm">No tasks added yet</div>
            )}

            {/* Core percentage displayed inside donut */}
            {statusData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
              </div>
            )}
          </div>

          {/* Pie Chart Legend */}
          <div className="mt-auto space-y-2 pt-2 border-t border-slate-50">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                <span>To Do</span>
              </div>
              <span className="font-semibold text-slate-700">{stats.todo} tasks</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                <span>In Progress</span>
              </div>
              <span className="font-semibold text-slate-700">{stats.inProgress} tasks</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Done</span>
              </div>
              <span className="font-semibold text-slate-700">{stats.done} tasks</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Live Workflow Summary & Category List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="bottom-grid">
        
        {/* Live Workflow Summary (List of recent tasks) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-8" id="recent-workflow">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recent Live Activity</h3>
          <p className="text-xs text-slate-400 mb-5">Quick overview of the latest registered tasks inside your workspace.</p>

          <div className="overflow-x-auto">
            {recentTasks.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-1">Task Title</th>
                    <th className="py-3">Assignee</th>
                    <th className="py-3">Category</th>
                    <th className="py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {recentTasks.map(t => {
                    // Match category for color badge
                    const catInfo = categories.find(c => c.name === t.category);
                    const catBg = catInfo ? catInfo.color : '#e2e8f0';

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-1 font-semibold text-slate-700 max-w-[200px] truncate">{t.title}</td>
                        <td className="py-3 text-slate-500 font-medium">{t.assigneeName}</td>
                        <td className="py-3">
                          <span 
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-xs"
                            style={{ backgroundColor: catBg }}
                          >
                            {t.category}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            t.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            t.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No tasks available. Create a task in the Tasks page to populate dashboard statistics.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Category List & Breakdowns */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-4" id="category-health">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Category Distribution</h3>
          <p className="text-xs text-slate-400 mb-5">Tasks per custom category.</p>

          <div className="space-y-4">
            {categoryStats.map(c => (
              <div key={c.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                  <span className="text-slate-400">{c.total} Tasks</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                       backgroundColor: c.color, 
                      width: `${c.total > 0 ? (c.done / c.total) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>{c.done} Completed</span>
                  <span className="font-bold">{c.progress}% Finished</span>
                </div>
              </div>
            ))}

            {categoryStats.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No custom categories added.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
