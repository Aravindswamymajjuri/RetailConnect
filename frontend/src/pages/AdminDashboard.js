import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { adminServices, complaintServices } from '../services/api';
import { formatCurrency } from '../utils/helpers';

export const AdminDashboard = () => {
  const { user, token, socket, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('analytics');
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'complaints') {
      fetchComplaints();
    }
  }, [activeTab]);

  // Real-time Socket.io listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('newComplaint', (data) => {
      console.log('New complaint received:', data);
      fetchComplaints();
    });

    return () => {
      socket.off('newComplaint');
    };
  }, [socket]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminServices.getPlatformAnalytics(token);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminServices.getAllUsers(token);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await complaintServices.getAllComplaints(token);
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await adminServices.approveUser(token, userId);
      fetchUsers();
      alert('User approved successfully');
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    }
  };

  const handleSuspendUser = async (userId) => {
    try {
      await adminServices.suspendUser(token, userId);
      fetchUsers();
      alert('User suspended successfully');
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    }
  };

  const handleUpdateComplaint = async (complaintId, status) => {
    try {
      await complaintServices.updateComplaintStatus(token, complaintId, status, 'Resolved by admin');
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      alert('Failed to update complaint');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-red-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">RetailConnect - Admin Dashboard</h1>
          <div>
            <span className="mr-4">{user?.name}</span>
            <button onClick={logout} className="bg-red-900 px-4 py-2 rounded hover:bg-red-800">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Platform Analytics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === 'complaints'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Complaints ({complaints.filter(c => c.status !== 'Closed').length})
          </button>
        </div>

        {activeTab === 'analytics' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">Total Users</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{analytics.totalUsers || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">Retail Owners</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{analytics.retailUsers || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">Wholesale Owners</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{analytics.wholesaleUsers || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{analytics.totalOrders || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">Completed Orders</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{analytics.completedOrders || 0}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-semibold">Complaints</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{analytics.totalComplaints || 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Platform Overview</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold">
                    {analytics.totalUsers > 0 
                      ? ((analytics.completedOrders / analytics.totalOrders * 100) || 0).toFixed(1) 
                      : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Order Value</p>
                  <p className="text-2xl font-bold">₹0</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-3 text-left">Name</th>
                    <th className="border p-3 text-left">Email</th>
                    <th className="border p-3 text-left">Role</th>
                    <th className="border p-3 text-left">Shop</th>
                    <th className="border p-3 text-left">Approved</th>
                    <th className="border p-3 text-left">Suspended</th>
                    <th className="border p-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} className="border-b hover:bg-gray-50">
                      <td className="border p-3">{user.name}</td>
                      <td className="border p-3">{user.email}</td>
                      <td className="border p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'wholesale' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="border p-3">{user.shopId?.name || 'N/A'}</td>
                      <td className="border p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.isApproved ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="border p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.isSuspended ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.isSuspended ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="border p-3">
                        <div className="flex gap-2">
                          {!user.isApproved && (
                            <button
                              onClick={() => handleApproveUser(user._id)}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                            >
                              Approve
                            </button>
                          )}
                          {!user.isSuspended && user.role !== 'admin' && (
                            <button
                              onClick={() => handleSuspendUser(user._id)}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'complaints' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Complaint Management</h2>
            <div className="space-y-4">
              {complaints.map(complaint => (
                <div key={complaint._id} className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{complaint.subject}</h3>
                      <p className="text-sm text-gray-600">From: {complaint.complainant?.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        complaint.priority === 'High' ? 'bg-red-100 text-red-800' :
                        complaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {complaint.priority}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        complaint.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                        complaint.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {complaint.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{complaint.description}</p>

                  {complaint.adminNotes && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                      <p className="text-sm font-semibold text-blue-900">Admin Notes:</p>
                      <p className="text-sm text-blue-800">{complaint.adminNotes}</p>
                    </div>
                  )}

                  {complaint.status !== 'Closed' && (
                    <div className="flex gap-2">
                      <select
                        value={complaint.status}
                        onChange={(e) => handleUpdateComplaint(complaint._id, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Add Note
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {complaints.length === 0 && (
                <p className="text-center py-8 text-gray-500">No complaints</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
