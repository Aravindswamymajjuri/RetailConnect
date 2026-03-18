import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../services/api';
import axios from 'axios';

export const WholesaleDashboard = () => {
  const { user, token, socket, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('queue');
  
  // State for all features
  const [orderQueue, setOrderQueue] = useState([]);
  const [stockAlerts, setStockAlerts] = useState({ outOfStock: [], lowStock: [], fewItemsLeft: [] });
  const [products, setProducts] = useState([]);
  const [khataRecords, setKhataRecords] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [shopStatus, setShopStatus] = useState({ isOpen: true });
  const [loading, setLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Real-time stock alerts
  const [realtimeStockAlerts, setRealtimeStockAlerts] = useState([]);

  // Messaging state
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageText, setMessageText] = useState('');

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'sugar',
    price: '',
    stockAvailable: '',
    unit: 'kg'
  });

  // Fetch functions
  // Fetch products for inventory
  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/products/shop/${user.shopId}`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [token, user.shopId]);

  const fetchOrderQueue = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/wholesale/order-queue`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setOrderQueue(response.data);
    } catch (error) {
      console.error('Error fetching order queue:', error);
    }
  }, [token]);

  const fetchStockAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/wholesale/stock-alerts`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setStockAlerts(response.data);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
    }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/wholesale/analytics`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [token]);

  const fetchKhata = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/wholesale/khata`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setKhataRecords(response.data);
    } catch (error) {
      console.error('Error fetching khata records:', error);
    }
  }, [token]);

  const fetchReviews = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/wholesale/reviews`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  }, [token]);

  // Messaging functions
  const fetchConversations = useCallback(async () => {
    try {
      const response = await axios.get(`${ API_BASE_URL }/api/messages/conversations/list`, {
        headers: { Authorization: `Bearer ${ token }` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [token]);


  const fetchMessages = async (contactId) => {
    try {
      const response = await axios.get(
        `${ API_BASE_URL }/api/messages/${contactId}`,
        { headers: { Authorization: `Bearer ${ token }` } }
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
        `${ API_BASE_URL }/api/messages`,
        {
          recipient: selectedContact._id,
          text: messageText
        },
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      setMessageText('');
      fetchMessages(selectedContact._id);
    } catch (error) {
      alert('Failed to send message: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(
        `${ API_BASE_URL }/api/products`,
        newProduct,
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      setNewProduct({
        name: '',
        category: 'sugar',
        price: '',
        stockAvailable: '',
        unit: 'kg'
      });
      setShowProductForm(false);
      fetchProducts();
      socket?.emit('productAdded', { shopId: user.shopId });
      alert('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  // Edit product
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

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(
        `${ API_BASE_URL }/api/products/${editingProduct}`,
        editFormData,
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      setEditingProduct(null);
      setEditFormData({});
      fetchProducts();
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
        `${ API_BASE_URL }/api/products/${productId}`,
        { stockAvailable: newStock },
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      fetchProducts();
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
        `${ API_BASE_URL }/api/products/${productId}`,
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      fetchProducts();
      socket?.emit('productDeleted', { shopId: user.shopId, productId });
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'queue':
        fetchOrderQueue();
        break;
      case 'inventory':
        fetchProducts();
        break;
      case 'stockAlerts':
        fetchStockAlerts();
        break;
      case 'analytics':
        fetchAnalytics();
        break;
      case 'khata':
        fetchKhata();
        break;
      case 'reviews':
        fetchReviews();
        break;
      case 'messages':
        fetchConversations();
        break;
      default:
        break;
    }
  }, [activeTab, fetchOrderQueue, fetchProducts, fetchStockAlerts, fetchAnalytics, fetchKhata, fetchReviews, fetchConversations]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('newOrder', () => {
      fetchOrderQueue();
    });

    socket.on('orderQueueUpdated', () => {
      fetchOrderQueue();
    });

    socket.on('shopStatusChanged', () => {
      setShopStatus(prev => ({ ...prev }));
    });

    socket.on('reviewCreated', () => {
      if (activeTab === 'reviews') fetchReviews();
    });

    // Inventory updates - refetch products and stock alerts
    socket.on('inventoryUpdated', () => {
      fetchProducts();
      fetchStockAlerts();
    });

    socket.on('productDeleted', () => {
      fetchProducts();
      fetchStockAlerts();
    });

    socket.on('productUpdated', () => {
      fetchProducts();
      fetchStockAlerts();
    });

    socket.on('productAdded', () => {
      fetchProducts();
      fetchStockAlerts();
    });

    socket.on('stockUpdated', () => {
      fetchStockAlerts();
    });

    // Real-time stock alerts
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
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Stock Alert', {
          body: alert.message,
          icon: alertData.status === 'OUT_OF_STOCK' ? '🚫' : '⚠️'
        });
      }
      
      fetchStockAlerts();
    });

    // Real-time message updates
    socket.on('messageReceived', (message) => {
      if (selectedContact && message.sender === selectedContact._id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
      // Refresh conversations list to show latest message
      fetchConversations();
    });

    return () => {
      socket.off('newOrder');
      socket.off('orderQueueUpdated');
      socket.off('shopStatusChanged');
      socket.off('reviewCreated');
      socket.off('productDeleted');
      socket.off('productUpdated');
      socket.off('productAdded');
      socket.off('stockUpdated');
      socket.off('stockAlert');
      socket.off('messageReceived');
    };
  }, [socket, activeTab, selectedContact, fetchConversations, fetchOrderQueue, fetchProducts, fetchReviews, fetchStockAlerts]);

  // Handle order status update
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(
        `${ API_BASE_URL }/api/wholesale/order-queue/${ orderId }/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      fetchOrderQueue();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  // Handle shop status toggle
  const handleToggleShopStatus = async () => {
    try {
      await axios.put(
        `${ API_BASE_URL }/api/wholesale/shop-status`,
        { isOpen: !shopStatus.isOpen },
        { headers: { Authorization: `Bearer ${ token }` } }
      );
      setShopStatus({ isOpen: !shopStatus.isOpen });
    } catch (error) {
      console.error('Error updating shop status:', error);
      alert('Failed to update shop status');
    }
  };

  const totalAlerts = stockAlerts.outOfStock.length + stockAlerts.lowStock.length + stockAlerts.fewItemsLeft.length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Wholesale Dashboard</h1>
            <p className="text-purple-200 text-sm">{ user?.name }</p>
          </div>
          <div className="flex items-center gap-4">
            { totalAlerts > 0 && (
              <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold">
                Stock Alerts: { totalAlerts }
              </div>
            ) }
            <button
              onClick={ handleToggleShopStatus }
              className={ `px-6 py-2 rounded-lg font-semibold transition ${
                shopStatus.isOpen
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-red-500 hover:bg-red-600'
              }` }
            >
              { shopStatus.isOpen ? 'Shop Open' : 'Shop Closed' }
            </button>
            <button
              onClick={ logout }
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Real-Time Stock Alerts Banner */}
      {realtimeStockAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-red-50 border-b-4 border-red-500 p-4 shadow-md">
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

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 flex-wrap">
          <TabButton
            label="Order Queue"
            tab="queue"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            label="📊 Inventory"
            tab="inventory"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            label="Stock Alerts"
            tab="stockAlerts"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            badge={totalAlerts > 0 ? totalAlerts : null}
          />
          <TabButton
            label="Digital Khata"
            tab="khata"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            label="Sales Analytics"
            tab="analytics"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            label="Reviews"
            tab="reviews"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            label="Messages"
            tab="messages"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <TabButton
            label="Help Center"
            tab="help"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        { loading && (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) }

        {/* Order Queue Tab */}
        { activeTab === 'queue' && (
          <OrderQueueTab
            orderQueue={ orderQueue }
            onUpdateStatus={ handleUpdateOrderStatus }
          />
        ) }

        {/* Inventory Tab */}
        { activeTab === 'inventory' && (
          <InventoryTab 
            products={products}
            newProduct={newProduct}
            setNewProduct={setNewProduct}
            showProductForm={showProductForm}
            setShowProductForm={setShowProductForm}
            handleAddProduct={handleAddProduct}
            editingProduct={editingProduct}
            setEditingProduct={setEditingProduct}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            startEditProduct={startEditProduct}
            handleUpdateProduct={handleUpdateProduct}
            handleDeleteProduct={handleDeleteProduct}
            handleUpdateStock={handleUpdateStock}
            loading={loading}
          />
        ) }

        {/* Stock Alerts Tab */}
        { activeTab === 'stockAlerts' && (
          <StockAlertsTab alerts={ stockAlerts } />
        ) }

        {/* Digital Khata Tab */}
        { activeTab === 'khata' && (
          <KhataTab khataRecords={ khataRecords } />
        ) }

        {/* Sales Analytics Tab */}
        { activeTab === 'analytics' && (
          <AnalyticsTab analytics={ analytics } />
        ) }

        {/* Reviews Tab */}
        { activeTab === 'reviews' && (
          <ReviewsTab reviews={ reviews } />
        ) }

        {/* Messages Tab */}
        { activeTab === 'messages' && (
          <MessagesTab 
            token={ token } 
            conversations={ conversations }
            messages={ messages }
            selectedContact={ selectedContact }
            messageText={ messageText }
            setMessageText={ setMessageText }
            setSelectedContact={ setSelectedContact }
            sendMessage={ sendMessage }
            loading={ loading }
            fetchMessages={ fetchMessages }
            user={ user }
          />
        ) }

        {/* Help Center Tab */}
        { activeTab === 'help' && (
          <HelpCenterTab token={ token } />
        ) }
      </div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({ label, tab, activeTab, setActiveTab, badge }) => (
  <button
    onClick={ () => setActiveTab(tab) }
    className={ `px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap relative ${
      activeTab === tab
        ? 'bg-purple-600 text-white shadow-lg'
        : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-400'
    }` }
  >
    { label }
    { badge && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
        { badge }
      </span>
    ) }
  </button>
);

// Order Queue Tab
const OrderQueueTab = ({ orderQueue, onUpdateStatus }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-bold mb-6">Real-Time Order Queue</h2>
    
    { orderQueue.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No orders in queue</p>
        <p className="text-sm mt-2">Retailer orders will appear here</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="p-3 text-left">Queue #</th>
              <th className="p-3 text-left">Retailer</th>
              <th className="p-3 text-left">Shop</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            { orderQueue.map((order, index) => (
              <tr key={ order._id } className="border-b hover:bg-gray-50 transition">
                <td className="p-3 font-bold text-lg text-purple-600">
                  { order.isNext && 'NEXT ' }#{ index + 1 }
                </td>
                <td className="p-3">{ order.retailer?.name }</td>
                <td className="p-3 text-sm text-gray-600">{ order.retailerShop?.name }</td>
                <td className="p-3 text-right font-semibold">₹{ order.totalAmount.toFixed(2) }</td>
                <td className="p-3 text-center">{ order.items?.length || 0 }</td>
                <td className="p-3 text-center">
                  <select
                    value={ order.status }
                    onChange={ (e) => onUpdateStatus(order._id, e.target.value) }
                    className={ `px-3 py-1 rounded-full text-sm font-semibold border-0 cursor-pointer ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'Ready for Pickup' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Preparing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }` }
                  >
                    <option value="Waiting">Waiting</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready for Pickup">Ready for Pickup</option>
                    <option value="Completed">Completed</option>
                  </select>
                </td>
                <td className="p-3 text-center">
                  <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm">
                    Details
                  </button>
                </td>
              </tr>
            )) }
          </tbody>
        </table>
      </div>
    ) }
  </div>
);

// Inventory Tab
const InventoryTab = ({ 
  products, 
  newProduct, 
  setNewProduct, 
  showProductForm, 
  setShowProductForm, 
  handleAddProduct, 
  editingProduct, 
  setEditingProduct,
  editFormData, 
  setEditFormData, 
  startEditProduct, 
  handleUpdateProduct, 
  handleDeleteProduct, 
  handleUpdateStock, 
  loading 
}) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold text-gray-900">📊 Inventory Management</h2>
      <button
        onClick={() => setShowProductForm(!showProductForm)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition"
      >
        {showProductForm ? '❌ Cancel' : '➕ Add Product'}
      </button>
    </div>

    {/* Add Product Form */}
    {showProductForm && (
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
                    onClick={() => setEditingProduct(null)}
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
);

// Stock Alerts Tab
const StockAlertsTab = ({ alerts }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Out of Stock */}
      <div className="bg-white rounded-lg shadow p-6 border-t-4 border-red-500">
        <h3 className="text-xl font-bold text-red-600 mb-4">Out of Stock</h3>
        <div className="space-y-2">
          { alerts.outOfStock.length === 0 ? (
            <p className="text-gray-500">All products in stock</p>
          ) : (
            alerts.outOfStock.map(item => (
              <div key={ item.id } className="p-3 bg-red-50 rounded">
                <p className="font-semibold">{ item.name }</p>
                <p className="text-xs text-gray-600">{ item.category }</p>
              </div>
            ))
          ) }
        </div>
      </div>

      {/* Low Stock */}
      <div className="bg-white rounded-lg shadow p-6 border-t-4 border-orange-500">
        <h3 className="text-xl font-bold text-orange-600 mb-4">Low Stock</h3>
        <div className="space-y-2">
          { alerts.lowStock.length === 0 ? (
            <p className="text-gray-500">Stock levels normal</p>
          ) : (
            alerts.lowStock.map(item => (
              <div key={ item.id } className="p-3 bg-orange-50 rounded">
                <p className="font-semibold">{ item.name }</p>
                <p className="text-xs text-gray-600">{ item.current }/{ item.threshold } units</p>
              </div>
            ))
          ) }
        </div>
      </div>

      {/* Few Items Left */}
      <div className="bg-white rounded-lg shadow p-6 border-t-4 border-yellow-500">
        <h3 className="text-xl font-bold text-yellow-600 mb-4">Few Items Left</h3>
        <div className="space-y-2">
          { alerts.fewItemsLeft.length === 0 ? (
            <p className="text-gray-500">Good stock levels</p>
          ) : (
            alerts.fewItemsLeft.map(item => (
              <div key={ item.id } className="p-3 bg-yellow-50 rounded">
                <p className="font-semibold">{ item.name }</p>
                <p className="text-xs text-gray-600">{ item.current }/{ item.threshold } units</p>
              </div>
            ))
          ) }
        </div>
      </div>
    </div>
  </div>
);

// Digital Khata Tab
const KhataTab = ({ khataRecords }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-bold mb-6">Digital Khata - Credit Ledger</h2>

    { khataRecords.length === 0 ? (
      <div className="text-center py-8 text-gray-500">No khata records found</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-left">Retailer</th>
              <th className="border p-3 text-right">Total Amount</th>
              <th className="border p-3 text-right">Paid</th>
              <th className="border p-3 text-right">Remaining</th>
              <th className="border p-3 text-center">Due Date</th>
              <th className="border p-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            { khataRecords.map(record => (
              <tr key={ record._id } className="border-b hover:bg-gray-50">
                <td className="border p-3 font-semibold">{ record.retailer?.name }</td>
                <td className="border p-3 text-right">?{ record.totalAmount?.toFixed(2) || 0 }</td>
                <td className="border p-3 text-right text-green-600 font-semibold">
                  ?{ record.paidAmount?.toFixed(2) || 0 }
                </td>
                <td className="border p-3 text-right text-red-600 font-semibold">
                  ?{ record.remainingBalance?.toFixed(2) || 0 }
                </td>
                <td className="border p-3 text-center">{ new Date(record.dueDate).toLocaleDateString() }</td>
                <td className="border p-3 text-center">
                  <span className={ `px-3 py-1 rounded-full text-sm font-semibold ${
                    record.remainingBalance === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }` }>
                    { record.remainingBalance === 0 ? 'Settled' : 'Pending' }
                  </span>
                </td>
              </tr>
            )) }
          </tbody>
        </table>
      </div>
    ) }
  </div>
);

// Sales Analytics Tab
const AnalyticsTab = ({ analytics }) => (
  <div className="space-y-6">
    { analytics ? (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-600">₹{ analytics.revenueSummary?.totalRevenue?.toFixed(0) || 0 }</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-green-600">{ analytics.revenueSummary?.totalOrders || 0 }</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-gray-600 text-sm">Average Order</p>
            <p className="text-3xl font-bold text-purple-600">₹{ analytics.revenueSummary?.averageOrderValue?.toFixed(0) || 0 }</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <p className="text-gray-600 text-sm">Top Product</p>
            <p className="text-2xl font-bold text-orange-600">{ analytics.topProducts[0]?.productInfo?.[0]?.name || 'N/A' }</p>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            { analytics.topProducts.map((product, index) => (
              <div key={ index } className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-semibold">{ product.productInfo?.[0]?.name || 'Unknown Product' }</p>
                  <p className="text-sm text-gray-600">{ product.quantity } units sold</p>
                </div>
                <p className="text-lg font-bold text-green-600">₹{ product.revenue?.toFixed(0) || 0 }</p>
              </div>
            )) }
          </div>
        </div>
      </>
    ) : (
      <div className="text-center text-gray-500">Loading analytics...</div>
    ) }
  </div>
);

// Reviews Tab
const ReviewsTab = ({ reviews }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-bold mb-6">⭐ Ratings & Reviews</h2>

    { reviews.length === 0 ? (
      <div className="text-center py-8 text-gray-500">No reviews yet</div>
    ) : (
      <div className="space-y-4">
        { reviews.map(review => (
          <div key={ review._id } className="border rounded-lg p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-lg">{ review.retailer?.name }</p>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-bold">{ review.rating }/5</span>
                </div>
              </div>
              <span className="text-gray-500 text-sm">{ new Date(review.createdAt).toLocaleDateString() }</span>
            </div>
            <p className="text-gray-700">{ review.review }</p>
          </div>
        )) }
      </div>
    ) }
  </div>
);

// Messages Tab
const MessagesTab = ({ token, conversations, messages, selectedContact, messageText, setMessageText, setSelectedContact, sendMessage, loading, fetchMessages, user }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-bold mb-6">💬 Messages with Retailers</h2>
    
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
);

// Help Center Tab
const HelpCenterTab = ({ token }) => (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-bold mb-6">Submit Complaint to Admin</h2>
    <form className="max-w-2xl">
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Subject</label>
        <input
          type="text"
          placeholder="Subject of complaint"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 font-semibold mb-2">Description</label>
        <textarea
          placeholder="Describe your issue..."
          rows="6"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
        ></textarea>
      </div>
      <button
        type="submit"
        className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
      >
        Submit Complaint
      </button>
    </form>
  </div>
);

export default WholesaleDashboard;
