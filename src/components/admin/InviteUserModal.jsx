import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, UserPlus, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = ['user', 'admin', 'sales_agent', 'sales_manager', 'listing_admin', 'compliance_officer'];

export default function InviteUserModal({ onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [projects, setProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.functions.invoke('getProjectList', {})
      .then(res => setProjects(res.data?.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  async function handleInvite() {
    if (!email.trim()) { setError('Email is required.'); return; }
    if (selectedProjects.length === 0) { setError('Please assign at least one project or zone.'); return; }
    setError('');
    setLoading(true);
    try {
      await base44.users.inviteUser(email.trim(), role === 'admin' ? 'admin' : 'user');
      // If projects selected, record via backend
      if (selectedProjects.length > 0) {
        await base44.functions.invoke('assignUserWorkspace', {
          user_email: email.trim(),
          projects: selectedProjects,
        }).catch(() => {}); // non-blocking
      }
      setDone(true);
      onInvited?.();
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err?.message || 'Invite failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function toggleProject(key) {
    setSelectedProjects(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-hairline bg-card">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-evergreen" />
            <span className="text-sm font-semibold text-foreground">Invite New User</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-surface flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="w-10 h-10 text-evergreen" />
              <div className="text-sm font-semibold text-foreground">Invitation sent!</div>
              <div className="text-xs text-muted-foreground">{email}</div>
            </div>
          ) : (
            <>
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="agent@realco.ai"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen transition-colors"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Role</label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-hairline bg-card focus:outline-none focus:border-evergreen appearance-none pr-8"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Projects / Zones */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Assign to Projects / Zones
                  <span className="text-terracotta ml-1">*</span>
                </label>
                {loadingProjects ? (
                  <div className="h-8 bg-surface rounded-lg animate-pulse" />
                ) : projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No projects found in raco_project_intelligence.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {projects.map((p, i) => {
                      const key = p.master_project_name;
                      const selected = selectedProjects.includes(key);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleProject(key)}
                          className={cn(
                            'text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors',
                            selected
                              ? 'border-evergreen bg-evergreen text-white'
                              : 'border-hairline bg-card text-muted-foreground hover:border-evergreen hover:text-evergreen'
                          )}
                        >
                          {key}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-terracotta">{error}</p>}

              <button
                onClick={handleInvite}
                disabled={loading || !email.trim() || selectedProjects.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-evergreen text-white text-sm font-medium hover:bg-evergreen-mid transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Sending…' : 'Send Invitation'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}