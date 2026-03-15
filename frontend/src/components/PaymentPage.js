import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';

export const PaymentPage = ({
  order,
  paymentData,
  shopName,
  onPaymentConfirmed,
  isLoading = false
}) => {
  const [timer, setTimer] = useState(300); // 5 minutes timer
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const maxAttempts = 3;

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePaymentConfirmed = () => {
    if (paymentAttempts >= maxAttempts) {
      alert('Maximum payment confirmation attempts reached. Please try again later.');
      return;
    }

    setPaymentAttempts((prev) => prev + 1);

    // Ask for transactionId (in real UPI, this would be provided by the payment gateway)
    const transactionId = prompt(
      'Enter UPI Transaction ID (or click "Completed" without entering):'
    );
    if (transactionId !== null) {
      onPaymentConfirmed?.(transactionId || `UPI_${Date.now()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
          <h1 className="text-3xl font-bold mb-2">💳 Payment Required</h1>
          <p className="text-blue-100">Complete your order with UPI</p>
        </div>

        {/* Order Details */}
        <div className="px-6 py-6 border-b border-gray-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono font-bold text-gray-900">
                {order?._id?.substring(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600">Shop:</span>
              <span className="font-semibold text-gray-900">{shopName}</span>
            </div>
            <div className="flex justify-between items-center text-2xl">
              <span className="text-gray-700 font-bold">Amount:</span>
              <span className="text-blue-600 font-bold">₹{paymentData?.amount || order?.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="px-6 py-8 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
            📱 Scan to Pay
          </h2>

          {paymentData?.qrCode ? (
            <div className="bg-white p-4 rounded-lg border-2 border-blue-300 flex flex-col items-center">
              <QRCode
                value={paymentData.upiLink}
                size={256}
                level="H"
                includeMargin={true}
              />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Scan this QR code with your UPI app to make payment
              </p>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg border-2 border-gray-300 text-center">
              <p className="text-gray-500">Loading QR Code...</p>
            </div>
          )}

          {/* Direct UPI Link */}
          {paymentData?.upiLink && (
            <a
              href={paymentData.upiLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-center transition"
            >
              🎯 Pay with UPI App
            </a>
          )}
        </div>

        {/* Payment Confirmation */}
        <div className="px-6 py-6">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏱️ <strong>Payment expires in: {formatTime(timer)}</strong>
              <br />
              <span className="text-xs text-yellow-700 mt-2 block">
                Please complete payment within the time limit
              </span>
            </p>
          </div>

          {isLoading ? (
            <button
              disabled
              className="w-full bg-gray-400 text-white font-bold py-3 px-4 rounded-lg cursor-not-allowed"
            >
              Processing...
            </button>
          ) : (
            <button
              onClick={handlePaymentConfirmed}
              disabled={paymentAttempts >= maxAttempts || timer <= 0}
              className={`w-full font-bold py-3 px-4 rounded-lg transition text-white text-lg ${
                paymentAttempts >= maxAttempts || timer <= 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 cursor-pointer'
              }`}
            >
              ✅ Payment Completed
            </button>
          )}

          <p className="text-xs text-gray-500 text-center mt-3">
            Attempts: {paymentAttempts}/{maxAttempts}
          </p>
        </div>

        {/* Instructions */}
        <div className="px-6 py-6 bg-blue-50 border-t border-blue-200">
          <h3 className="font-bold text-gray-900 mb-3">📋 Payment Steps:</h3>
          <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
            <li>Scan the QR code with your UPI app</li>
            <li>Verify the amount and shop name</li>
            <li>Complete the payment using your preferred UPI ID</li>
            <li>Click "Payment Completed" button</li>
            <li>Wait for order confirmation</li>
          </ol>
        </div>

        {/* Supported Apps */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600 text-center mb-2">Supported Payment Apps:</p>
          <p className="text-xs text-gray-500 text-center">
            Google Pay • PhonePe • Paytm • WhatsApp Pay • BHIM • Bank UPI Apps
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
