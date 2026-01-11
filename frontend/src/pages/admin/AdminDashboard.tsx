import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createElection, uploadCandidates, uploadMap } from '../../utils/api';
import api from '../../utils/api';

interface Election {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  totalConstituencies: number;
  totalCandidates: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedElection, setSelectedElection] = useState<string | null>(null);

  // Create election form
  const [newElection, setNewElection] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }
    loadElections();
  }, [navigate]);

  const loadElections = async () => {
    try {
      const response = await api.get('/elections');
      setElections(response.data.elections || []);
    } catch (error) {
      console.error('Failed to load elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createElection(newElection);
      toast.success('Election created successfully');
      setShowCreateForm(false);
      setNewElection({ name: '', description: '', startDate: '', endDate: '' });
      loadElections();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create election');
    }
  };

  const handleFileUpload = async (type: 'candidates' | 'map', file: File) => {
    if (!selectedElection) return;

    try {
      if (type === 'candidates') {
        const result = await uploadCandidates(selectedElection, file);
        toast.success(`Uploaded: ${result.summary.candidatesCreated} candidates`);
      } else {
        const result = await uploadMap(selectedElection, file);
        toast.success(`Uploaded: ${result.summary.constituenciesMatched} constituencies matched`);
      }
      loadElections();
    } catch (error: any) {
      toast.error(error.response?.data?.errors?.[0]?.message || 'Upload failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-sm text-slate-400">Manage elections and candidates</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-slate-600 hover:border-red-500 text-slate-300 hover:text-red-400 text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold">Elections</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
          >
            + Create Election
          </button>
        </div>

        {/* Create Election Form */}
        {showCreateForm && (
          <div className="glass rounded-2xl p-6 mb-8 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Create New Election</h3>
            <form onSubmit={handleCreateElection} className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newElection.name}
                  onChange={(e) => setNewElection({ ...newElection, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Description</label>
                <textarea
                  value={newElection.description}
                  onChange={(e) => setNewElection({ ...newElection, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-primary-500 focus:outline-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={newElection.startDate}
                  onChange={(e) => setNewElection({ ...newElection, startDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={newElection.endDate}
                  onChange={(e) => setNewElection({ ...newElection, endDate: e.target.value })}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-primary-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 rounded-lg border border-slate-600 hover:border-slate-500 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Elections List */}
        <div className="space-y-4">
          {elections.map((election) => (
            <div key={election.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{election.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      election.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      election.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {election.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {election.totalConstituencies} constituencies • {election.totalCandidates} candidates
                  </p>
                </div>
                <button
                  onClick={() => setSelectedElection(selectedElection === election.id ? null : election.id)}
                  className="px-3 py-1 rounded-lg border border-slate-600 hover:border-primary-500 text-sm transition-colors"
                >
                  {selectedElection === election.id ? 'Close' : 'Manage'}
                </button>
              </div>

              {selectedElection === election.id && (
                <div className="pt-4 border-t border-slate-700 animate-fade-in">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Upload Candidates JSON</label>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('candidates', e.target.files[0])}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Upload Map GeoJSON</label>
                      <input
                        type="file"
                        accept=".json,.geojson"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload('map', e.target.files[0])}
                        className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-600 file:text-white hover:file:bg-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {elections.length === 0 && (
            <div className="text-center py-16 glass rounded-xl">
              <p className="text-slate-500">No elections yet. Create your first election to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
