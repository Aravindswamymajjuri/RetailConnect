/**
 * Real-time Events Configuration
 * Maps API endpoints to Socket.io events for automatic refreshing
 */

export const REAL_TIME_CONFIG = {
  // RETAIL ROLE
  retail: {
    // Shop discovery
    'nearbyShops': {
      endpoint: '/api/shops/nearby-wholesale',
      events: ['shopAdded', 'shopRemoved', 'shopStatusChanged'],
      description: 'Nearby wholesale shops'
    },

    // Products
    'shopProducts': {
      endpoint: '/api/products/shop/:shopId',
      events: ['productAdded', 'productUpdated', 'productDeleted', 'inventoryUpdated'],
      description: 'Shop products and inventory'
    },

    // Orders
    'myOrders': {
      endpoint: '/api/orders/my-orders',
      events: ['orderCreated', 'orderStatusChanged', 'orderUpdated'],
      description: 'Retail orders'
    },

    // Cart
    'cart': {
      endpoint: '/api/cart',
      events: ['cartUpdated', 'cartItemAdded', 'cartItemRemoved'],
      description: 'Shopping cart'
    },

    // Reviews
    'shopReviews': {
      endpoint: '/api/reviews/shop/:shopId',
      events: ['newReview', 'reviewUpdated'],
      description: 'Shop reviews'
    },

    // Analytics
    'expenditure': {
      endpoint: '/api/analytics/expenditure',
      events: ['analyticsUpdated', 'orderCompleted'],
      description: 'Expenditure analytics'
    },

    'shopAnalytics': {
      endpoint: '/api/analytics/shop/:shopId',
      events: ['analyticsUpdated', 'orderCompleted'],
      description: 'Shop-specific analytics'
    },

    // Messages
    'conversations': {
      endpoint: '/api/messages/conversations',
      events: ['messageReceived', 'newMessage'],
      description: 'Message conversations'
    },

    // Complaints
    'myComplaints': {
      endpoint: '/api/complaints/my',
      events: ['complaintStatusUpdated', 'complaintResolved'],
      description: 'My complaints'
    },

    // Khata
    'retailKhata': {
      endpoint: '/api/khata/retail',
      events: ['khataUpdated', 'paymentRecorded'],
      description: 'Khata records'
    }
  },

  // WHOLESALE ROLE
  wholesale: {
    // Products/Inventory
    'myProducts': {
      endpoint: '/api/products/shop/:shopId',
      events: ['productAdded', 'productUpdated', 'productDeleted', 'stockUpdated'],
      description: 'My products and inventory'
    },

    // Orders
    'orderQueue': {
      endpoint: '/api/wholesale/order-queue',
      events: ['newOrder', 'orderQueueUpdated', 'orderStatusChanged'],
      description: 'Order queue'
    },

    // Stock Alerts
    'stockAlerts': {
      endpoint: '/api/wholesale/stock-alerts',
      events: ['stockUpdated', 'inventoryUpdated', 'lowStockAlert'],
      description: 'Stock alerts'
    },

    // Analytics
    'salesAnalytics': {
      endpoint: '/api/analytics/wholesale',
      events: ['analyticsUpdated', 'orderCompleted', 'revenueUpdated'],
      description: 'Sales analytics'
    },

    // Khata
    'wholesaleKhata': {
      endpoint: '/api/khata/wholesale',
      events: ['khataUpdated', 'paymentRecorded'],
      description: 'Khata records'
    },

    // Reviews
    'myReviews': {
      endpoint: '/api/wholesale/reviews',
      events: ['newReview', 'reviewUpdated'],
      description: 'My shop reviews'
    },

    // Messages
    'conversations': {
      endpoint: '/api/messages/conversations',
      events: ['messageReceived', 'newMessage'],
      description: 'Message conversations'
    }
  },

  // ADMIN ROLE
  admin: {
    // Users
    'allUsers': {
      endpoint: '/api/admin/users',
      events: ['userRegistered', 'userApproved', 'userSuspended', 'userUpdated'],
      description: 'All users'
    },

    // Platform Analytics
    'platformAnalytics': {
      endpoint: '/api/admin/analytics/platform',
      events: ['analyticsUpdated', 'orderCompleted', 'newUser'],
      description: 'Platform analytics'
    },

    // Complaints
    'allComplaints': {
      endpoint: '/api/complaints',
      events: ['newComplaint', 'complaintStatusUpdated'],
      description: 'All complaints'
    },

    // Reviews
    'allReviews': {
      endpoint: '/api/admin/reviews',
      events: ['newReview'],
      description: 'All reviews'
    },

    // Shop Analytics
    'shopAnalytics': {
      endpoint: '/api/admin/analytics/shop/:shopId',
      events: ['analyticsUpdated'],
      description: 'Shop analytics'
    }
  }
};

/**
 * Get configuration for a specific role
 */
export const getRoleConfig = (role) => {
  return REAL_TIME_CONFIG[role] || {};
};

/**
 * Get all socket events to listen to for a role
 */
export const getAllSocketEvents = (role) => {
  const config = getRoleConfig(role);
  const events = [];
  
  Object.values(config).forEach(endpoint => {
    if (endpoint.events && Array.isArray(endpoint.events)) {
      events.push(...endpoint.events);
    }
  });

  return [...new Set(events)]; // Remove duplicates
};

export default REAL_TIME_CONFIG;
