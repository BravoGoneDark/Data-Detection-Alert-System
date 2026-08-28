// frontend/src/components/modals/UsersModal.jsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../constants/classifications';

export default function UsersModal({ isOpen, onClose, token, currentUsername }) {
  const [users, setUsers] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Debounce search input by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      if (roleFilter) params.append('role_filter', roleFilter);

      const res = await fetch(`${API_URL}/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setRoleCounts(data.role_counts || {});
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ success: false, message: err.detail || 'Failed to load member directory' });
      }
    } catch (err) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      fetchUsers();
    }
  }, [isOpen, debouncedSearch, roleFilter, token]);

  const handleChangeRole = async (userId, targetRole) => {
    if (!token) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role_name: targetRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFeedback({ success: true, message: data.message || `Role updated to ${targetRole}` });
        fetchUsers();
      } else {
        setFeedback({ success: false, message: data.detail || 'Failed to change role' });
      }
    } catch (err) {
      setFeedback({ success: false, message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-2xl border border-violet-500/40 bg-slate-950 p-6 shadow-2xl max-h-[90vh] flex flex-col text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-950/80 border border-violet-700/60 text-violet-400 text-xl">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Member Directory & Role Matrix
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full border border-violet-500/40 bg-violet-950/60 text-violet-300 font-mono">
                  Administrator Center
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect registered users, manage security clearance privileges, and promote/demote roles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Role Breakdown Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4">
          {['ADMIN', 'FACULTY', 'RESEARCHER', 'STUDENT', 'GUEST'].map((r) => (
            <div key={r} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono">{r}</span>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {roleCounts[r] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mb-3 p-2.5 rounded-lg text-xs font-semibold border flex items-center justify-between ${
            feedback.success
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              : 'bg-rose-950/80 border-rose-700 text-rose-300'
          }`}>
            <span>{feedback.success ? '✓ ' : '⚠ '}{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 w-64"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="">All Roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="FACULTY">FACULTY</option>
              <option value="RESEARCHER">RESEARCHER</option>
              <option value="STUDENT">STUDENT</option>
              <option value="GUEST">GUEST</option>
            </select>
          </div>
          <button
            onClick={fetchUsers}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1.5"
          >
            <span>🔄</span> Refresh Members
          </button>
        </div>

        {/* Member Directory Table with Persistent Height (Zero Bouncing) */}
        <div className="flex-1 overflow-auto border border-slate-800 rounded-xl bg-slate-900/40 min-h-[260px] relative">
          {loading && (
            <div className="absolute top-0 inset-x-0 h-1 bg-violet-500/80 animate-pulse z-10" />
          )}

          {!loading && users.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs font-mono">
              No registered members found matching query.
            </div>
          ) : (
            <table className={`w-full text-left text-xs border-collapse transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-800 bg-slate-950/95 text-[11px] font-mono text-slate-400 uppercase">
                  <th className="py-2.5 px-3">User & Email</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Clearance Level</th>
                  <th className="py-2.5 px-3">Datasets</th>
                  <th className="py-2.5 px-3">Security Status</th>
                  <th className="py-2.5 px-3 text-right">Promote / Demote Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {users.map((u) => {
                  const rawName = u.username || 'User';
                  const cleanName = rawName.includes('@') ? rawName.split('@')[0] : rawName;
                  const displayName = cleanName.toLowerCase().includes('pratyush') ? 'Pratyush' : cleanName;
                  const isCurrent = (
                    displayName.toLowerCase() === currentUsername?.toLowerCase() ||
                    u.username.toLowerCase() === currentUsername?.toLowerCase() ||
                    (currentUsername && u.email.toLowerCase().includes(currentUsername.toLowerCase()))
                  );
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white font-mono flex items-center gap-2">
                          <span>{displayName}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-violet-600/30 text-violet-300 border border-violet-500/40">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          u.role === 'ADMIN'
                            ? 'bg-violet-950/80 text-violet-300 border-violet-600/60'
                            : u.role === 'FACULTY' || u.role === 'RESEARCHER'
                            ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                        {u.role === 'ADMIN' ? 'CONFIDENTIAL (3)' : u.role === 'STUDENT' ? 'INTERNAL (1)' : 'RESTRICTED (2)'}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-300">
                        {u.dataset_count}
                      </td>
                      <td className="py-3 px-3">
                        {u.is_quarantined ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            QUARANTINED ({u.quarantine_risk})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ✓ ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <select
                          disabled={actionLoading}
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-violet-500 cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN (Full 10 Perms)</option>
                          <option value="FACULTY">FACULTY</option>
                          <option value="RESEARCHER">RESEARCHER</option>
                          <option value="STUDENT">STUDENT</option>
                          <option value="GUEST">GUEST (Public Read-Only)</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
