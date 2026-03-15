import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Export API base URL for use in components
export const API_BASE_URL = API_URL;

const getAuthHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// Shop Services
export const shopServices = {
  getNearbyWholesaleShops: (token, location, maxDistance) =>
    axios.post(
      `${API_URL}/api/shops/nearby-wholesale`,
      { longitude: location.longitude, latitude: location.latitude, maxDistance },
      getAuthHeader(token)
    ),
  
  getShopProfile: (token, shopId) =>
    axios.get(`${API_URL}/api/shops/profile/${shopId}`, getAuthHeader(token)),
  
  updateShopStatus: (token, shopId, isOpen) =>
    axios.put(
      `${API_URL}/api/shops/${shopId}/status`,
      { isOpen },
      getAuthHeader(token)
    )
};

// Product Services
export const productServices = {
  createProduct: (token, data) =>
    axios.post(`${API_URL}/api/products`, data, getAuthHeader(token)),
  
  getShopProducts: (token, shopId) =>
    axios.get(`${API_URL}/api/products/shop/${shopId}`, getAuthHeader(token)),
  
  updateProduct: (token, productId, data) =>
    axios.put(`${API_URL}/api/products/${productId}`, data, getAuthHeader(token)),
  
  deleteProduct: (token, productId) =>
    axios.delete(`${API_URL}/api/products/${productId}`, getAuthHeader(token))
};

// Order Services
export const orderServices = {
  createOrder: (token, data) =>
    axios.post(`${API_URL}/api/orders`, data, getAuthHeader(token)),
  
  getOrderQueue: (token) =>
    axios.get(`${API_URL}/api/orders/queue`, getAuthHeader(token)),
  
  getRetailerOrders: (token) =>
    axios.get(`${API_URL}/api/orders/my-orders`, getAuthHeader(token)),
  
  updateOrderStatus: (token, orderId, status) =>
    axios.put(
      `${API_URL}/api/orders/${orderId}/status`,
      { status },
      getAuthHeader(token)
    ),
  
  confirmPayment: (token, orderId, upiTransactionId) =>
    axios.put(
      `${API_URL}/api/orders/${orderId}/payment`,
      { upiTransactionId },
      getAuthHeader(token)
    )
};

// Review Services
export const reviewServices = {
  createReview: (token, data) =>
    axios.post(`${API_URL}/api/reviews`, data, getAuthHeader(token)),
  
  getShopReviews: (token, shopId) =>
    axios.get(`${API_URL}/api/reviews/shop/${shopId}`, getAuthHeader(token))
};

// Complaint Services
export const complaintServices = {
  createComplaint: (token, data) =>
    axios.post(`${API_URL}/api/complaints`, data, getAuthHeader(token)),
  
  getUserComplaints: (token) =>
    axios.get(`${API_URL}/api/complaints/my`, getAuthHeader(token)),
  
  getAllComplaints: (token) =>
    axios.get(`${API_URL}/api/complaints`, getAuthHeader(token)),
  
  updateComplaintStatus: (token, complaintId, status, adminNotes) =>
    axios.put(
      `${API_URL}/api/complaints/${complaintId}/status`,
      { status, adminNotes },
      getAuthHeader(token)
    )
};

// Khata Services
export const khataServices = {
  getWholesaleKhata: (token) =>
    axios.get(`${API_URL}/api/khata/wholesale`, getAuthHeader(token)),
  
  getRetailerKhata: (token) =>
    axios.get(`${API_URL}/api/khata/retail`, getAuthHeader(token))
};

// Admin Services
export const adminServices = {
  getAllUsers: (token) =>
    axios.get(`${API_URL}/api/admin/users`, getAuthHeader(token)),
  
  approveUser: (token, userId) =>
    axios.put(
      `${API_URL}/api/admin/users/${userId}/approve`,
      {},
      getAuthHeader(token)
    ),
  
  suspendUser: (token, userId) =>
    axios.put(
      `${API_URL}/api/admin/users/${userId}/suspend`,
      {},
      getAuthHeader(token)
    ),
  
  getPlatformAnalytics: (token) =>
    axios.get(`${API_URL}/api/admin/analytics/platform`, getAuthHeader(token)),
  
  getShopAnalytics: (token, shopId) =>
    axios.get(`${API_URL}/api/admin/analytics/shop/${shopId}`, getAuthHeader(token))
};

// Analytics Services
export const analyticsServices = {
  getRetailAnalytics: (token) =>
    axios.get(`${API_URL}/api/analytics/retail`, getAuthHeader(token)),
  
  getWholesaleAnalytics: (token) =>
    axios.get(`${API_URL}/api/analytics/wholesale`, getAuthHeader(token)),
  
  getShopAnalytics: (token, shopId) =>
    axios.get(`${API_URL}/api/analytics/shop/${shopId}`, getAuthHeader(token)),
  
  getExpenditureAnalytics: (token) =>
    axios.get(`${API_URL}/api/analytics/expenditure`, getAuthHeader(token))
};
