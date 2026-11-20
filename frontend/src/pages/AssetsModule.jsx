import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Tag,
  DollarSign
} from 'lucide-react';

export const AssetsModule = () => {
  const { role, isAdmin } = useAuth();
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Add Asset Form
  const [newAsset, setNewAsset] = useState({
    asset_tag: 'AST-LAB-005',
    item_name: 'Digital Analytical Balance Scale',
    category: 'Lab Gear',
    location: 'Chemistry Lab 2',
    quantity: 4,
    condition: 'good',
    custodian: 'Dr. Williams',
    estimated_value: 800
  });

  const [editingAsset, setEditingAsset] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    loadAssets();
  }, [selectedCategory, search]);

  const loadAssets = async () => {
    try {
      const res = await apiClient.get('/assets', {
        category: selectedCategory || undefined,
        search: search || undefined
      });
      setAssets(res.data || []);
    } catch (e) {
      console.warn('Assets load error:', e);
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setStatusMsg('');
    try {
      const res = await apiClient.post('/assets', newAsset, { module: 'assets' });
      setStatusMsg(res.data.message || 'Asset registered successfully.');
      loadAssets();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset || !isAdmin) return;
    try {
      await apiClient.put(`/assets/${editingAsset.id}`, editingAsset);
      setEditingAsset(null);
      setStatusMsg('Asset updated by administrator.');
      loadAssets();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      alert(`Update Error: ${err.message}`);
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!isAdmin) return;
    if (!confirm('Delete this asset record?')) return;
    try {
      await apiClient.delete(`/assets/${id}`);
      loadAssets();
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Module 9: Asset & Inventory Tracking</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track lab gear, classroom furniture, computers, projectors, sports equipment & maintenance status.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Search by tag, name or custodian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg p-2 text-xs w-48 bg-slate-50"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-semibold"
          >
            <option value="">All Categories</option>
            <option value="Lab Gear">Lab Gear</option>
            <option value="Furniture">Furniture</option>
            <option value="IT Equipment">IT Equipment</option>
            <option value="Sports">Sports</option>
          </select>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded-lg text-xs font-semibold ${
          statusMsg.includes('Error') ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {statusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Register Asset Form (Staff & Admin) */}
        {!role.includes('parent') && (
          <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-brand-600" />
              <span>Register New School Asset</span>
            </h3>

            <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Asset Tag / Barcode</label>
                <input
                  type="text"
                  value={newAsset.asset_tag}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_tag: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 font-mono font-bold text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  value={newAsset.item_name}
                  onChange={(e) => setNewAsset({ ...newAsset, item_name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Category</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  >
                    <option value="Lab Gear">Lab Gear</option>
                    <option value="Furniture">Furniture</option>
                    <option value="IT Equipment">IT Equipment</option>
                    <option value="Sports">Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={newAsset.quantity}
                    onChange={(e) => setNewAsset({ ...newAsset, quantity: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Condition</label>
                  <select
                    value={newAsset.condition}
                    onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs font-medium"
                  >
                    <option value="good">Good Condition</option>
                    <option value="fair">Fair</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="damaged">Damaged / Write Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Location / Room</label>
                  <input
                    type="text"
                    value={newAsset.location}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Assigned Custodian</label>
                <input
                  type="text"
                  value={newAsset.custodian}
                  onChange={(e) => setNewAsset({ ...newAsset, custodian: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-colors"
              >
                Save Asset Record
              </button>
            </form>
          </div>
        )}

        {/* Asset Inventory Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Assets & Gear Catalog</span>
              <span className="text-slate-500">{assets.length} items logged</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-700 text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Asset Tag</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-2 text-center">Qty</th>
                    <th className="py-2.5 px-2 text-center">Condition</th>
                    {isAdmin && <th className="py-2.5 px-3 text-center">Admin</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assets.map((a, idx) => (
                    <tr key={a.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="py-2.5 px-3 font-mono font-bold text-brand-700">{a.asset_tag}</td>
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-900 block font-semibold">{a.item_name}</strong>
                        <span className="text-[10px] text-slate-400">Custodian: {a.custodian || 'Unassigned'}</span>
                      </td>
                      <td className="py-2.5 px-3">{a.category}</td>
                      <td className="py-2.5 px-3 text-slate-600">{a.location}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800">{a.quantity}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.condition === 'good' ? 'bg-emerald-100 text-emerald-800' :
                          a.condition === 'fair' ? 'bg-blue-100 text-blue-800' :
                          a.condition === 'needs_repair' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {a.condition.replace('_', ' ')}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingAsset(a)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Admin: Edit asset"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(a.id)}
                              className="p-1 text-slate-400 hover:text-rose-500"
                              title="Admin: Delete asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Edit Asset Modal */}
      {editingAsset && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4 border border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Admin Edit Asset Details</h3>
            <p className="text-xs text-slate-500">Asset Tag: <strong>{editingAsset.asset_tag}</strong></p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Item Name</label>
                <input
                  type="text"
                  value={editingAsset.item_name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, item_name: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={editingAsset.location}
                  onChange={(e) => setEditingAsset({ ...editingAsset, location: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Condition</label>
                <select
                  value={editingAsset.condition}
                  onChange={(e) => setEditingAsset({ ...editingAsset, condition: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs_repair">Needs Repair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Quantity</label>
                <input
                  type="number"
                  value={editingAsset.quantity}
                  onChange={(e) => setEditingAsset({ ...editingAsset, quantity: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingAsset(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAsset}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
