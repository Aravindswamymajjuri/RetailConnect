const QRCode = require('qrcode');

const generateUPIQRCode = async (upiId, shopName, amount) => {
  try {
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(shopName)}&am=${amount}&cu=INR`;
    const qrCode = await QRCode.toDataURL(upiString);
    return {
      qrCode,
      upiString,
      success: true
    };
  } catch (error) {
    console.error('QR Code generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { generateUPIQRCode };
