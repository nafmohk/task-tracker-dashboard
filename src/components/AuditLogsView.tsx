import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  History, Search, Clock, ArrowRight, User, Tag, Calendar, 
  RefreshCcw, ShieldCheck, CheckSquare, PlusCircle, Trash2 
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
  selectedTaskId?: string;
  onRefresh: () => void;
  onClearFilter?: () => void;
}

export default function AuditLogsView({ 
  auditLogs, 
  selectedTaskId, 
  onRefresh, 
  onClearFilter 
}: AuditLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Refresh spinner
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  // Filter logs based on search term and optional selectedTaskId filter
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchTaskFilter = !selectedTaskId || log.taskId === selectedTaskId;
      const matchSearch = 
        log.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.updatedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.updatedByUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.changeType.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchTaskFilter && matchSearch;
    });
  }, [auditLogs, selectedTaskId, searchTerm]);

  return (
    <div className="space-y-6 select-none" id="audit-logs-root">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" id="audit-logs-header">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-slate-500" />
            Audit Ledger Trail
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Immutable tracking ledger of all task states, spec updates, and workflow timelines.</p>
        </div>
        <button
          onClick={handleRefreshClick}
          disabled={refreshing}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Sync Logs
        </button>
      </div>

      {/* Target Task Filter Indicator */}
      {selectedTaskId && (
        <div className="p-4 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl flex items-center justify-between" id="active-task-filter">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
            <div className="text-sm">
              <span>Filtering trail for task ID: </span>
              <span className="font-mono font-bold bg-indigo-100 px-1.5 py-0.5 rounded-md text-xs">{selectedTaskId}</span>
              {filteredLogs[0] && (
                <>
                  <span> - </span>
                  <span className="font-bold">"{filteredLogs[0].taskTitle}"</span>
                </>
              )}
            </div>
          </div>
          {onClearFilter && (
            <button
              onClick={onClearFilter}
              className="px-3 py-1 bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg shadow-2xs border border-indigo-200/50 cursor-pointer transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Filter and Search toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3" id="audit-toolbar">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search logs by keyword, user, action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 rounded-xl transition-all"
          />
        </div>
      </div>

      {/* Ledger Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="audit-trail-timeline">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map(log => {
              const dateStr = new Date(log.timestamp).toLocaleString();
              
              // Select Action icon and color mapping
              let actionBadgeColor = 'bg-slate-100 text-slate-600';
              let ActionIcon = Clock;

              if (log.changeType === 'created') {
                actionBadgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                ActionIcon = PlusCircle;
              } else if (log.changeType === 'deleted') {
                actionBadgeColor = 'bg-rose-50 text-rose-700 border border-rose-100';
                ActionIcon = Trash2;
              } else if (log.changeType === 'updated') {
                actionBadgeColor = 'bg-indigo-50 text-indigo-700 border border-indigo-100';
                ActionIcon = CheckSquare;
              }

              return (
                <div key={log.id} className="p-5 flex flex-col md:flex-row gap-5 hover:bg-slate-50/20 transition-all duration-200">
                  
                  {/* Left Metadata panel (Time, Action) */}
                  <div className="md:w-64 shrink-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${actionBadgeColor}`}>
                        <ActionIcon className="h-3.5 w-3.5" />
                        <span>{log.changeType.toUpperCase()}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{dateStr}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500 pt-0.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-600">{log.updatedBy}</span>
                      <span className="text-[10px] text-slate-400">(@{log.updatedByUsername})</span>
                    </div>
                  </div>

                  {/* Right changeset details */}
                  <div className="flex-1 space-y-3">
                    <h4 className="font-bold text-slate-800 text-sm">
                      Task Link: <span className="text-slate-900 font-black">"{log.taskTitle}"</span>
                      <span className="font-mono text-[10px] font-bold text-slate-400 ml-2 bg-slate-50 px-1.5 py-0.5 border rounded-md">ID: {log.taskId.substring(0, 10)}...</span>
                    </h4>

                    {/* Change Details */}
                    {Object.keys(log.changes).length > 0 ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-2.5">
                        {Object.entries(log.changes).map(([field, delta]) => {
                          // Format field names nicely
                          const fieldTitle = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          const typedDelta = delta as { old: any; new: any };

                          return (
                            <div key={field} className="flex flex-col sm:flex-row items-start sm:items-center text-xs justify-between gap-2 border-b border-dashed border-slate-200/50 last:border-0 pb-2 last:pb-0">
                              <span className="font-bold text-slate-500 uppercase tracking-wide text-[10px] sm:w-32">{fieldTitle}</span>
                              
                              <div className="flex items-center gap-2 flex-1 flex-wrap sm:justify-start">
                                {typedDelta.old !== undefined && typedDelta.old !== '' ? (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium max-w-xs truncate">
                                    {String(typedDelta.old)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">None</span>
                                )}

                                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />

                                {typedDelta.new !== undefined && typedDelta.new !== '' ? (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-bold max-w-xs truncate">
                                    {String(typedDelta.new)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 italic">None</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No specific property changes logged.</p>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 text-sm">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <span>No logged history activities found in this trail.</span>
          </div>
        )}
      </div>

    </div>
  );
}
