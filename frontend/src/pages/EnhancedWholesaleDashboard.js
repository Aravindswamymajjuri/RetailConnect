import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { QueueTracker } from '../components/QueueTracker';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

export const EnhancedWholesaleDashboard = () => {
  const navigate = useNavigate();
  const { user, token, socket, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [products, setProducts] = useState([]);
  const [shopOpen, setShopOpen] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'sugar',
    price: '',
    stockAvailable: '',
    unit: 'kg'
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Real-time stock alerts
  const [realtimeStockAlerts, setRealtimeStockAlerts] = useState([]);

  // Messaging state
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');

  // Reviews state
  const [reviews, setReviews] = useState([]);

  // Fetch order queue
  const fetchQueue = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/wholesale/order-queue`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQueue(response.data);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  // Fetch shop products
  const fetchProducts = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/products/shop/${user.shopId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/wholesale/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Messaging functions
  const fetchConversations = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/messages/conversations/list`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/messages/${contactId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !messageText.trim()) {
      alert('Please select a contact and enter a message');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/messages`,
        {
          recipient: selectedContact._id,
          text: messageText
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessageText('');
      fetchMessages(selectedContact._id);
    } catch (error) {
      alert('Failed to send message: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/wholesale/reviews`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };
    }
  };

  // Toggle shop status
  const toggleShopStatus = async () => {
    try {
      setLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/wholesale/shop-status`,
        { isOpen: !shopOpen },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShopOpen(!shopOpen);
      alert(shopOpen ? 'Shop closed' : 'Shop opened');
    } catch (error) {
      console.error('Error updating shop status:', error);
      alert('Failed to update shop status');
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/wholesale/order-queue/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQueue();
      alert('Order status updated');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/products`,
        newProduct,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewProduct({
        name: '',
        category: 'sugar',
        price: '',
        stockAvailable: '',
        unit: 'kg'
      });
      setShowForm(false);
      fetchProducts();
      // Emit socket event for real-time update to all retailers
      socket?.emit('productAdded', { shopId: user.shopId });
      alert('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  // Edit product - start editing
  const startEditProduct = (product) => {
    setEditingProduct(product._id);
    setEditFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      stockAvailable: product.stockAvailable,
      unit: product.unit
    });
  };

  // Cancel edit
  const cancelEditProduct = () => {
    setEditingProduct(null);
    setEditFormData({});
  };

  // Update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/products/${editingProduct}`,
        editFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingProduct(null);
      setEditFormData({});
      fetchProducts();
      // Emit socket event for real-time update to all retailers
      socket?.emit('productUpdated', { shopId: user.shopId, productId: editingProduct });
      alert('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  // Update stock
  const handleUpdateStock = async (productId, newStock) => {
    try {
      setLoading(true);
      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/products/${productId}`,
        { stockAvailable: newStock },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProducts();
      // Emit socket event for real-time update to all retailers
      socket?.emit('stockUpdated', { shopId: user.shopId, productId, newStock });
      alert('Stock updated successfully');
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      setLoading(true);
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/products/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchProducts();
      // Emit socket event for real-time update to all retailers
      socket?.emit('productDeleted', { shopId: user.shopId, productId });
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  // Real-time socket listeners
  useEffect(() => {
    fetchQueue();
    fetchProducts();
    fetchAnalytics();

    if (socket) {
      socket.on('orderQueueUpdated', fetchQueue);
      socket.on('newOrder', fetchQueue);
      socket.on('stockAlert', (alertData) => {
        const alert = {
          id: Date.now(),
          type: alertData.status,
          productName: alertData.productName,
          message: alertData.status === 'OUT_OF_STOCK'
            ? `🚫 ${alertData.productName} is OUT OF STOCK!`
            : `⚠️ ${alertData.productName} is running LOW (${alertData.currentStock} units)`,
          timestamp: new Date(),
          severity: alertData.status === 'OUT_OF_STOCK' ? 'critical' : 'warning'
        };
        setRealtimeStockAlerts((prev) => [alert, ...prev].slice(0, 5));
        fetchProducts();
      });

      socket.on('analyticsUpdated', fetchAnalytics);

      // Real-time message updates
      socket.on('messageReceived', (message) => {
        if (selectedContact && message.sender === selectedContact._id) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
        fetchConversations();
      });

      return () => {
        socket.off('orderQueueUpdated');
        socket.off('newOrder');
        socket.off('stockAlert');
        socket.off('analyticsUpdated');
        socket.off('messageReceived');
      };
    }
  }, [socket, token, selectedContact]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">🏪 Wholesale Dashboard</h1>
              <p className="text-purple-100">Welcome, {user?.name}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleShopStatus}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  shopOpen
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {shopOpen ? '🟢 Shop Open' : '🔴 Shop Closed'}
              </button>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="bg-red-700 hover:bg-red-800 text-white px-6 py-3 rounded-lg font-bold transition shadow-md"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Stock Alerts Banner */}
      {realtimeStockAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-red-50 border-b-4 border-red-500 p-4 shadow-md mt-2">
          <div className="max-w-7xl mx-auto">
            <h3 className="font-bold text-red-800 mb-3">📢 Stock Alerts</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {realtimeStockAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded flex items-start gap-3 ${
                  alert.severity === 'critical' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
                }`}>
                  <span className="text-xl">{alert.severity === 'critical' ? '🚫' : '⚠️'}</span>
                  <div className="flex-1">
                    <p className={`font-semibold ${alert.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'}`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{alert.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="max-w-7xl mx-auto mt-6 px-4">
        <div className="flex gap-4 mb-6 overflow-x-auto pb-4">
          {[
            { id: 'queue', label: '📦 Order Queue', icon: 'queue' },
            { id: 'inventory', label: '📊 Inventory', icon: 'inventory' },
            { id: 'analytics', label: '📈 Analytics', icon: 'analytics' },
            { id: 'messages', label: '💬 Messages', icon: 'messages' },
            { id: 'reviews', label: '⭐ Reviews', icon: 'reviews' },
            { id: 'khata', label: '📖 Khata', icon: 'khata' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'messages') {
                  fetchConversations();
                }
                if (tab.id === 'reviews') {
                  fetchReviews();
                }
              }}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12 space-y-6">
        {/* QUEUE TAB */}
        {activeTab === 'queue' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📦 Order Queue</h2>
                <p className="text-gray-600">{queue.length} order(s) in queue</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Updated</p>
                <p className="text-lg font-bold text-purple-600">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-2xl mb-2">🎉</p>
                <p className="text-lg text-gray-600">No orders in queue</p>
                <p className="text-sm text-gray-500 mt-2">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {queue.map((order, index) => (
                  <div
                    key={order._id}
                    className="border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{order.retailerShop?.name}</p>
                          <p className="text-sm text-gray-600">Order ID: {order._id?.substring(0, 8)}</p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full font-bold ${
                        order.status === 'Waiting'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'Preparing'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'Ready for Pickup'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-600">Amount</p>
                        <p className="font-bold text-blue-600">₹{order.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Items</p>
                        <p className="font-bold">{order.items?.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Payment</p>
                        <p className={`font-bold ${
                          order.paymentStatus === 'Completed'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}>
                          {order.paymentStatus}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Time</p>
                        <p className="font-bold">{new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>

                    {/* Status Update Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {['Preparing', 'Ready for Pickup', 'Completed'].map((status) => (
                        <button
                          key={status}
                          onClick={() => updateOrderStatus(order._id, status)}
                          disabled={order.status === 'Completed'}
                          className={`px-4 py-2 rounded font-semibold transition text-sm ${
                            order.status === status
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {status === 'Preparing' ? '👨‍🍳' : status === 'Ready for Pickup' ? '📦' : '✅'} {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📊 Inventory Management</h2>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition"
              >
                {showForm ? '❌ Cancel' : '➕ Add Product'}
              </button>
            </div>

            {/* Add Product Form */}
            {showForm && (
              <form onSubmit={handleAddProduct} className="mb-8 p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="sugar">Sugar</option>
                    <option value="oil">Oil</option>
                    <option value="rice">Rice</option>
                    <option value="dal">Dal</option>
                    <option value="soap">Soap</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <input
                    type="number"
                    placeholder="Stock Available"
                    value={newProduct.stockAvailable}
                    onChange={(e) => setNewProduct({ ...newProduct, stockAvailable: e.target.value })}
                    required
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className="border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="kg">KG</option>
                    <option value="liters">Liters</option>
                    <option value="units">Units</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition"
                >
                  {loading ? 'Adding...' : '➕ Add Product'}
                </button>
              </form>
            )}

            {/* Products Grid */}
            {products.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No products added yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className={`rounded-lg shadow-md p-6 transition ${
                      product.stockAvailable === 0
                        ? 'bg-red-50 border-2 border-red-300'
                        : product.stockAvailable <= 10
                        ? 'bg-yellow-50 border-2 border-yellow-300'
                        : 'bg-green-50 border-2 border-green-300'
                    }`}
                  >
                    {/* Edit Mode */}
                    {editingProduct === product._id ? (
                      <form onSubmit={handleUpdateProduct} className="space-y-3">
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Product Name"
                        />
                        <input
                          type="number"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Price"
                        />
                        <input
                          type="number"
                          value={editFormData.stockAvailable}
                          onChange={(e) => setEditFormData({ ...editFormData, stockAvailable: e.target.value })}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Stock"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-bold"
                          >
                            ✅ Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditProduct}
                            className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm font-bold"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {/* Display Mode */}
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{product.name}</h3>
                        <p className="text-purple-600 font-bold text-xl mb-3">₹{product.price}</p>
                        <div className="space-y-2 text-sm mb-4">
                          <p className="text-gray-700">📦 Stock: <span className="font-bold">{product.stockAvailable}</span></p>
                          <p className="text-gray-600">{product.category} • {product.unit}</p>
                        </div>
                        <div className="w-full bg-gray-300 rounded h-2 mb-4">
                          <div
                            className={`h-2 rounded transition ${
                              product.stockAvailable === 0
                                ? 'bg-red-500'
                                : product.stockAvailable <= 10
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min((product.stockAvailable / 20) * 100, 100)}%`
                            }}
                          />
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditProduct(product)}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              disabled={loading}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-bold"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                          
                          {/* Quick Stock Update */}
                          <div className="flex gap-1 text-xs">
                            <button
                              onClick={() => handleUpdateStock(product._id, Math.max(0, product.stockAvailable - 10))}
                              disabled={loading}
                              className="flex-1 bg-orange-400 hover:bg-orange-500 text-white px-2 py-1 rounded"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleUpdateStock(product._id, Math.max(0, product.stockAvailable - 1))}
                              disabled={loading}
                              className="flex-1 bg-orange-400 hover:bg-orange-500 text-white px-2 py-1 rounded"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleUpdateStock(product._id, product.stockAvailable + 1)}
                              disabled={loading}
                              className="flex-1 bg-green-400 hover:bg-green-500 text-white px-2 py-1 rounded"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleUpdateStock(product._id, product.stockAvailable + 10)}
                              disabled={loading}
                              className="flex-1 bg-green-400 hover:bg-green-500 text-white px-2 py-1 rounded"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">₹{analytics?.revenue?.totalRevenue || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-green-600">{analytics?.revenue?.totalOrders || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
                <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
                <p className="text-3xl font-bold text-purple-600">
                  ₹{analytics?.revenue?.totalOrders ? Math.round(analytics.revenue.totalRevenue / analytics.revenue.totalOrders) : 0}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-pink-500">
                <p className="text-sm text-gray-600 mb-1">Products</p>
                <p className="text-3xl font-bold text-pink-600">{products.length}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-4">📈 Order Status Distribution</h3>
                {analytics?.orders && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.orders}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#8b5cf6" />
                        <Cell fill="#ec4899" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Popular Products */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-4">🏆 Top Selling Products</h3>
                <div className="space-y-3">
                  {analytics?.popularProducts?.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-700">#{index + 1}</span>
                      <div className="w-32 h-2 bg-gray-300 rounded">
                        <div
                          className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded"
                          style={{
                            width: `${(product.totalQuantity / (analytics.popularProducts[0]?.totalQuantity || 1)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{product.totalQuantity} units</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💬 Messages with Retailers</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Conversations List */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Conversations</h3>
                {conversations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv._id}
                        onClick={() => {
                          setSelectedContact({ _id: conv._id, name: 'Retailer' });
                          fetchMessages(conv._id);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition ${
                          selectedContact?._id === conv._id
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <p className="font-semibold text-sm truncate">Retailer {conv._id.substring(0, 8)}</p>
                        <p className="text-xs truncate">{conv.lastMessage}</p>
                        <p className="text-xs mt-1 opacity-75">{new Date(conv.lastMessageTime).toLocaleTimeString()}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chat Area */}
              <div className="md:col-span-2 bg-gray-50 rounded-lg p-4 border-2 border-gray-200 flex flex-col h-96">
                {selectedContact ? (
                  <>
                    <div className="mb-4 pb-4 border-b-2 border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900">Retailer {selectedContact._id.substring(0, 8)}</h3>
                      <p className="text-sm text-gray-600">Active conversation</p>
                    </div>

                    {/* Messages Display */}
                    <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                      {messages.length === 0 ? (
                        <p className="text-gray-500 text-center">No messages yet. Start the conversation!</p>
                      ) : (
                        messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.sender === user._id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs px-4 py-2 rounded-lg ${
                              msg.sender === user._id
                                ? 'bg-purple-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}>
                              <p className="text-sm">{msg.text}</p>
                              <p className="text-xs mt-1 opacity-75">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                      >
                        📤 Send
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a conversation to start messaging
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">⭐ Ratings & Reviews</h2>
            
            {reviews.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-lg text-gray-600">No reviews yet</p>
                <p className="text-sm text-gray-500 mt-2">Reviews from retail shop owners will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-lg text-gray-900">{review.retailer?.name || 'Anonymous'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-yellow-500 text-xl">⭐</span>
                          <span className="font-bold text-gray-900">{review.rating}/5</span>
                        </div>
                      </div>
                      <span className="text-gray-500 text-sm">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{review.review}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KHATA TAB */}
        {activeTab === 'khata' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📖 Khata Records</h2>
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-lg text-gray-600 mb-2">Coming Soon!</p>
              <p className="text-sm text-gray-500">Khata management system will be available soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedWholesaleDashboard;
