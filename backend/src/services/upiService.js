const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * UPI Payment Service
 * Generates UPI links and QR codes for payments
 */

const upiService = {
  /**
   * Generate UPI link for payment
   * @param {string} upiId - Wholesaler's UPI ID
   * @param {string} shopName - Wholesaler's shop name
   * @param {number} amount - Payment amount
   * @returns {string} UPI link
   */
  generateUPILink: (upiId, shopName, amount) => {
    try {
      if (!upiId || !shopName || !amount) {
        throw new Error('Missing required parameters: upiId, shopName, amount');
      }

      // Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR
      const encodedName = encodeURIComponent(shopName.substring(0, 60)); // UPI has name limit
      const upiLink = `upi://pay?pa=${upiId}&pn=${encodedName}&am=${amount}&cu=INR`;

      logger.debug('UPI Link generated', { upiId, amount });
      return upiLink;
    } catch (error) {
      logger.error('Error generating UPI link', { error: error.message });
      throw error;
    }
  },

  /**
   * Generate QR code for UPI link
   * @param {string} upiLink - UPI link
   * @returns {Promise<string>} QR code as data URL
   */
  generateQRCode: async (upiLink) => {
    try {
      if (!upiLink) {
        throw new Error('UPI link is required');
      }

      logger.debug('Generating QR code');
      const qrCode = await QRCode.toDataURL(upiLink, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      logger.success('QR code generated successfully');
      return qrCode;
    } catch (error) {
      logger.error('Error generating QR code', { error: error.message });
      throw error;
    }
  },

  /**
   * Generate complete payment data
   * @param {string} upiId - Wholesaler's UPI ID
   * @param {string} shopName - Wholesaler's shop name
   * @param {number} amount - Payment amount
   * @returns {Promise<Object>} Payment data with link and QR code
   */
  generatePaymentData: async (upiId, shopName, amount) => {
    try {
      const upiLink = upiService.generateUPILink(upiId, shopName, amount);
      const qrCode = await upiService.generateQRCode(upiLink);

      return {
        upiLink,
        qrCode,
        amount,
        shopName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating payment data', { error: error.message });
      throw error;
    }
  },

  /**
   * Format amount for display
   * @param {number} amount - Amount in rupees
   * @returns {string} Formatted amount
   */
  formatAmount: (amount) => {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
};

module.exports = upiService;
