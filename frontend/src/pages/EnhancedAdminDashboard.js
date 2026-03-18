import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

export const EnhancedAdminDashboard = () => {
  const navigate = useNavigate();
  const { token, socket, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('users');
  const [retailers, setRetailers] = useState([]);
  const [wholesalers, setWholesalers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch all retailers
  const fetchRetailers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/retailers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRetailers(response.data);
    } catch (error) {
      console.error('Error fetching retailers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all wholesalers
  const fetchWholesalers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/wholesalers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWholesalers(response.data);
    } catch (error) {
      console.error('Error fetching wholesalers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/reviews`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/complaints`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  // Fetch platform stats
  const fetchPlatformStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlatformStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Approve shop
  const approveShop = async (userId) => {
    try {
      setLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/admin/users/${userId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Shop approved');
      if (activeTab === 'retailers') fetchRetailers();
      else if (activeTab === 'wholesalers') fetchWholesalers();
    } catch (error) {
      console.error('Error approving shop:', error);
      alert('Failed to approve shop');
    } finally {
      setLoading(false);
    }
  };

  // Suspend user
  const suspendUser = async (userId) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    try {
      setLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/admin/users/${userId}/suspend`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('User suspended');
      if (activeTab === 'retailers') fetchRetailers();
      else if (activeTab === 'wholesalers') fetchWholesalers();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      setLoading(true);
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('User deleted');
      if (activeTab === 'retailers') fetchRetailers();
      else if (activeTab === 'wholesalers') fetchWholesalers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Resolve complaint
  const resolveComplaint = async (complaintId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/admin/complaints/${complaintId}/resolve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Complaint resolved');
      fetchComplaints();
    } catch (error) {
      console.error('Error resolving complaint:', error);
      alert('Failed to resolve complaint');
    }
  };

  // Initial fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPlatformStats();
    fetchRetailers();
    fetchWholesalers();
    fetchReviews();
    fetchComplaints();

    if (socket) {
      socket.on('newComplaint', fetchComplaints);
      socket.on('newReview', fetchReviews);
      socket.on('analyticsUpdated', fetchPlatformStats);

      return () => {
        socket.off('newComplaint');
        socket.off('newReview');
        socket.off('analyticsUpdated');
      };
    }
  }, [socket, token]);

  // Filter and search
  const filtered = (activeTab === 'retailers' ? retailers : wholesalers)
    .filter((user) => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.shopName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' ||
                           (filterStatus === 'approved' && user.isApproved) ||
                           (filterStatus === 'pending' && !user.isApproved) ||
                           (filterStatus === 'suspended' && user.isSuspended);
      return matchesSearch && matchesStatus;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-purple-900 text-white p-6 shadow-2xl border-b-4 border-purple-500">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">🛡️ Admin Dashboard</h1>
            <p className="text-purple-200">Platform management and oversight</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition shadow-md"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6 border-l-4 border-blue-300">
            <p className="text-sm opacity-90 mb-1">Total Retailers</p>
            <p className="text-3xl font-bold">{platformStats?.totalRetailers || 0}</p>
            <p className="text-xs mt-2 opacity-75">Active: {platformStats?.activeRetailers || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6 border-l-4 border-green-300">
            <p className="text-sm opacity-90 mb-1">Total Wholesalers</p>
            <p className="text-3xl font-bold">{platformStats?.totalWholesalers || 0}</p>
            <p className="text-xs mt-2 opacity-75">Active: {platformStats?.activeWholesalers || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg p-6 border-l-4 border-purple-300">
            <p className="text-sm opacity-90 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">₹{platformStats?.totalRevenue || 0}</p>
            <p className="text-xs mt-2 opacity-75">All time</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6 border-l-4 border-orange-300">
            <p className="text-sm opacity-90 mb-1">Pending Issues</p>
            <p className="text-3xl font-bold">{complaints.filter(c => c.status !== 'Resolved').length}</p>
            <p className="text-xs mt-2 opacity-75">Need resolution</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-3">
          {[
            { id: 'users', label: '👥 User Management', icon: 'users' },
            { id: 'retailers', label: '🛍️ Retailers', icon: 'retailers' },
            { id: 'wholesalers', label: '🏭 Wholesalers', icon: 'wholesalers' },
            { id: 'reviews', label: '⭐ Reviews', icon: 'reviews' },
            { id: 'complaints', label: '⚠️ Complaints', icon: 'complaints' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-slate-700 text-gray-100 hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* RETAILERS TAB */}
        {activeTab === 'retailers' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">🛍️ Retailers</h2>
              <div className="w-full md:w-80 flex gap-2">
                <input
                  type="text"
                  placeholder="Search retailers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-gray-400 border border-slate-600"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No retailers found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700">
                    <tr className="border-b-2 border-slate-600">
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Shop Name</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Owner</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Email</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Status</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user._id} className="border-b border-slate-700 hover:bg-slate-700 transition">
                        <td className="px-6 py-4 text-white font-semibold">{user.shopName}</td>
                        <td className="px-6 py-4 text-gray-300">{user.name}</td>
                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {!user.isApproved && (
                              <span className="px-3 py-1 bg-yellow-900 text-yellow-200 rounded-full text-xs font-bold">
                                ⏳ Pending
                              </span>
                            )}
                            {user.isApproved && (
                              <span className="px-3 py-1 bg-green-900 text-green-200 rounded-full text-xs font-bold">
                                ✅ Approved
                              </span>
                            )}
                            {user.isSuspended && (
                              <span className="px-3 py-1 bg-red-900 text-red-200 rounded-full text-xs font-bold">
                                🛑 Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {!user.isApproved && (
                              <button
                                onClick={() => approveShop(user._id)}
                                disabled={loading}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition"
                              >
                                ✅ Approve
                              </button>
                            )}
                            {!user.isSuspended && (
                              <button
                                onClick={() => suspendUser(user._id)}
                                disabled={loading}
                                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold transition"
                              >
                                🛑 Suspend
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(user._id)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* WHOLESALERS TAB */}
        {activeTab === 'wholesalers' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white">🏭 Wholesalers</h2>
              <div className="w-full md:w-80 flex gap-2">
                <input
                  type="text"
                  placeholder="Search wholesalers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white placeholder-gray-400 border border-slate-600"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="text-gray-400">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No wholesalers found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700">
                    <tr className="border-b-2 border-slate-600">
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Shop Name</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Owner</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Email</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Status</th>
                      <th className="px-6 py-3 text-left text-purple-300 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((user) => (
                      <tr key={user._id} className="border-b border-slate-700 hover:bg-slate-700 transition">
                        <td className="px-6 py-4 text-white font-semibold">{user.shopName}</td>
                        <td className="px-6 py-4 text-gray-300">{user.name}</td>
                        <td className="px-6 py-4 text-gray-300">{user.email}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {!user.isApproved && (
                              <span className="px-3 py-1 bg-yellow-900 text-yellow-200 rounded-full text-xs font-bold">
                                ⏳ Pending
                              </span>
                            )}
                            {user.isApproved && (
                              <span className="px-3 py-1 bg-green-900 text-green-200 rounded-full text-xs font-bold">
                                ✅ Approved
                              </span>
                            )}
                            {user.isSuspended && (
                              <span className="px-3 py-1 bg-red-900 text-red-200 rounded-full text-xs font-bold">
                                🛑 Suspended
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {!user.isApproved && (
                              <button
                                onClick={() => approveShop(user._id)}
                                disabled={loading}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition"
                              >
                                ✅ Approve
                              </button>
                            )}
                            {!user.isSuspended && (
                              <button
                                onClick={() => suspendUser(user._id)}
                                disabled={loading}
                                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold transition"
                              >
                                🛑 Suspend
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(user._id)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">⭐ Reviews Monitoring</h2>
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No reviews yet</p>
              ) : (
                reviews.map((review) => (
                  <div key={review._id} className="bg-slate-700 rounded-lg p-6 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-white">{review.reviewerName}</p>
                        <p className="text-sm text-gray-400">about {review.shopName}</p>
                      </div>
                      <div className="text-yellow-400 text-lg">
                        {'⭐'.repeat(review.rating)}
                      </div>
                    </div>
                    <p className="text-gray-300 mb-2">{review.comment}</p>
                    <p className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* COMPLAINTS TAB */}
        {activeTab === 'complaints' && (
          <div className="bg-slate-800 rounded-xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">⚠️ Complaint Management</h2>
            <div className="space-y-4">
              {complaints.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No complaints</p>
              ) : (
                complaints.map((complaint) => (
                  <div
                    key={complaint._id}
                    className={`rounded-lg p-6 border-l-4 ${
                      complaint.status === 'Resolved'
                        ? 'bg-slate-700 border-green-500'
                        : 'bg-slate-700 border-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-white mb-1">{complaint.complainantName}</p>
                        <p className="text-sm text-gray-400">{complaint.title}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        complaint.status === 'Resolved'
                          ? 'bg-green-900 text-green-200'
                          : complaint.status === 'In Progress'
                          ? 'bg-yellow-900 text-yellow-200'
                          : 'bg-red-900 text-red-200'
                      }`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-3">{complaint.description}</p>
                    {complaint.status !== 'Resolved' && (
                      <button
                        onClick={() => resolveComplaint(complaint._id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold transition text-sm"
                      >
                        ✅ Mark as Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;
