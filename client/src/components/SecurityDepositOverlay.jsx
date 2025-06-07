import React, { useState } from 'react';
import { X, Shield, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

const SecurityDepositOverlay = ({ isOpen, onClose, currentBalance = 0, currentSecurityDeposit = 0 }) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      alert(`Successfully deposited ₹${depositAmount}`);
      setDepositAmount('');
      onClose();
    }, 2000);
  };

  const quickAmounts = [5000, 10000, 25000, 50000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-black" />
            <h2 className="text-xl font-bold text-black">Increase Security Deposit</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Current Status */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className="text-2xl font-bold text-black">₹{currentBalance.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Security Deposit</p>
              <p className="text-2xl font-bold text-black">₹{currentSecurityDeposit.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-5 h-5 text-black" />
            <h3 className="font-semibold text-black">Benefits of Higher Security Deposit</h3>
          </div>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0"></span>
              <span>Handle larger loan amounts</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0"></span>
              <span>Earn higher commission rates</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0"></span>
              <span>Build stronger customer trust</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0"></span>
              <span>Access premium agent features</span>
            </li>
          </ul>
        </div>

        {/* Deposit Form */}
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Deposit Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">₹</span>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent no-spinner"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="mb-6">
            <p className="text-sm font-medium text-black mb-3">Quick Select</p>
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setDepositAmount(amount.toString())}
                  className="py-2 px-4 border border-gray-300 rounded-lg hover:bg-black hover:text-white transition-colors text-sm font-medium"
                >
                  ₹{amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent custom-select"
            >
              <option value="upi">UPI Payment</option>
              <option value="netbanking">Net Banking</option>
              <option value="card">Debit/Credit Card</option>
              <option value="wallet">Digital Wallet</option>
            </select>
          </div>

          {/* Security Notice */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Security Notice</p>
                <p>Your deposit is secured and can be withdrawn after completing all pending transactions. Processing may take 24-48 hours.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              disabled={isProcessing || !depositAmount}
              className="flex-1 py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Deposit Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDepositOverlay;