// frontend/src/components/modals/RedisTasksModal.jsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../constants/classifications';

export default function RedisTasksModal({ isOpen, onClose, token }) {
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'tasks'
  const [redisStats, setRedisStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/admin/redis/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRedisStats(data);
      }
    } catch (err) {
      console.error('Failed to load Redis stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTasks = async () => {
    if (!token) return;
    setLoadingTasks(true);
    try {
      const url = statusFilter
        ? `${API_URL}/admin/tasks?status=${statusFilter}`
        : `${API_URL}/admin/tasks`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handlePurgeCache = async () => {
    if (!token) return;
    setPurging(true);
    setPurgeResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/redis/cache/purge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pattern: 'ddas:cache:*' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPurgeResult({ success: true, message: data.message || 'Cache purged successfully' });
        fetchStats();
      } else {
        setPurgeResult({ success: false, message: data.detail || 'Failed to purge cache (Admin clearance required)' });
      }
    } catch (err) {
      setPurgeResult({ success: false, message: `Purge error: ${err.message}` });
    } finally {
      setPurging(false);
    }
  };

  const handleCancelTask = async (taskId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to cancel task:', err);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchStats();
      fetchTasks();
    }
  }, [isOpen, statusFilter, token]);

  useEffect(() => {
    if (!isOpen || !token || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchTasks();
    }, 2500);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, token, statusFilter]);

  if (!isOpen) return null;

  const isOnline = redisStats?.status === 'ONLINE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <span className="text-xl font-bold">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-wide text-white">
                  Distributed Redis Caching & Task Queue Engine
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                  isOnline 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isOnline ? '🟢 Cluster Online' : '🟡 In-Memory Fallback'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sub-millisecond read caching, sliding-window rate limiting, and async background workers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {autoRefresh ? '⚡ Live 2.5s' : '⏸ Paused'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 px-6 border-b border-slate-800 bg-slate-900/50 text-sm">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'telemetry'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚡ Cache Telemetry & Health</span>
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'tasks'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚙️ Background Task Queue</span>
            {redisStats?.task_queue?.active_tasks > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 text-xs font-bold animate-pulse">
                {redisStats.task_queue.active_tasks}
              </span>
            )}
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: CACHE TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              
              {/* Telemetry Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Hit Ratio</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-400">
                    {redisStats?.hit_ratio_percent ?? 0}%
                  </div>
                  <div className="mt-2 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, redisStats?.hit_ratio_percent || 0)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ping Latency</div>
                  <div className="mt-1 text-2xl font-bold text-cyan-300">
                    {redisStats?.ping_latency_ms != null ? `${redisStats.ping_latency_ms} ms` : 'Local < 0.1ms'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Ultra-low network overhead</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Memory Used</div>
                  <div className="mt-1 text-2xl font-bold text-amber-300">
                    {redisStats?.memory_used || 'N/A'}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Cached keys & metadata</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Tasks</div>
                  <div className="mt-1 text-2xl font-bold text-violet-400">
                    {redisStats?.task_queue?.active_tasks || 0}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {redisStats?.task_queue?.completed_tasks || 0} completed
                  </div>
                </div>
              </div>

              {/* Cache Statistics Grid */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Distributed Cache Counters
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Cache Hits:</span>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">{redisStats?.cache_hits || 0}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Cache Misses:</span>
                    <p className="text-base font-bold text-rose-400 mt-0.5">{redisStats?.cache_misses || 0}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Cache Sets:</span>
                    <p className="text-base font-bold text-cyan-400 mt-0.5">{redisStats?.cache_sets || 0}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Purges / Invalidations:</span>
                    <p className="text-base font-bold text-amber-400 mt-0.5">{redisStats?.cache_purges || 0}</p>
                  </div>
                </div>
              </div>

              {/* Administrative Cache Purge Card */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">Administrative Cache Purge</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Invalidates all active Redis cache keys (`ddas:cache:*`). Forces fresh database re-reads.
                  </p>
                  {purgeResult && (
                    <p className={`text-xs font-semibold mt-1 ${purgeResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {purgeResult.success ? '✓ ' : '⚠ '}{purgeResult.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={handlePurgeCache}
                  disabled={purging}
                  className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-semibold text-xs transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <span>{purging ? 'Purging...' : '🗑️ Purge Distributed Cache'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BACKGROUND TASK QUEUE */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              
              {/* Filter Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter Status:</span>
                  {['', 'PROCESSING', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        statusFilter === st
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st || 'ALL'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchTasks}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg border border-slate-700"
                >
                  🔄 Refresh Tasks
                </button>
              </div>

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                  No background tasks registered matching criteria.
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const isProcessing = task.status === 'PROCESSING' || task.status === 'PENDING';
                    return (
                      <div
                        key={task.task_id}
                        className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-600 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{task.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                task.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                task.status === 'PROCESSING' ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse' :
                                task.status === 'FAILED' ? 'bg-red-950 text-red-300 border border-red-800' :
                                'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {task.status}
                              </span>
                              <span className="text-xs text-slate-400">ID: {task.task_id}</span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 font-mono">{task.message}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isProcessing && (
                              <button
                                onClick={() => handleCancelTask(task.task_id)}
                                className="px-2.5 py-1 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs hover:bg-red-900/60 transition-colors"
                              >
                                Cancel Task
                              </button>
                            )}
                            <span className="text-xs text-slate-400">
                              by {task.created_by}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              task.status === 'COMPLETED' ? 'bg-emerald-500' :
                              task.status === 'FAILED' ? 'bg-red-500' :
                              task.status === 'CANCELLED' ? 'bg-slate-500' :
                              'bg-amber-400'
                            }`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
