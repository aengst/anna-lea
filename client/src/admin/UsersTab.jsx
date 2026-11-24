import { useEffect, useState } from 'react';
import { ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { apiDelete, apiGet, apiPost } from '../lib/api.js';

export default function UsersTab({ currentUser, onStatsChange }) {
  const [users, setUsers] = useState([]);
  const [initialAdminEmail, setInitialAdminEmail] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet('/api/admin/users');
      setUsers(data.users || []);
      setInitialAdminEmail(data.initialAdminEmail || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      const res = await apiPost('/api/admin/users', { email, name });
      setUsers((prev) => {
        const exists = prev.some((u) => u.id === res.user.id);
        return exists ? prev.map((u) => (u.id === res.user.id ? res.user : u)) : [...prev, res.user];
      });
      setEmail('');
      setName('');
      onStatsChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Ta bort administratörsbehörighet för ${user.email}?`)) return;
    setError('');
    try {
      await apiDelete(`/api/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      onStatsChange?.();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl uppercase tracking-[0.16em]">Administratörer</h2>
        <p className="text-xs text-stone-500 mt-1">
          Endast Google-konton i denna lista kan logga in på /admin. Lägg enkelt till t.ex. Anna-Leas Gmail-adress nedan.
        </p>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}

      <form onSubmit={handleAdd} className="bg-white border border-stone-200 p-5 sm:p-6 space-y-4">
        <h3 className="text-xs uppercase tracking-[0.18em] text-stone-700">
          Lägg till ny administratör
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="namn@gmail.com"
            className="border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Namn (valfritt)"
            className="border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 text-white text-xs uppercase tracking-[0.16em] hover:bg-stone-800 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{adding ? 'Lägger till...' : 'Lägg till'}</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-stone-200 divide-y divide-stone-200">
        {loading ? (
          <p className="p-5 text-sm text-stone-500">Laddar administratörer...</p>
        ) : (
          users.map((u) => {
            const isSelf = u.email.toLowerCase() === currentUser?.email?.toLowerCase();
            const isProtected = u.email.toLowerCase() === initialAdminEmail.toLowerCase();
            return (
              <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-stone-900 flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="truncate">{u.email}</span>
                    {isSelf && (
                      <span className="text-[10px] uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5">
                        Du
                      </span>
                    )}
                    {isProtected && (
                      <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5">
                        Grund-admin
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {u.name || 'Namn fylls i vid inloggning'} · Tillagd av {u.added_by}
                  </p>
                </div>

                {!isSelf && !isProtected && (
                  <button
                    type="button"
                    onClick={() => handleDelete(u)}
                    className="p-2 text-red-700 hover:bg-red-50"
                    title="Ta bort administratör"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
