// Khata (Credit) Record Component
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const KhataTracker = ({ wholesalerId, retailerId, token }) => {
  const [khataRecords, setKhataRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRecord, setNewRecord] = useState({
    amount: '',
    type: 'credit', // credit or payment
    description: ''
  });

  const fetchKhataRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/khata/records?wholesalerId=${wholesalerId}&retailerId=${retailerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setKhataRecords(response.data);
    } catch (error) {
      console.error('Error fetching khata records:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return khataRecords.reduce((total, record) => {
      return record.type === 'credit' ? total + record.amount : total - record.amount;
    }, 0);
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/khata/record`,
        {
          ...newRecord,
          wholesalerId,
          retailerId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewRecord({ amount: '', type: 'credit', description: '' });
      fetchKhataRecords();
      alert('Record added successfully');
    } catch (error) {
      console.error('Error adding record:', error);
      alert('Failed to add record');
    }
  };

  useEffect(() => {
    fetchKhataRecords();
  }, [wholesalerId, retailerId, token]);

  const totalCredit = calculateTotal();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">📖 Khata (Credit) Record</h3>
      
      {/* Balance Summary */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-l-4 border-blue-500">
        <p className="text-gray-700 mb-1">Current Balance</p>
        <p className={`text-2xl font-bold ${totalCredit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ₹{totalCredit}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {totalCredit >= 0 ? 'Wholesaler is owed this amount' : 'Retailer is owed this amount'}
        </p>
      </div>

      {/* Add New Record */}
      <form onSubmit={handleAddRecord} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-bold mb-3">Add New Record</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Amount"
            value={newRecord.amount}
            onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
            required
            className="border border-gray-300 rounded px-3 py-2"
          />
          <select
            value={newRecord.type}
            onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="credit">Credit (+)</option>
            <option value="payment">Payment (-)</option>
          </select>
          <input
            type="text"
            placeholder="Description"
            value={newRecord.description}
            onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-bold transition"
          >
            Add Record
          </button>
        </div>
      </form>

      {/* Records History */}
      <div>
        <h4 className="font-bold mb-3">Transaction History</h4>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : khataRecords.length === 0 ? (
          <p className="text-gray-500">No records yet</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {khataRecords.map((record) => (
              <div
                key={record._id}
                className={`p-3 rounded border-l-4 ${
                  record.type === 'credit'
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{record.description}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className={`font-bold ${
                    record.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.type === 'credit' ? '+' : '-'}₹{record.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KhataTracker;
