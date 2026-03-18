import React, { useState } from 'react';

export const Cart = ({ wholesalerId, items = [], onCheckout, isLoading = false }) => {
  const [cart, setCart] = useState(items);
  const [loading, setLoading] = useState(isLoading);

  // Update item quantity
  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(productId);
      return;
    }

    try {
      setLoading(true);
      const updatedCart = cart.map((item) =>
        item.product === productId
          ? { ...item, quantity: newQuantity, total: newQuantity * item.pricePerUnit }
          : item
      );
      setCart(updatedCart);
    } catch (error) {
      console.error('Error updating cart:', error);
      alert('Failed to update cart');
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeItem = (productId) => {
    setCart(cart.filter((item) => item.product !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = Math.round(subtotal * 0.05); // 5% tax
  const total = subtotal + tax;

  // Check if checkout is possible
  const canCheckout = cart.length > 0 && !loading;

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Shopping Cart</h2>

        {cart.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Your cart is empty</p>
            <p className="text-gray-400">Add items to get started</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Product</th>
                    <th className="px-4 py-3 text-center font-bold">Price</th>
                    <th className="px-4 py-3 text-center font-bold">Quantity</th>
                    <th className="px-4 py-3 text-center font-bold">Total</th>
                    <th className="px-4 py-3 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr
                      key={item.product}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-800">{item.productName}</p>
                          <p className="text-sm text-gray-500">{item.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="font-semibold">₹{item.pricePerUnit}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.product, item.quantity - 1)}
                            disabled={loading}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.product, parseInt(e.target.value) || 1)
                            }
                            disabled={loading}
                            className="w-12 text-center border border-gray-300 rounded px-2 py-1"
                            min="1"
                          />
                          <button
                            onClick={() => updateQuantity(item.product, item.quantity + 1)}
                            disabled={loading}
                            className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="font-bold text-blue-600">₹{item.total}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => removeItem(item.product)}
                          disabled={loading}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cart Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-lg">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-semibold text-gray-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-lg border-t-2 border-gray-200 pt-3">
                  <span className="text-gray-700">Tax (5%):</span>
                  <span className="font-semibold text-gray-900">₹{tax}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold border-t-2 border-gray-300 pt-3 mt-3">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-blue-600">₹{total}</span>
                </div>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => onCheckout?.(cart, total)}
              disabled={!canCheckout}
              className={`w-full py-3 rounded-lg font-bold text-white text-lg transition ${
                canCheckout
                  ? 'bg-green-500 hover:bg-green-600 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : 'Proceed to Checkout'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Cart;
