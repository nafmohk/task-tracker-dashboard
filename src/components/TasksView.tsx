import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, Kanban, ListFilter, Eye, Edit3, Trash2, Calendar, 
  User, CheckCircle, Clock, Play, FileText, X, AlertCircle 
} from 'lucide-react';
import { Task, Category, TaskStatus, UserProfile } from '../types';
import { TaskTrackerRepository } from '../repositories/TaskTrackerRepository';

interface TasksViewProps {
  tasks: Task[];
  categories: Category[];
  currentUser: UserProfile;
  onRefresh: () => void;
  onSelectTaskForAudit?: (taskId: string) => void;
}

export default function TasksView({ 
  tasks, 
  categories, 
  currentUser, 
  onRefresh,
  onSelectTaskForAudit 
}: TasksViewProps) {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Creation & Editing State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<TaskStatus>('To Do');
  const [progress, setProgress] = useState<number>(0);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.assigneeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
      const matchStat = selectedStatus === 'All' || t.status === selectedStatus;
      return matchSearch && matchCat && matchStat;
    });
  }, [tasks, searchTerm, selectedCategory, selectedStatus]);

  // Handle Form Open (New vs Edit)
  const openCreateForm = () => {
    setError('');
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategoryName(categories[0]?.name || '');
    setAssigneeName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // +7 days
    setStatus('To Do');
    setProgress(0);
    setIsFormOpen(true);
  };

  const openEditForm = (task: Task) => {
    setError('');
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setCategoryName(task.category);
    setAssigneeName(task.assigneeName);
    setStartDate(task.startDate);
    setEndDate(task.endDate);
    setStatus(task.status);
    setProgress(task.progress ?? 0);
    setIsFormOpen(true);
  };

  // Submit Task (Create/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!categoryName) {
      setError('Please select or create a category first.');
      return;
    }
    if (!assigneeName.trim()) {
      setError('Assignee Name is required');
      return;
    }
    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return;
    }
    if (startDate > endDate) {
      setError('Start date cannot be after the end date');
      return;
    }

    setLoading(true);
    try {
      if (editingTask) {
        // Build updated task object
        const updated: Task = {
          ...editingTask,
          title,
          description,
          category: categoryName,
          assigneeName,
          startDate,
          endDate,
          status,
          progress: status === 'Done' ? 100 : (status === 'To Do' ? 0 : progress)
        };
        await TaskTrackerRepository.updateTask(updated, editingTask, currentUser);
      } else {
        await TaskTrackerRepository.createTask(
          title,
          description,
          categoryName,
          assigneeName,
          startDate,
          endDate,
          status,
          currentUser,
          status === 'Done' ? 100 : (status === 'To Do' ? 0 : progress)
        );
      }
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the task.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Change Status (for drag-and-drop alternative clicks)
  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;
    const updated = { ...task, status: newStatus };
    try {
      await TaskTrackerRepository.updateTask(updated, task, currentUser);
      onRefresh();
    } catch (err: any) {
      alert('Failed to change status: ' + err.message);
    }
  };

  // Delete Task
  const handleDeleteTaskRequest = (task: Task) => {
    setTaskToDelete(task);
  };

  const executeDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await TaskTrackerRepository.deleteTask(taskToDelete, currentUser);
      onRefresh();
    } catch (err: any) {
      setError('Failed to delete task: ' + err.message);
    } finally {
      setTaskToDelete(null);
    }
  };

  return (
    <div className="space-y-6 select-none" id="tasks-view-root">
      
      {/* View Header with Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="tasks-header">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Task Management</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-sans">Add, assign, schedule, and track workflow timelines.</p>
        </div>
        <button
          id="add-task-btn"
          onClick={openCreateForm}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center gap-4 justify-between" id="filter-toolbar">
        {/* Search */}
        <div className="relative w-full xl:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search by title, description, or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-xl transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-medium text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm">
            <ListFilter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-medium text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>

          {/* View Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-0.5 ml-auto">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'board' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Main Task Layouts */}
      <div>
        {viewMode === 'board' ? (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" id="kanban-layout">
            
            {/* Column: To Do */}
            <KanbanColumn 
              title="To Do" 
              count={filteredTasks.filter(t => t.status === 'To Do').length} 
              tasks={filteredTasks.filter(t => t.status === 'To Do')}
              categories={categories}
              onEdit={openEditForm}
              onDelete={handleDeleteTaskRequest}
              onMoveTask={handleQuickStatusChange}
              onSelectTaskForAudit={onSelectTaskForAudit}
              badgeColor="bg-slate-100 text-slate-600"
              colStatus="To Do"
            />

            {/* Column: In Progress */}
            <KanbanColumn 
              title="In Progress" 
              count={filteredTasks.filter(t => t.status === 'In Progress').length} 
              tasks={filteredTasks.filter(t => t.status === 'In Progress')}
              categories={categories}
              onEdit={openEditForm}
              onDelete={handleDeleteTaskRequest}
              onMoveTask={handleQuickStatusChange}
              onSelectTaskForAudit={onSelectTaskForAudit}
              badgeColor="bg-indigo-50 text-indigo-600 border border-indigo-100"
              colStatus="In Progress"
            />

            {/* Column: Done */}
            <KanbanColumn 
              title="Done" 
              count={filteredTasks.filter(t => t.status === 'Done').length} 
              tasks={filteredTasks.filter(t => t.status === 'Done')}
              categories={categories}
              onEdit={openEditForm}
              onDelete={handleDeleteTaskRequest}
              onMoveTask={handleQuickStatusChange}
              onSelectTaskForAudit={onSelectTaskForAudit}
              badgeColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
              colStatus="Done"
            />

          </div>
        ) : (
          /* TABULAR LIST VIEW */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="list-layout">
            {filteredTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Task Details</th>
                      <th className="py-4">Category</th>
                      <th className="py-4">Assignee</th>
                      <th className="py-4">Timeline</th>
                      <th className="py-4">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTasks.map(t => {
                      const catInfo = categories.find(c => c.name === t.category);
                      const catBg = catInfo ? catInfo.color : '#cbd5e1';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="py-4 px-6 max-w-sm">
                            <h4 className="font-bold text-slate-800 line-clamp-1">{t.title}</h4>
                            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{t.description}</p>
                            {t.status === 'In Progress' && (
                              <div className="mt-2 flex items-center gap-2 max-w-[200px]">
                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${t.progress ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-indigo-600 shrink-0">{t.progress ?? 0}%</span>
                              </div>
                            )}
                          </td>
                          <td className="py-4">
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white shadow-3xs"
                              style={{ backgroundColor: catBg }}
                            >
                              {t.category}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>{t.assigneeName}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{t.startDate} - {t.endDate}</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              t.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              t.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onSelectTaskForAudit && (
                                <button
                                  onClick={() => onSelectTaskForAudit(t.id)}
                                  className="h-8 px-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                  title="View History Logs"
                                >
                                  <FileText className="h-4 w-4" />
                                  Logs
                                </button>
                              )}
                              <button
                                onClick={() => openEditForm(t)}
                                className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-center cursor-pointer"
                                title="Edit Task"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTaskRequest(t)}
                                className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg flex items-center justify-center cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 text-sm">
                No matching tasks found. Refine your keyword search or filter parameters.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Creation / Editing Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="task-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingTask ? 'Edit Workflow Task' : 'Create New Workflow Task'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Please fill in task detail specifications below.</p>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg flex items-center justify-center cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="task-title">Task Title</label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. Design Dashboard Prototype"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600" htmlFor="task-desc">Detailed Description</label>
                  <textarea
                    id="task-desc"
                    rows={3}
                    placeholder="Provide spec guidelines, expectations, or reference links..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                  />
                </div>

                {/* Column Split: Category & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600" htmlFor="task-cat">Work category</label>
                    <select
                      id="task-cat"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      {categories.length === 0 && (
                        <option value="">(No categories available)</option>
                      )}
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600" htmlFor="task-assignee">Assignee Name</label>
                    <input
                      id="task-assignee"
                      type="text"
                      required
                      placeholder="e.g. Nawaf"
                      value={assigneeName}
                      onChange={(e) => setAssigneeName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {/* Column Split: Start Date & End Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600" htmlFor="task-start-date">Start Date</label>
                    <input
                      id="task-start-date"
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600" htmlFor="task-end-date">Target End Date</label>
                    <input
                      id="task-end-date"
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {/* Status selector (only shown when editing, or optional for create) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Workflow Progress Status</label>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['To Do', 'In Progress', 'Done'] as TaskStatus[]).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(st)}
                        className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          status === st 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {st === 'Done' && <CheckCircle className="h-3.5 w-3.5" />}
                        {st === 'In Progress' && <Play className="h-3.5 w-3.5" />}
                        {st === 'To Do' && <Clock className="h-3.5 w-3.5" />}
                        <span>{st}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress slider when In Progress */}
                {status === 'In Progress' && (
                  <div className="space-y-1 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                      <label htmlFor="task-progress-slider">Progress Percentage</label>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">{progress}%</span>
                    </div>
                    <input
                      id="task-progress-slider"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progress}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="task-save-btn"
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md cursor-pointer disabled:opacity-75"
                  >
                    {loading ? 'Saving...' : 'Save Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Task Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTaskToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              id="delete-task-backdrop"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-xl flex flex-col gap-4 text-slate-800 z-10"
              id="delete-task-dialog"
            >
              <div className="flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-sm md:text-base">Delete Task?</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to delete the task <strong className="text-slate-800">"{taskToDelete.title}"</strong>? This will permanently remove it from the workflow registry and database.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  id="delete-task-cancel"
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg text-xs transition-all border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="delete-task-confirm"
                  type="button"
                  onClick={executeDeleteTask}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-all shadow-2xs cursor-pointer"
                >
                  Delete Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* KANBAN COLUMN COMPONENT */
interface KanbanColumnProps {
  title: string;
  count: number;
  tasks: Task[];
  categories: Category[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onMoveTask: (task: Task, newStatus: TaskStatus) => void;
  onSelectTaskForAudit?: (taskId: string) => void;
  badgeColor: string;
  colStatus: TaskStatus;
}

function KanbanColumn({ 
  title, 
  count, 
  tasks, 
  categories, 
  onEdit, 
  onDelete, 
  onMoveTask,
  onSelectTaskForAudit,
  badgeColor,
  colStatus
}: KanbanColumnProps) {
  return (
    <div className="bg-slate-100/60 p-4 rounded-xl border border-slate-200/50 min-h-[500px]" id={`column-${title.toLowerCase().replace(' ', '-')}`}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-slate-700 text-sm">{title}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${badgeColor}`}>{count}</span>
      </div>

      {/* Task Stack */}
      <div className="space-y-3.5">
        {tasks.map(t => {
          const catInfo = categories.find(c => c.name === t.category);
          const catBg = catInfo ? catInfo.color : '#cbd5e1';

          return (
            <motion.div 
              key={t.id}
              layoutId={t.id}
              className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group duration-200"
              id={`kanban-card-${t.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-3xs"
                  style={{ backgroundColor: catBg }}
                >
                  {t.category}
                </span>
                
                {/* Micro Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {onSelectTaskForAudit && (
                    <button
                      onClick={() => onSelectTaskForAudit(t.id)}
                      className="p-1 text-slate-400 hover:text-indigo-500 rounded-md hover:bg-slate-50 cursor-pointer"
                      title="Audit History Log"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(t)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-50 cursor-pointer"
                    title="Edit specs"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(t)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-50 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="font-bold text-slate-800 text-sm leading-snug">{t.title}</h4>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>

              {t.status === 'In Progress' && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold text-indigo-600">
                    <span>Progress</span>
                    <span>{t.progress ?? 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${t.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Assignee & Dates footer */}
              <div className="mt-4 pt-3.5 border-t border-slate-100/50 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <div className="h-5 w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                    {t.assigneeName.charAt(0)}
                  </div>
                  <span>{t.assigneeName}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>Due: {t.endDate}</span>
                </div>
              </div>

              {/* Board state transition buttons (move column) */}
              <div className="mt-3.5 pt-2 border-t border-slate-100/30 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {colStatus !== 'To Do' && (
                  <button 
                    onClick={() => onMoveTask(t, 'To Do')}
                    className="px-2 py-0.5 text-[10px] font-black text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200/50 cursor-pointer"
                  >
                    ← To Do
                  </button>
                )}
                {colStatus !== 'In Progress' && (
                  <button 
                    onClick={() => onMoveTask(t, 'In Progress')}
                    className="px-2 py-0.5 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200/20 cursor-pointer"
                  >
                    ⚡ Start
                  </button>
                )}
                {colStatus !== 'Done' && (
                  <button 
                    onClick={() => onMoveTask(t, 'Done')}
                    className="px-2 py-0.5 text-[10px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200/20 cursor-pointer"
                  >
                    ✓ Finish
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {tasks.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200/60">
            Column empty
          </div>
        )}
      </div>
    </div>
  );
}
