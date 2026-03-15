import React, { useEffect, useState } from 'react';

export const QueueTracker = ({ orders = [], currentOrderId, isWholesale = false }) => {
  const [queue, setQueue] = useState(orders);

  useEffect(() => {
    setQueue(orders);
  }, [orders]);

  if (queue.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-center text-gray-500">No orders in queue</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {isWholesale ? '📦 Order Queue' : '⏳ Order Status'}
        </h2>

        <div className="space-y-3">
          {queue.map((order, index) => {
            const isCurrentOrder = order._id === currentOrderId;
            const statusColors = {
              Waiting: 'bg-yellow-100 border-yellow-500 text-yellow-900',
              Preparing: 'bg-blue-100 border-blue-500 text-blue-900',
              'Ready for Pickup': 'bg-green-100 border-green-500 text-green-900',
              Completed: 'bg-gray-100 border-gray-500 text-gray-900'
            };

            const statusIcons = {
              Waiting: '⏳',
              Preparing: '👨‍🍳',
              'Ready for Pickup': '📦',
              Completed: '✅'
            };

            return (
              <div
                key={order._id}
                className={`
                  border-l-4 p-4 rounded-lg transition cursor-pointer
                  ${isCurrentOrder
                    ? 'bg-blue-50 border-b-2 border-l-4 border-blue-500 shadow-md'
                    : statusColors[order.status]
                  }
                `}
              >
                {/* Queue Position */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      {!isWholesale && (
                        <p className="text-sm text-gray-500">Order ID:</p>
                      )}
                      <p className="font-mono font-bold text-gray-900">
                        {order._id?.substring(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl">
                    {statusIcons[order.status] || '❓'}
                  </span>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  {isWholesale ? (
                    <>
                      <div>
                        <p className="text-gray-600">From:</p>
                        <p className="font-bold">{order.retailerShop?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount:</p>
                        <p className="font-bold text-blue-600">₹{order.totalAmount}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-600">To:</p>
                        <p className="font-bold">{order.wholesalerShop?.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount:</p>
                        <p className="font-bold text-blue-600">₹{order.totalAmount}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between pt-3 border-t border-opacity-50">
                  <div>
                    <p className="text-xs text-gray-600">Status</p>
                    <p className={`font-bold ${
                      order.status === 'Waiting'
                        ? 'text-yellow-700'
                        : order.status === 'Preparing'
                        ? 'text-blue-700'
                        : order.status === 'Ready for Pickup'
                        ? 'text-green-700'
                        : 'text-gray-700'
                    }`}>
                      {order.status}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          order.status === 'Completed'
                            ? 'bg-green-500 w-full'
                            : order.status === 'Ready for Pickup'
                            ? 'bg-green-500 w-3/4'
                            : order.status === 'Preparing'
                            ? 'bg-blue-500 w-1/2'
                            : 'bg-yellow-500 w-1/4'
                        }`}
                        style={{
                          width:
                            order.status === 'Completed'
                              ? '100%'
                              : order.status === 'Ready for Pickup'
                              ? '75%'
                              : order.status === 'Preparing'
                              ? '50%'
                              : '25%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Items Count */}
                <div className="mt-3 pt-3 border-t border-opacity-50">
                  <p className="text-xs text-gray-600">
                    📦 {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Payment Status */}
                {!isWholesale && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      order.paymentStatus === 'Completed'
                        ? 'bg-green-500 text-white'
                        : order.paymentStatus === 'Pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      💳 {order.paymentStatus}
                    </span>
                  </div>
                )}

                {/* Current Order Indicator */}
                {isCurrentOrder && (
                  <div className="mt-3 flex items-center gap-2 text-blue-600 font-bold text-sm">
                    <span>👉 Your Order</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Queue Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total in Queue</p>
            <p className="text-2xl font-bold text-blue-600">{queue.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Preparing</p>
            <p className="text-2xl font-bold text-blue-500">
              {queue.filter((o) => o.status === 'Preparing').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Ready</p>
            <p className="text-2xl font-bold text-green-500">
              {queue.filter((o) => o.status === 'Ready for Pickup').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueTracker;
