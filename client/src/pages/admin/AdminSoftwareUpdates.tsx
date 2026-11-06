import React, { useState, useEffect } from 'react';
import { Layers, Plus, CheckCircle, Tag, Calendar, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

export const AdminSoftwareUpdates: React.FC = () => {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    version_tag: '',
    release_name: '',
    release_notes: '',
    is_critical: false,
    min_compatible_version: 'v1.0.0'
  });

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/software-versions');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setVersions(data);
      }
    } catch (err) {
      console.error('Failed to load versions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/admin/software-versions', {
        ...form,
        is_critical: form.is_critical ? 1 : 0
      });

      if (res.data?.success || res.success) {
        setStatusMsg(`Release ${form.version_tag} published successfully.`);
        setShowModal(false);
        setForm({ version_tag: '', release_name: '', release_notes: '', is_critical: false, min_compatible_version: 'v1.0.0' });
        fetchVersions();
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish release.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Software Versions & Release Changelog
          </h1>
          <p className="text-xs text-slate-500">
            Publish version updates, notify POS clients of mandatory upgrades, and maintain platform release logs
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Release</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Releases List */}
      <div className="space-y-4">
        {versions.length > 0 ? (
          versions.map((ver) => (
            <div
              key={ver.id}
              className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-black text-xs rounded-lg">
                    {ver.version_tag}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {ver.release_name}
                  </h3>
                  {ver.is_critical === 1 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md">
                      <AlertTriangle className="w-3 h-3" />
                      Mandatory Update
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{ver.release_date || new Date(ver.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {ver.release_notes}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-2xl border text-slate-400 text-xs">
            {loading ? 'Loading releases...' : 'No software versions recorded yet.'}
          </div>
        )}
      </div>

      {/* Release Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                Publish Software Release
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Version Tag</label>
                  <input
                    type="text"
                    required
                    value={form.version_tag}
                    onChange={(e) => setForm({ ...form, version_tag: e.target.value })}
                    placeholder="v1.1.0"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Release Name</label>
                  <input
                    type="text"
                    required
                    value={form.release_name}
                    onChange={(e) => setForm({ ...form, release_name: e.target.value })}
                    placeholder="Spring POS Speedup"
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Release Notes / Changelog</label>
                <textarea
                  rows={4}
                  required
                  value={form.release_notes}
                  onChange={(e) => setForm({ ...form, release_notes: e.target.value })}
                  placeholder="- Added variant selector in POS&#10;- Fixed inventory transfer conflict"
                  className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="critical"
                  checked={form.is_critical}
                  onChange={(e) => setForm({ ...form, is_critical: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="critical" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mark as mandatory critical update
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Publish Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
