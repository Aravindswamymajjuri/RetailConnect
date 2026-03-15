import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { shopServices, productServices, orderServices, reviewServices } from '../services/api';
import { formatCurrency, getCurrentLocation } from '../utils/helpers';

export const RetailDashboard = () => {
  const { user, token, socket, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('shops');
  const [wholesaleShops, setWholesaleShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'shops') {
      fetchNearbyShops();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Real-time Socket.io listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('shopStatusChanged', (data) => {
      console.log('Shop status updated:', data);
      setWholesaleShops(prev => 
        prev.map(shop => 
          shop._id === data.shopId ? { ...shop, isOpen: data.isOpen } : shop
        )
      );
    });

    socket.on('inventoryUpdated', (data) => {
      setProducts(prev =>
        prev.map(product =>
          product._id === data.productId 
            ? { ...product, stockAvailable: data.newStock }
            : product
        )
      );
    });

    socket.on('orderStatusUpdated', (data) => {
      console.log('Order status updated:', data);
      setOrders(prev =>
        prev.map(order =>
          order._id === data.orderId
            ? { ...order, status: data.status }
            : order
        )
      );
    });

    return () => {
      socket.off('shopStatusChanged');
      socket.off('inventoryUpdated');
      socket.off('orderStatusUpdated');
    };
  }, [socket]);

  const fetchNearbyShops = async () => {
    try {
      setLoading(true);
      const loc = location || await getCurrentLocation();
      setLocation(loc);

      const response = await shopServices.getNearbyWholesaleShops(token, loc, 50000);
      setWholesaleShops(response.data);
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopProducts = async (shopId) => {
    try {
      const response = await productServices.getShopProducts(token, shopId);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSelectShop = async (shop) => {
    setSelectedShop(shop);
    await fetchShopProducts(shop._id);
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item._id === product._id);
    if (existingItem) {
      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      const items = cart.map(item => ({
        product: item._id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

      const response = await orderServices.createOrder(token, {
        items,
        wholesalerShopId: selectedShop._id,
        totalAmount
      });

      alert('Order placed successfully! Scan the QR code to pay.');
      setCart([]);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await orderServices.getRetailerOrders(token);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">RetailConnect - Retail Dashboard</h1>
          <div>
            <span className="mr-4">{user?.name}</span>
            <button onClick={logout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('shops')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === 'shops'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Find Wholesale Shops
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            My Orders
          </button>
        </div>

        {activeTab === 'shops' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4">Nearby Wholesale Shops</h2>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <div className="space-y-2">
                  {wholesaleShops.map(shop => (
                    <div
                      key={shop._id}
                      onClick={() => handleSelectShop(shop)}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedShop?._id === shop._id
                          ? 'bg-blue-100 border-2 border-blue-600'
                          : 'bg-gray-100 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <h3 className="font-semibold">{shop.name}</h3>
                      <p className="text-sm text-gray-600">{shop.address}</p>
                      <div className="flex justify-between mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${shop.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {shop.isOpen ? 'Open' : 'Closed'}
                        </span>
                        <span className="text-yellow-500">⭐ {shop.averageRating}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              {selectedShop ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold mb-4">{selectedShop.name} - Products</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {products.map(product => (
                        <div key={product._id} className="border border-gray-300 rounded-lg p-4">
                          <h3 className="font-semibold mb-2">{product.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">Category: {product.category}</p>
                          <p className="text-sm text-gray-600 mb-2">Stock: {product.stockAvailable}</p>
                          <p className="text-lg font-bold text-green-600 mb-4">{formatCurrency(product.price)}/unit</p>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                          >
                            Add to Cart
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold mb-4">Shopping Cart ({cart.length} items)</h3>
                    <div className="space-y-2 mb-4">
                      {cart.map(item => (
                        <div key={item._id} className="flex justify-between items-center border-b pb-2">
                          <span>{item.name}</span>
                          <div>
                            <span className="mr-4">Qty: {item.quantity}</span>
                            <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-right mb-4">
                      <p className="text-xl font-bold">
                        Total: {formatCurrency(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                      </p>
                    </div>
                    <button
                      onClick={placeOrder}
                      className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  Select a wholesale shop to view products
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">My Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-3 text-left">Order ID</th>
                    <th className="border p-3 text-left">Wholesale Shop</th>
                    <th className="border p-3 text-left">Amount</th>
                    <th className="border p-3 text-left">Status</th>
                    <th className="border p-3 text-left">Payment</th>
                    <th className="border p-3 text-left">Queue Position</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order._id} className="border-b hover:bg-gray-50">
                      <td className="border p-3">{order._id.slice(-8)}</td>
                      <td className="border p-3">{order.wholesalerShop?.name}</td>
                      <td className="border p-3 font-semibold">{formatCurrency(order.totalAmount)}</td>
                      <td className="border p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'Ready for Pickup' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Preparing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="border p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.paymentStatus === 'Completed' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="border p-3 font-semibold">#{order.queuePosition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RetailDashboard;
