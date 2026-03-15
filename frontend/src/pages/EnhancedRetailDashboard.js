import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShopMap } from '../components/ShopMap';
import { Cart } from '../components/Cart';
import { PaymentPage } from '../components/PaymentPage';
import { QueueTracker } from '../components/QueueTracker';
import { productServices, shopServices, orderServices } from '../services/api';
import axios from 'axios';

export const RetailDashboard2 = () => {
  const navigate = useNavigate();
  const { user, token, socket, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('discover');
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyShops, setNearbyShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  
  // Product filter state
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriceRange, setFilterPriceRange] = useState([0, 10000]);
  const [filterInStock, setFilterInStock] = useState(true);
  const [searchProduct, setSearchProduct] = useState('');
  const [productQuantities, setProductQuantities] = useState({});

  // Ratings & Reviews state
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState('');
  const [userRating, setUserRating] = useState(5);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewShopId, setReviewShopId] = useState('');

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({
    totalOrders: 0,
    totalSpending: 0,
    monthlyData: [],
    topProducts: [],
    orderStatusBreakdown: {}
  });

  // Inventory alerts state
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [shopAnalyticsData, setShopAnalyticsData] = useState(null);
  const [selectedShopForAnalytics, setSelectedShopForAnalytics] = useState(null);
  const [expenditureData, setExpenditureData] = useState(null);

  // Communication state
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showMessageForm, setShowMessageForm] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState([]);
  const [complaintText, setComplaintText] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('product');
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          fetchNearbyShops(position.coords.latitude, position.coords.longitude);
          fetchRetailerOrders();
          fetchComplaints();
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default location (Hyderabad)
          const defaultLocation = { latitude: 17.35, longitude: 78.65 };
          setUserLocation(defaultLocation);
          fetchNearbyShops(defaultLocation.latitude, defaultLocation.longitude);
          fetchRetailerOrders();
          fetchComplaints();
        }
      );
    }
  }, [token]);

  // Auto-fetch reviews when reviewShopId changes
  useEffect(() => {
    if (reviewShopId && reviewShopId.trim()) {
      fetchShopReviews(reviewShopId);
    }
  }, [reviewShopId]);

  // Fetch nearby shops within 5km radius
  const fetchNearbyShops = async (lat, lon) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/shops/nearby-wholesale`,
        {
          latitude: lat,
          longitude: lon,
          maxDistance: 5000 // 5km radius
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNearbyShops(response.data.shops || []);
    } catch (error) {
      console.error('Error fetching nearby shops:', error);
      alert('Unable to load nearby shops');
    } finally {
      setLoading(false);
    }
  };

  // Get current location and fetch shops
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const newLocation = { latitude: lat, longitude: lon };
          setUserLocation(newLocation);
          setManualLat(lat.toFixed(4));
          setManualLon(lon.toFixed(4));
          fetchNearbyShops(lat, lon);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Using default location.');
          setLoading(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  // Handle manual location input
  const handleLocationChange = async (lat, lon) => {
    try {
      // Validate coordinates
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        alert('Please enter valid latitude and longitude');
        return;
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        alert('Latitude must be between -90 and 90, Longitude between -180 and 180');
        return;
      }
      setUserLocation({ latitude: lat, longitude: lon });
      fetchNearbyShops(lat, lon);
    } catch (error) {
      console.error('Error changing location:', error);
      alert('Error updating location');
    }
  };

  // Fetch shop products
  const fetchShopProducts = async (shopId) => {
    try {
      setLoadingProducts(true);
      const response = await productServices.getShopProducts(token, shopId);
      setShopProducts(response.data);
      setProductQuantities({}); // Reset quantities when fetching new products
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Unable to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Get unique categories from products
  const getUniqueCategorories = () => {
    const categories = shopProducts.map(p => p.category).filter(Boolean);
    return [...new Set(categories)];
  };

  // Filter products based on filters
  const getFilteredProducts = () => {
    return shopProducts.filter(product => {
      const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
      const matchesPrice = product.price >= filterPriceRange[0] && product.price <= filterPriceRange[1];
      const matchesStock = !filterInStock || product.stockAvailable > 0;
      const matchesSearch = product.name.toLowerCase().includes(searchProduct.toLowerCase());
      
      return matchesCategory && matchesPrice && matchesStock && matchesSearch;
    });
  };

  // Handle quantity input change
  const handleQuantityChange = (productId, quantity) => {
    setProductQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, parseInt(quantity) || 0)
    }));
  };

  // Handle shop selection
  const handleShopSelect = (shop) => {
    setSelectedShop(shop);
    setActiveTab('products');
    fetchShopProducts(shop._id);
  };

  // Add product to cart with custom quantity
  const addToCart = (product, customQuantity = null) => {
    const selectedQuantity = customQuantity !== null ? customQuantity : (productQuantities[product._id] || 1);

    if (selectedQuantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (selectedQuantity > product.stockAvailable) {
      alert(`Only ${product.stockAvailable} units available for ${product.name}`);
      return;
    }

    const existingItem = cart.find((item) => item.product === product._id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + selectedQuantity;
      if (newQuantity > product.stockAvailable) {
        alert(`Cannot add more. Only ${product.stockAvailable} units available in total`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.product === product._id
            ? {
                ...item,
                quantity: newQuantity,
                total: newQuantity * item.pricePerUnit
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product: product._id,
          productName: product.name,
          category: product.category,
          quantity: selectedQuantity,
          pricePerUnit: product.price,
          total: selectedQuantity * product.price
        }
      ]);
    }

    alert(`${selectedQuantity}x ${product.name} added to cart!`);
    // Reset quantity after adding
    setProductQuantities(prev => ({ ...prev, [product._id]: 0 }));
  };

  // Checkout
  const handleCheckout = async (cartItems, total) => {
    if (!selectedShop || !cartItems.length) {
      alert('Invalid cart or shop');
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/orders`,
        {
          wholesalerShopId: selectedShop._id,
          cartItems,
          totalAmount: total
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const order = response.data.order;
      const payment = response.data.paymentData;

      setCurrentOrder(order);
      setPaymentData(payment);
      setShowCheckout(false);
      setShowPayment(true);

      // Real-time notification
      if (socket) {
        socket.emit('orderCreated', order);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Handle stock availability errors
      if (error.response?.data?.outOfStockItems) {
        const outOfStockItems = error.response.data.outOfStockItems;
        const itemList = outOfStockItems.map(item => 
          `❌ ${item.name}: Requested ${item.requestedQty}, Available ${item.availableQty}`
        ).join('\n');
        
        alert(`⚠️ Some products are not available:\n\n${itemList}\n\nPlease adjust your cart and try again.`);
      } else {
        alert('❌ Failed to create order: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Confirm payment
  const handlePaymentConfirmed = async (transactionId) => {
    try {
      setLoading(true);

      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/orders/${currentOrder._id}/payment`,
        { orderId: currentOrder._id, upiTransactionId: transactionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowPayment(false);
      setCart([]);
      fetchRetailerOrders();

      alert('✅ Payment confirmed! Your order is being prepared.');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Payment confirmation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch retailer orders
  const fetchRetailerOrders = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/orders/my-orders`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  // Fetch reviews for selected shop
  const fetchShopReviews = async (shopId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/reviews/shop/${shopId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  // Submit review
  const submitReview = async () => {
    if (!reviewShopId || !userReview.trim()) {
      alert('Please select a shop and enter a review');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/reviews`,
        {
          shop: reviewShopId,
          rating: userRating,
          text: userReview
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Fetch updated reviews before clearing form
      await fetchShopReviews(reviewShopId);
      setUserReview('');
      setUserRating(5);
      setReviewShopId('');
      setShowReviewForm(false);
      alert('✅ Review submitted successfully!');
    } catch (error) {
      alert('Failed to submit review: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analytics/retail`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  // Fetch shop-specific analytics
  const fetchShopAnalytics = async (shopId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analytics/shop/${shopId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShopAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching shop analytics:', error);
      alert('Failed to load shop analytics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch expenditure analytics
  const fetchExpenditureAnalytics = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/analytics/expenditure`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setExpenditureData(response.data);
    } catch (error) {
      console.error('Error fetching expenditure analytics:', error);
      alert('Failed to load expenditure data');
    }
  };

  // Fetch messages
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

  // Send message
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

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/complaints/my-complaints`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComplaints(response.data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  // Submit complaint
  const submitComplaint = async () => {
    if (!complaintText.trim()) {
      alert('Please enter complaint details');
      return;
    }

    try {
      setLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/complaints`,
        {
          category: complaintCategory,
          title: complaintText.substring(0, 50),
          description: complaintText,
          relatedOrder: currentOrder?._id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComplaintText('');
      setComplaintCategory('product');
      setShowComplaintForm(false);
      fetchComplaints();
      alert('✅ Complaint submitted successfully! Our support team will review it.');
    } catch (error) {
      alert('Failed to submit complaint: ' + error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Refresh analytics when order is placed
    socket.on('newOrder', (data) => {
      if (data.retailerId === user._id) {
        fetchAnalytics();
        if (selectedShopForAnalytics?._id) {
          fetchShopAnalytics(selectedShopForAnalytics._id);
        }
      }
    });

    // Refresh analytics when payment is confirmed
    socket.on('paymentConfirmed', (data) => {
      fetchAnalytics();
      if (selectedShopForAnalytics?._id) {
        fetchShopAnalytics(selectedShopForAnalytics._id);
      }
    });

    socket.on('orderStatusUpdated', (order) => {
      if (order.retailer === user._id) {
        setOrders((prevOrders) =>
          prevOrders.map((o) => (o._id === order._id ? order : o))
        );
        // Update analytics in real-time
        fetchAnalytics();
      }
    });

    socket.on('inventoryUpdated', (inventoryData) => {
      // Update product inventory
      if (inventoryData.productId) {
        setShopProducts((prevProducts) =>
          prevProducts.map((p) => 
            p._id === inventoryData.productId 
              ? { ...p, stockAvailable: inventoryData.newStock }
              : p
          )
        );
      }
      
      // Add to inventory alerts
      const alert = {
        id: Date.now(),
        type: 'INVENTORY_UPDATE',
        productName: inventoryData.productName,
        message: `${inventoryData.productName}: ${inventoryData.quantityDeducted} units sold. ${inventoryData.newStock} remaining in stock.`,
        timestamp: new Date(),
        severity: 'info'
      };
      setInventoryAlerts((prev) => [alert, ...prev].slice(0, 5)); // Keep last 5 alerts
    });

    socket.on('stockAlert', (alertData) => {
      // Handle stock alerts
      const alert = {
        id: Date.now(),
        type: alertData.status,
        productName: alertData.productName,
        message: alertData.status === 'OUT_OF_STOCK' 
          ? `⚠️ ${alertData.productName} is OUT OF STOCK!`
          : `⚠️ ${alertData.productName} is running LOW on stock (${alertData.currentStock} units left)`,
        timestamp: new Date(),
        severity: alertData.status === 'OUT_OF_STOCK' ? 'critical' : 'warning'
      };
      
      setStockAlerts((prev) => [alert, ...prev].slice(0, 5)); // Keep last 5 alerts
      
      // Also show notification
      if (Notification.permission === 'granted') {
        new Notification('Stock Alert', {
          body: alert.message,
          icon: alertData.status === 'OUT_OF_STOCK' ? '🚫' : '⚠️'
        });
      }
      
      // Update product stock in the list
      if (alertData.productId) {
        setShopProducts((prevProducts) =>
          prevProducts.map((p) => 
            p._id === alertData.productId 
              ? { ...p, stockAvailable: alertData.currentStock }
              : p
          )
        );
      }
    });

    socket.on('shopStatusChanged', (data) => {
      setNearbyShops((prevShops) =>
        prevShops.map((shop) =>
          shop._id === data.shopId ? { ...shop, isOpen: data.isOpen } : shop
        )
      );
    });

    // Real-time review updates
    socket.on('reviewAdded', (review) => {
      if (selectedShop && review.shop === selectedShop._id) {
        setReviews((prevReviews) => [review, ...prevReviews]);
      }
    });

    // Real-time message updates
    socket.on('messageReceived', (message) => {
      if (selectedContact && message.sender === selectedContact._id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    });

    // Real-time complaint status updates
    socket.on('complaintStatusUpdated', (complaint) => {
      if (complaint.retailer === user._id) {
        setComplaints((prevComplaints) =>
          prevComplaints.map((c) => (c._id === complaint._id ? complaint : c))
        );
      }
    });

    return () => {
      socket.off('newOrder');
      socket.off('paymentConfirmed');
      socket.off('orderStatusUpdated');
      socket.off('inventoryUpdated');
      socket.off('stockAlert');
      socket.off('shopStatusChanged');
      socket.off('reviewAdded');
      socket.off('messageReceived');
      socket.off('complaintStatusUpdated');
    };
  }, [socket, user, selectedShop, selectedContact]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">🛒 Retail Dashboard</h1>
            <p className="text-blue-100">Welcome, {user?.name || 'Retailer'}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition shadow-md"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Stock Alerts Banner */}
      {(stockAlerts.length > 0 || inventoryAlerts.length > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4 rounded-lg shadow-md">
          <div className="max-w-7xl mx-auto">
            <h3 className="font-bold text-red-800 mb-3">📢 Real-Time Stock Updates</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stockAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded flex items-start gap-3 ${
                  alert.severity === 'critical' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'
                }`}>
                  <span className="text-xl">{alert.severity === 'critical' ? '🚫' : '⚠️'}</span>
                  <div className="flex-1">
                    <p className={`font-semibold ${alert.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'}`}>
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
              {inventoryAlerts.map((alert) => (
                <div key={alert.id} className="p-3 rounded flex items-start gap-3 bg-blue-100 border border-blue-300">
                  <span className="text-xl">ℹ️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mt-6 px-4">
        <div className="flex gap-4 mb-6 overflow-x-auto pb-4">
          {[
            { id: 'discover', label: '🗺️ Discover Shops', icon: 'map' },
            { id: 'products', label: '📦 Products', icon: 'product' },
            { id: 'cart', label: `🛍️ Cart (${cart.length})`, icon: 'cart' },
            { id: 'orders', label: '📋 My Orders', icon: 'orders' },
            { id: 'analytics', label: '📊 Analytics', icon: 'analytics' },
            { id: 'reviews', label: '⭐ Reviews', icon: 'reviews' },
            { id: 'messages', label: `💬 Messages (${messages.length})`, icon: 'messages' },
            { id: 'help', label: '❓ Help Center', icon: 'help' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'analytics') fetchAnalytics();
                // For reviews: if reviewShopId is set, useEffect will fetch; otherwise use selectedShop
                if (tab.id === 'reviews' && !reviewShopId && selectedShop) {
                  fetchShopReviews(selectedShop._id);
                }
                if (tab.id === 'help') fetchComplaints();
              }}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {/* DISCOVER SHOPS TAB */}
        {activeTab === 'discover' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Location Controls */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">📍 Your Location</h3>
                    {userLocation ? (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Latitude:</span> {userLocation.latitude.toFixed(4)} | 
                        <span className="font-semibold ml-2">Longitude:</span> {userLocation.longitude.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">Location not detected</p>
                    )}
                    <p className="text-sm text-blue-600 font-semibold mt-1">🔍 Searching within 5km radius</p>
                  </div>
                  <button
                    onClick={handleGetCurrentLocation}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition disabled:opacity-50"
                  >
                    📍 {loading ? 'Detecting...' : 'Get My Location'}
                  </button>
                </div>

                {/* Manual Location Input */}
                <div className="border-t-2 border-blue-200 pt-4">
                  <p className="font-semibold text-gray-700 mb-3">Or enter coordinates manually:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        placeholder="e.g., 17.3850"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        step="0.0001"
                        min="-90"
                        max="90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        placeholder="e.g., 78.4867"
                        value={manualLon}
                        onChange={(e) => setManualLon(e.target.value)}
                        className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                        step="0.0001"
                        min="-180"
                        max="180"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">&nbsp;</label>
                      <button
                        onClick={() => handleLocationChange(parseFloat(manualLat), parseFloat(manualLon))}
                        disabled={loading || !manualLat || !manualLon}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition disabled:opacity-50"
                      >
                        🔍 Search
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-3"></div>
                <p className="text-lg text-gray-600">Loading nearby wholesale shops within 5km...</p>
              </div>
            ) : (
              <>
                {/* Map Display */}
                <ShopMap
                  shops={nearbyShops}
                  userLocation={userLocation}
                  onShopSelect={handleShopSelect}
                  title={`Nearby Wholesale Shops Within 5km (${nearbyShops.length} found)`}
                />

                {/* Shops List */}
                <div className="mt-12">
                  <h2 className="text-2xl font-bold mb-6 text-gray-800">📍 Available Shops</h2>
                  {nearbyShops.length === 0 ? (
                    <div className="text-center bg-yellow-50 rounded-lg border-2 border-yellow-200 py-12">
                      <p className="text-lg text-yellow-800 font-semibold">😢 No wholesale shops found within 5km</p>
                      <p className="text-sm text-yellow-700 mt-2">Try changing your location or extending the search radius</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {nearbyShops.map((shop) => (
                        <div
                          key={shop._id}
                          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md hover:shadow-lg p-6 cursor-pointer transition transform hover:scale-105 border-l-4 border-blue-600"
                          onClick={() => handleShopSelect(shop)}
                        >
                          <h3 className="font-bold text-lg text-gray-900 mb-2">{shop.name}</h3>
                          <p className="text-gray-600 text-sm mb-3">{shop.address}</p>
                          <div className="space-y-2 mb-3">
                            <p className="text-blue-600 font-semibold text-sm">
                              📍 {shop.distanceKm} km ({shop.distanceMeters} meters) away
                            </p>
                            <p className="text-gray-600 text-sm">👤 Owner: {shop.owner?.name}</p>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`px-3 py-1 rounded-full font-semibold text-sm ${
                              shop.isOpen
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {shop.isOpen ? '🟢 Open' : '🔴 Closed'}
                            </span>
                            <p className="text-yellow-500 font-semibold text-sm">⭐ {shop.averageRating ? shop.averageRating.toFixed(1) : 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {selectedShop ? (
              <>
                <div className="mb-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedShop.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedShop.address}</p>
                  <p className="text-blue-600 font-semibold mt-2">
                    📍 {selectedShop.distanceKm} km ({selectedShop.distanceMeters} meters) away
                  </p>
                  {selectedShop.owner && (
                    <p className="text-gray-600 mt-1">👤 Owner: {selectedShop.owner.name}</p>
                  )}
                  <p className="text-yellow-600 font-semibold mt-1">⭐ Rating: {selectedShop.averageRating ? selectedShop.averageRating.toFixed(1) : 'N/A'}</p>
                </div>

                {loadingProducts ? (
                  <p className="text-center text-gray-600">Loading products...</p>
                ) : shopProducts.length === 0 ? (
                  <p className="text-center text-gray-500">No products available</p>
                ) : (
                  <>
                    {/* FILTER SECTION */}
                    <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Filter Products</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={searchProduct}
                            onChange={(e) => setSearchProduct(e.target.value)}
                            className="w-full border-2 border-green-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                          />
                        </div>

                        {/* Category Filter */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                          <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="w-full border-2 border-green-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500"
                          >
                            <option value="all">All Categories</option>
                            {getUniqueCategorories().map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Price Range */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Price: ₹{filterPriceRange[0]} - ₹{filterPriceRange[1]}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="10000"
                            value={filterPriceRange[1]}
                            onChange={(e) => setFilterPriceRange([filterPriceRange[0], parseInt(e.target.value)])}
                            className="w-full"
                          />
                        </div>

                        {/* Stock Filter */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filterInStock}
                              onChange={(e) => setFilterInStock(e.target.checked)}
                              className="w-4 h-4 rounded border-2 border-green-200"
                            />
                            <span className="ml-2 text-gray-700">In Stock Only</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* PRODUCTS GRID */}
                    {getFilteredProducts().length === 0 ? (
                      <div className="text-center bg-yellow-50 rounded-lg border-2 border-yellow-200 py-12">
                        <p className="text-lg text-yellow-800 font-semibold">📦 No products match your filters</p>
                        <p className="text-sm text-yellow-700 mt-2">Try adjusting your filter criteria</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {getFilteredProducts().map((product) => (
                          <div
                            key={product._id}
                            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md hover:shadow-lg p-6 transition border-l-4 border-green-600"
                          >
                            <h3 className="font-bold text-lg text-gray-900 mb-2">{product.name}</h3>
                            <p className="text-gray-600 text-sm mb-1">{product.category}</p>
                            <p className="text-green-600 font-bold text-xl mb-3">₹{product.price}</p>
                            
                            {/* Stock info */}
                            <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">📦 Stock:</span> {product.stockAvailable} units
                              </p>
                            </div>

                            {/* Quantity Input */}
                            <div className="mb-3">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity (units)</label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleQuantityChange(product._id, (productQuantities[product._id] || 1) - 1)}
                                  className="bg-gray-300 hover:bg-gray-400 text-gray-900 px-2 py-1 rounded"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={product.stockAvailable}
                                  placeholder="Enter quantity"
                                  value={productQuantities[product._id] || ''}
                                  onChange={(e) => handleQuantityChange(product._id, e.target.value)}
                                  className="flex-1 border-2 border-green-200 rounded px-2 py-1 text-center focus:outline-none focus:border-green-500"
                                />
                                <button
                                  onClick={() => handleQuantityChange(product._id, (productQuantities[product._id] || 0) + 1)}
                                  className="bg-gray-300 hover:bg-gray-400 text-gray-900 px-2 py-1 rounded"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <button
                              onClick={() => addToCart(product, productQuantities[product._id])}
                              disabled={product.stockAvailable === 0 || !productQuantities[product._id]}
                              className={`w-full py-2 px-4 rounded-lg font-bold transition ${
                                product.stockAvailable === 0 || !productQuantities[product._id]
                                  ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                                  : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                              }`}
                            >
                              🛒 Add {productQuantities[product._id] || 0} to Cart
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500 py-12">
                Please select a shop from the Discover tab
              </p>
            )}
          </div>
        )}

        {/* CART TAB */}
        {activeTab === 'cart' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {!showCheckout && !showPayment ? (
              <Cart
                wholesalerId={selectedShop?._id}
                items={cart}
                onCheckout={handleCheckout}
                isLoading={loading}
              />
            ) : showPayment ? (
              <PaymentPage
                order={currentOrder}
                paymentData={paymentData}
                shopName={selectedShop?.name}
                onPaymentConfirmed={handlePaymentConfirmed}
                isLoading={loading}
              />
            ) : null}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <QueueTracker
              orders={orders}
              currentOrderId={currentOrder?._id}
              isWholesale={false}
            />
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">📊 Shop Analytics Dashboard</h2>
            
            {/* Expenditure Summary Section */}
            <div className="mb-10 bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-lg border-2 border-red-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-gray-900">💰 Overall Expenditure Summary</h3>
                <button
                  onClick={fetchExpenditureAnalytics}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  📊 Load Expenditure
                </button>
              </div>

              {expenditureData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-6 border-l-4 border-red-600">
                    <p className="text-gray-600 text-sm font-semibold">Total Expenditure</p>
                    <p className="text-3xl font-bold text-red-600">₹{expenditureData.totalExpenditure?.toLocaleString() || 0}</p>
                    <p className="text-sm text-gray-600 mt-2">Across all shops</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border-l-4 border-pink-600">
                    <p className="text-gray-600 text-sm font-semibold">Total Shops Used</p>
                    <p className="text-3xl font-bold text-pink-600">{expenditureData.totalShopsUsed || 0}</p>
                    <p className="text-sm text-gray-600 mt-2">Unique wholesale shops</p>
                  </div>
                  <div className="bg-white rounded-lg p-6 border-l-4 border-purple-600">
                    <p className="text-gray-600 text-sm font-semibold">Avg per Shop</p>
                    <p className="text-3xl font-bold text-purple-600">₹{(expenditureData.totalExpenditure / Math.max(expenditureData.totalShopsUsed, 1))?.toLocaleString() || 0}</p>
                    <p className="text-sm text-gray-600 mt-2">Average spending</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">👆 Click "Load Expenditure" to view spending summary</p>
              )}

              {/* Top Spent Shops */}
              {expenditureData && expenditureData.topSpentShops && expenditureData.topSpentShops.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">🏪 Top 5 Most Spent Shops</h4>
                  <div className="space-y-3">
                    {expenditureData.topSpentShops.map((shop, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-red-200 flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-900">{idx + 1}. {shop.shopName}</p>
                          <p className="text-sm text-gray-600">{shop.orderCount} orders • Avg: ₹{shop.avgOrderValue?.toLocaleString() || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">₹{shop.expenditure?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenditure by Payment Status */}
              {expenditureData && expenditureData.expenditureByPaymentStatus && expenditureData.expenditureByPaymentStatus.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">💳 Expenditure by Payment Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {expenditureData.expenditureByPaymentStatus.map((status, idx) => {
                      let bgColor = 'bg-white border-red-200';
                      if (status._id === 'Pending') bgColor = 'bg-yellow-50 border-yellow-300';
                      else if (status._id === 'Completed') bgColor = 'bg-green-50 border-green-300';
                      else if (status._id === 'Failed') bgColor = 'bg-red-50 border-red-300';
                      
                      return (
                        <div key={idx} className={`${bgColor} rounded-lg p-3 border text-center`}>
                          <p className="text-sm text-gray-600 capitalize font-semibold">{status._id}</p>
                          <p className="text-lg font-bold text-gray-900 mt-2">₹{status.expenditure?.toLocaleString() || 0}</p>
                          <p className="text-xs text-gray-600 mt-1">{status.count} orders</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expenditure by Order Status */}
              {expenditureData && expenditureData.expenditureByOrderStatus && expenditureData.expenditureByOrderStatus.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">📦 Expenditure by Order Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {expenditureData.expenditureByOrderStatus.map((status, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                        <p className="text-sm text-gray-600 capitalize font-semibold">{status._id}</p>
                        <p className="text-lg font-bold text-gray-900 mt-2">₹{status.expenditure?.toLocaleString() || 0}</p>
                        <p className="text-xs text-gray-600 mt-1">{status.count} orders</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Shops Expenditure Analytics */}
              {expenditureData && expenditureData.expenditureByShop && expenditureData.expenditureByShop.length > 0 && (
                <div className="mt-8 pt-8 border-t-2 border-red-300">
                  <h4 className="text-2xl font-bold text-gray-900 mb-6">📊 All Shops Expenditure Analytics</h4>
                  
                  {/* Shops Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-red-100">
                          <th className="border border-red-300 px-4 py-3 text-left font-bold text-gray-900">#</th>
                          <th className="border border-red-300 px-4 py-3 text-left font-bold text-gray-900">Shop Name</th>
                          <th className="border border-red-300 px-4 py-3 text-right font-bold text-gray-900">Total Spent</th>
                          <th className="border border-red-300 px-4 py-3 text-center font-bold text-gray-900">Orders</th>
                          <th className="border border-red-300 px-4 py-3 text-right font-bold text-gray-900">Avg Order Value</th>
                          <th className="border border-red-300 px-4 py-3 text-center font-bold text-gray-900">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenditureData.expenditureByShop.map((shop, idx) => {
                          const percentage = ((shop.expenditure / (expenditureData.totalExpenditure || 1)) * 100).toFixed(1);
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-red-50'}>
                              <td className="border border-red-200 px-4 py-3 font-semibold text-gray-900">{idx + 1}</td>
                              <td className="border border-red-200 px-4 py-3">
                                <div>
                                  <p className="font-semibold text-gray-900">{shop.shopName}</p>
                                  <p className="text-sm text-gray-600">{shop.shopAddress}</p>
                                </div>
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-right">
                                <span className="text-lg font-bold text-red-600">₹{shop.expenditure?.toLocaleString() || 0}</span>
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-center">
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">{shop.orderCount}</span>
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-right">
                                <span className="font-semibold text-gray-900">₹{shop.avgOrderValue?.toLocaleString() || 0}</span>
                              </td>
                              <td className="border border-red-200 px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-red-600 h-2 rounded-full" 
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-semibold text-gray-900 w-12 text-right">{percentage}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Stats */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                      <p className="text-sm text-gray-600 font-semibold">Highest Spending Shop</p>
                      <p className="text-xl font-bold text-red-600 mt-2">{expenditureData.expenditureByShop[0]?.shopName || 'N/A'}</p>
                      <p className="text-sm text-gray-600 mt-1">₹{expenditureData.expenditureByShop[0]?.expenditure?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                      <p className="text-sm text-gray-600 font-semibold">Average Spend per Shop</p>
                      <p className="text-xl font-bold text-red-600 mt-2">₹{(expenditureData.totalExpenditure / Math.max(expenditureData.totalShopsUsed, 1))?.toLocaleString() || 0}</p>
                      <p className="text-sm text-gray-600 mt-1">Across {expenditureData.totalShopsUsed} shops</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-2 border-red-200">
                      <p className="text-sm text-gray-600 font-semibold">Lowest Spending Shop</p>
                      <p className="text-xl font-bold text-red-600 mt-2">{expenditureData.expenditureByShop[expenditureData.expenditureByShop.length - 1]?.shopName || 'N/A'}</p>
                      <p className="text-sm text-gray-600 mt-1">₹{expenditureData.expenditureByShop[expenditureData.expenditureByShop.length - 1]?.expenditure?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Shop Selector */}
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-300">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select a Shop to View Detailed Analytics & Expenditure</label>
              <select
                value={selectedShopForAnalytics?._id || ''}
                onChange={(e) => {
                  const shop = nearbyShops.find(s => s._id === e.target.value);
                  if (shop) {
                    setSelectedShopForAnalytics(shop);
                    fetchShopAnalytics(shop._id);
                  }
                }}
                className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
              >
                <option value="">-- Choose a wholesale shop --</option>
                {nearbyShops.map(shop => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name} - {shop.address}
                  </option>
                ))}
              </select>
            </div>

            {!shopAnalyticsData && selectedShopForAnalytics ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Loading shop analytics...</p>
              </div>
            ) : !selectedShopForAnalytics ? (
              <div className="bg-yellow-50 rounded-lg p-8 border-2 border-yellow-200 text-center">
                <p className="text-yellow-800 text-lg font-semibold">👆 Select a shop above to view detailed analytics</p>
              </div>
            ) : shopAnalyticsData ? (
              <>
                {/* Shop Name Header */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                  <h3 className="text-2xl font-bold text-gray-900">{shopAnalyticsData.shopName}</h3>
                  <p className="text-gray-600 mt-1">Total Orders: {shopAnalyticsData.totalOrders}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-l-4 border-red-600">
                    <p className="text-gray-600 text-sm font-semibold">💰 Total Expenditure</p>
                    <p className="text-3xl font-bold text-red-600">₹{shopAnalyticsData.totalSpending?.toLocaleString() || 0}</p>
                    <p className="text-xs text-gray-600 mt-2">Total spent at this shop</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-600">
                    <p className="text-gray-600 text-sm font-semibold">Avg Order Value</p>
                    <p className="text-3xl font-bold text-green-600">₹{shopAnalyticsData.avgOrderValue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-l-4 border-purple-600">
                    <p className="text-gray-600 text-sm font-semibold">Total Orders</p>
                    <p className="text-3xl font-bold text-purple-600">{shopAnalyticsData.totalOrders}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-l-4 border-orange-600">
                    <p className="text-gray-600 text-sm font-semibold">Top Product</p>
                    <p className="text-xl font-bold text-orange-600">{shopAnalyticsData.topProduct?.name || 'N/A'}</p>
                    {shopAnalyticsData.topProduct && (
                      <p className="text-sm text-orange-600 mt-2">{shopAnalyticsData.topProduct.quantity} units purchased</p>
                    )}
                  </div>
                </div>

                {/* Charts and Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {/* Expenditure Details */}
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 border-2 border-red-200">
                    <h3 className="text-lg font-bold mb-4 text-gray-900">💸 Expenditure Details</h3>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                        <p className="text-2xl font-bold text-red-600">₹{shopAnalyticsData.totalSpending?.toLocaleString() || 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-gray-600 mb-1">Orders Count</p>
                        <p className="text-2xl font-bold text-gray-900">{shopAnalyticsData.totalOrders} orders</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-gray-600 mb-1">Average per Order</p>
                        <p className="text-2xl font-bold text-green-600">₹{shopAnalyticsData.avgOrderValue?.toLocaleString() || 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-gray-600 mb-1">Shop Status</p>
                        <p className="text-lg font-bold">
                          <span className={`px-3 py-1 rounded-full ${
                            shopAnalyticsData.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {shopAnalyticsData.isOpen ? '🟢 Open' : '🔴 Closed'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Spending */}
                  <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg p-6 border-2 border-blue-200">
                    <h3 className="text-lg font-bold mb-4 text-gray-900">📈 Monthly Spending</h3>
                    <div className="space-y-3">
                      {shopAnalyticsData.monthlyData && shopAnalyticsData.monthlyData.length > 0 ? (
                        shopAnalyticsData.monthlyData.map((month, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border border-blue-200">
                            <span className="font-semibold text-gray-700">
                              {new Date(month._id.year, month._id.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                            </span>
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">₹{month.spending?.toLocaleString() || 0}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No monthly data available</p>
                      )}
                    </div>
                  </div>

                  {/* Most Purchased Products */}
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-6 border-2 border-green-200">
                    <h3 className="text-lg font-bold mb-4 text-gray-900">🛒 Most Purchased Products</h3>
                    <div className="space-y-2">
                      {shopAnalyticsData.mostPurchasedProducts && shopAnalyticsData.mostPurchasedProducts.length > 0 ? (
                        shopAnalyticsData.mostPurchasedProducts.map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-white rounded border border-green-200">
                            <div>
                              <span className="font-semibold text-gray-900">{idx + 1}. {product._id}</span>
                              <p className="text-sm text-gray-600">Qty: {product.totalQuantity}</p>
                            </div>
                            <div className="text-right">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">₹{product.totalSpent?.toLocaleString() || 0}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No product data available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Status Breakdown */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-6 border-2 border-yellow-200">
                  <h3 className="text-lg font-bold mb-4 text-gray-900">📋 Order Status Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {shopAnalyticsData.orderStatusBreakdown && Object.entries(shopAnalyticsData.orderStatusBreakdown).length > 0 ? (
                      Object.entries(shopAnalyticsData.orderStatusBreakdown).map(([status, count]) => (
                        <div key={status} className="bg-white rounded-lg p-4 border border-yellow-200 text-center">
                          <p className="text-sm text-gray-600 capitalize font-semibold">{status}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No order data available</p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">⭐ Ratings & Reviews</h2>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                {showReviewForm ? '✕ Close' : '✏️ Write Review'}
              </button>
            </div>

            {showReviewForm && (
              <div className="mb-8 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 border-2 border-yellow-300">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Leave a Review</h3>
                <div className="space-y-4">
                  {/* Shop Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Shop</label>
                    <select
                      value={reviewShopId}
                      onChange={(e) => setReviewShopId(e.target.value)}
                      className="w-full border-2 border-yellow-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500"
                    >
                      <option value="">-- Choose a shop to review --</option>
                      {nearbyShops.map(shop => (
                        <option key={shop._id} value={shop._id}>
                          {shop.name} - {shop.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Rating */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setUserRating(star)}
                          className={`text-3xl transition ${userRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Review Text */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review</label>
                    <textarea
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Share your experience with this wholesale shop..."
                      className="w-full border-2 border-yellow-300 rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500"
                      rows={4}
                    />
                  </div>
                  
                  {/* Submit Button */}
                  <button
                    onClick={submitReview}
                    disabled={loading || !reviewShopId}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : '✓ Submit Review'}
                  </button>
                </div>
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviewShopId ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Reviews for {nearbyShops.find(s => s._id === reviewShopId)?.name || 'Shop'}
                  </h3>
                  {reviews.length === 0 ? (
                    <div className="text-center bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
                      <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review._id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-yellow-400">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-gray-900">{review.author?.name || 'Anonymous'}</p>
                          <p className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                        </div>
                        <p className="text-gray-700 mb-2">{review.text}</p>
                        <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </>
              ) : selectedShop ? (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Reviews for {selectedShop.name}</h3>
                  {reviews.length === 0 ? (
                    <div className="text-center bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
                      <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review._id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-yellow-400">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-gray-900">{review.author?.name || 'Anonymous'}</p>
                          <p className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                        </div>
                        <p className="text-gray-700 mb-2">{review.text}</p>
                        <p className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <div className="text-center bg-blue-50 rounded-lg p-8 border-2 border-blue-200">
                  <p className="text-blue-600">👆 Click "Write Review" above to select a shop and leave a review!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-8 text-gray-900">💬 Communication System</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Contacts List */}
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Contacts</h3>
                {nearbyShops.length === 0 ? (
                  <p className="text-gray-500 text-sm">No wholesale shops to contact</p>
                ) : (
                  <div className="space-y-2">
                    {nearbyShops.map((shop) => (
                      <button
                        key={shop._id}
                        onClick={() => {
                          setSelectedContact(shop);
                          fetchMessages(shop._id);
                        }}
                        className={`w-full text-left p-3 rounded-lg transition ${
                          selectedContact?._id === shop._id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <p className="font-semibold">{shop.name}</p>
                        <p className="text-sm">{shop.owner?.name}</p>
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
                      <h3 className="text-lg font-bold text-gray-900">{selectedContact.name}</h3>
                      <p className="text-sm text-gray-600">Owner: {selectedContact.owner?.name}</p>
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
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}>
                              <p className="text-sm">{msg.text}</p>
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
                        className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
                      >
                        📤 Send
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a contact to start messaging
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HELP CENTER TAB */}
        {activeTab === 'help' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">❓ Help Center & Support</h2>
              <button
                onClick={() => setShowComplaintForm(!showComplaintForm)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                {showComplaintForm ? '✕ Close' : '📝 File Complaint'}
              </button>
            </div>

            {showComplaintForm && (
              <div className="mb-8 bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border-2 border-red-300">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Submit a Complaint</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                    <select
                      value={complaintCategory}
                      onChange={(e) => setComplaintCategory(e.target.value)}
                      className="w-full border-2 border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                    >
                      <option value="product">Product Quality/Damage</option>
                      <option value="delivery">Delivery Issue</option>
                      <option value="payment">Payment Issue</option>
                      <option value="shop">Shop Behavior</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={complaintText}
                      onChange={(e) => setComplaintText(e.target.value)}
                      placeholder="Please describe your issue in detail..."
                      className="w-full border-2 border-red-300 rounded-lg px-4 py-3 focus:outline-none focus:border-red-500"
                      rows={5}
                    />
                  </div>
                  <button
                    onClick={submitComplaint}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : '✓ Submit Complaint'}
                  </button>
                </div>
              </div>
            )}

            {/* Complaints List */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Your Support Tickets</h3>
              {complaints.length === 0 ? (
                <div className="text-center bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
                  <p className="text-gray-500">No complaints filed. We're happy to help if you need anything!</p>
                </div>
              ) : (
                complaints.map((complaint) => (
                  <div key={complaint._id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-red-400">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{complaint.title}</p>
                        <p className={`text-sm font-semibold ${
                          complaint.status === 'resolved' ? 'text-green-600' :
                          complaint.status === 'in-progress' ? 'text-blue-600' : 'text-yellow-600'
                        }`}>
                          Status: {complaint.status?.toUpperCase()}
                        </p>
                      </div>
                      <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm capitalize">
                        {complaint.category}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{complaint.description}</p>
                    <p className="text-xs text-gray-500">{new Date(complaint.createdAt).toLocaleDateString()}</p>
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

export default RetailDashboard2;
