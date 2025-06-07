import React, { useState } from 'react';
import { Shield, Plus, TrendingUp, Users, DollarSign, CreditCard } from 'lucide-react';
import SecurityDepositOverlay from './SecurityDepositOverlay';

const AgentDashboard = () => {
  const [isDepositOverlayOpen, setIsDepositOverlayOpen] = useState(false);
  
  // Mock data - replace with actual data from your state management
  const agentData = {
    name: "John Doe",
    currentBalance: 75000,
    securityDeposit: 50000,
    totalCommission: 12500,
    activeLoans: 8,
    completedLoans: 24
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Agent Dashboard</h1>
          <p className="text-gray-600">Welcome back, {agentData.name}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-black" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-black mb-1">₹{agentData.currentBalance.toLocaleString()}</h3>
            <p className="text-sm text-gray-600">Current Balance</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <button
                onClick={() => setIsDepositOverlayOpen(true)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Increase Security Deposit"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <h3 className="text-2xl font-bold text-black mb-1">₹{agentData.securityDeposit.toLocaleString()}</h3>
            <p className="text-sm text-gray-600">Security Deposit</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-black" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-black mb-1">₹{agentData.totalCommission.toLocaleString()}</h3>
            <p className="text-sm text-gray-600">Total Commission</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-6 h-6 text-black" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-black mb-1">{agentData.activeLoans}</h3>
            <p className="text-sm text-gray-600">Active Loans</p>
          </div>
        </div>

        {/* Security Deposit Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6 text-black" />
              <h2 className="text-xl font-bold text-black">Security Deposit Management</h2>
            </div>
            <button
              onClick={() => setIsDepositOverlayOpen(true)}
              className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Increase Deposit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Current Deposit</p>
              <p className="text-2xl font-bold text-black">₹{agentData.securityDeposit.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Max Loan Amount</p>
              <p className="text-2xl font-bold text-black">₹{(agentData.securityDeposit * 2).toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Commission Rate</p>
              <p className="text-2xl font-bold text-black">2.5%</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-black mb-2">Benefits of Higher Security Deposit:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Handle larger loan amounts (up to 2x your deposit)</li>
              <li>• Earn higher commission rates on premium loans</li>
              <li>• Build stronger trust with customers</li>
              <li>• Access exclusive agent features and tools</li>
            </ul>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-black mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-black">Loan Approved</p>
                    <p className="text-sm text-gray-600">Customer ID: #12345</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-black">₹25,000</p>
                  <p className="text-sm text-gray-600">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Deposit Overlay */}
      <SecurityDepositOverlay
        isOpen={isDepositOverlayOpen}
        onClose={() => setIsDepositOverlayOpen(false)}
        currentBalance={agentData.currentBalance}
        currentSecurityDeposit={agentData.securityDeposit}
      />
    </div>
  );
};

export default AgentDashboard;