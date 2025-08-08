const Agent = require("../models/agentModel");
const Finance = require("../models/financeModel");
const User = require("../models/userModel");
const UserToUserTransaction = require("../models/userToUserTransactionModel");
const UserToAgentTransaction = require("../models/userToAgentTransactionModel");
const Admin = require("../models/adminModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const AgentCommission = require("../models/agentCommissionModel");
const SystemSettings = require("../models/systemSettingsModel");
const AdminToAgentTransaction = require("../models/adminToAgentTransactionModel");

const getAdminOverviewCardData = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );
    const totalAgents = await Agent.countDocuments();
    // console.log("total agents", totalAgents);
    const userTotalFinance = await Finance.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalUsers: { $sum: 1 },
        },
      },
    ]);
    // console.log("user total finance", userTotalFinance);
    const agentTotalFinance = await Agent.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalAgents: { $sum: 1 },
        },
      },
    ]);
    // console.log("agent total finance", agentTotalFinance);
    const totalBalance =
      userTotalFinance[0]?.totalBalance + agentTotalFinance[0]?.totalBalance ||
      0;
    // console.log("total balance", totalBalance);
    const totalUsers = userTotalFinance[0]?.totalUsers || 0;

    const thisMonthUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfMonth,
            $lt: startOfNextMonth,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const thisMonthAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfMonth,
            $lt: startOfNextMonth,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const thisMonthTransactions =
      (thisMonthUserTransactions[0]?.totalTransactions || 0) +
      (thisMonthAgentTransactions[0]?.totalTransactions || 0);
    // console.log("this month transactions", thisMonthTransactions);
    return res.status(200).json({
      success: true,
      data: {
        totalAgents,
        totalBalance,
        totalUsers,
        thisMonthTransactions,
        thisMonthUserTransactionsAmount:
          thisMonthUserTransactions[0]?.totalAmount || 0,
        thisMonthAgentTransactionsAmount:
          thisMonthAgentTransactions[0]?.totalAmount || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching admin overview card data:", error);
    res
      .status(500)
      .json({ message: "Error fetching admin overview card data", error });
  }
};

const commissionData = async (req, res) => {
  try {
    const totalCommission = await AgentCommission.aggregate([
      {
        $group: {
          _id: null,
          totalCommissionEarned: { $sum: "$totalCommissionEarned" },
        },
      },
    ]);
    const AllCommissions = await AgentCommission.find();
    return res.status(200).json({
      success: true,
      data: {
        totalCommission: totalCommission[0]?.totalCommissionEarned || 0,
        AllCommissions: AllCommissions,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message, success: false });
  }
};

const createSystemSettings = async (req, res) => {
  try {
    const system = await SystemSettings.create({
      updatedBy: "683c1fa1ba1ad62f40a22554",
    });
    // console.log("system settings created", system);
    return res.status(201).json({
      success: true,
      data: system,
      message: "System settings created successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating system settings", error });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const systemSettings = await SystemSettings.findOne();
    if (!systemSettings) {
      return res.status(404).json({ message: "System settings not found" });
    }
    return res.status(200).json({
      success: true,
      data: systemSettings,
      message: "System settings fetched successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching system settings", error });
  }
};

const getAdminByPhone = async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;
    const admin = await Admin.findOne({ phone: phoneNumber, role: role });
    if (admin) {
      const token = jwt.sign(
        { id: admin._id, phone: admin.phone, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      return res
        .status(200)
        .json({
          message: "admin found",
          success: true,
          data: admin,
          token: token,
        });
    } else {
      return res
        .status(200)
        .json({ message: "admin not found", success: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin", error });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;
    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingAdmin = await Admin.find({ phone });
    if (existingAdmin.length > 0) {
      return res.status(400).json({ message: "Admin already exists" });
    }
    const newAdmin = new Admin({
      firstName,
      lastName,
      phone,
      password: hashedPassword,
    });
    await newAdmin.save();
    return res.status(201).json({
      success: true,
      data: newAdmin,
      message: "Admin created successfully",
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ message: "Error creating admin", error });
  }
};

const checkAdminPassword = async (req, res) => {
  try {
    const { phoneNumber, role, password } = req.body;
    // console.log("admin id", phoneNumber);
    // console.log("role", role);
    // console.log("password", password);

    const admin = await Admin.findOne({ phone: phoneNumber, role: role });
    if (!admin) {
      return res
        .status(404)
        .json({ message: "admin not found", success: false });
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res
        .status(200)
        .json({ message: "Invalid password", success: false });
    }
    return res.status(200).json({
      message: "Password is valid",
      success: true,
      userId: admin._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking admin password", error });
  }
};

const getRecentActivityData = async (req, res) => {
  try {
    const userCreatedActivity = await User.find(
      {},
      "firstName lastName phone createdAt _id"
    ).sort({ createdAt: -1 });
    const agentCreatedActivity = await Agent.find(
      {},
      "firstName lastName phone createdAt _id"
    ).sort({ createdAt: -1 });
    const userToAgentTransactionsActivity = await UserToAgentTransaction.find(
      {},
      "_id userId agentId amount transactionDate status"
    )
      .populate("userId", "firstName _id lastName phone")
      .populate("agentId", "firstName _id lastName phone")
      .sort({ transactionDate: -1 });
    const userActivityRefined = userCreatedActivity.map((user) => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      createdAt: user.createdAt,
      type: "User Created",
    }));
    const agentActivityRefined = agentCreatedActivity.map((agent) => ({
      _id: agent._id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      phone: agent.phone,
      createdAt: agent.createdAt,
      type: "Agent Created",
    }));
    const userToAgentTransactionsActivityRefined =
      userToAgentTransactionsActivity.map((transaction) => ({
        user: transaction.userId
          ? {
              _id: transaction.userId._id,
              firstName: transaction.userId.firstName,
              lastName: transaction.userId.lastName,
              phone: transaction.userId.phone,
            }
          : null,
        agent: transaction.agentId
          ? {
              _id: transaction.agentId._id,
              firstName: transaction.agentId.firstName,
              lastName: transaction.agentId.lastName,
              phone: transaction.agentId.phone,
            }
          : null,
        amount: transaction.amount,
        transactionDate: transaction.transactionDate,
        status: transaction.status,
        type: "User to Agent Transaction",
        _id: transaction._id,
      }));
    const adminToAgentTransactionsActivity = await AdminToAgentTransaction.find(
      {
        status: "completed",
      }
    )
      .populate("agentId")
      .sort({ transactionDate: -1 });
    const allActivities = [
      ...userActivityRefined,
      ...agentActivityRefined,
      ...userToAgentTransactionsActivityRefined,
      ...adminToAgentTransactionsActivity,
    ].sort(
      (a, b) =>
        new Date(b.createdAt || b.transactionDate) -
        new Date(a.createdAt || a.transactionDate)
    );
    return res.status(200).json({
      success: true,
      data: allActivities,
    });
  } catch (error) {
    console.error("Error fetching recent activity data:", error);
    res
      .status(500)
      .json({ message: "Error fetching recent activity data", error });
  }
};

const getAdminId = async () => {
  try {
    const admin = await Admin.findOne({});
    if (!admin) {
      console.error("No admin found in the database");
      return null;
    }
    return admin._id;
  } catch (error) {
    console.error("Error fetching admin ID:", error);
  }
};

const getTransactionVolumeData = async (req, res) => {
  try {
    // TODAY
    const startOfToday = moment().startOf("day").toDate();
    const endOfToday = moment().endOf("day").toDate();

    // THIS WEEK (Sunday to Saturday)
    const startOfWeek = moment().startOf("week").toDate();
    const endOfWeek = moment().endOf("week").toDate();

    // THIS MONTH
    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    const startOfYesterday = moment()
      .subtract(1, "days")
      .startOf("day")
      .toDate();
    const endOfYesterday = moment().subtract(1, "days").endOf("day").toDate();

    const startOfLastWeek = moment()
      .subtract(1, "weeks")
      .startOf("week")
      .toDate();
    const endOfLastWeek = moment().subtract(1, "weeks").endOf("week").toDate();

    const startOfLastMonth = moment()
      .subtract(1, "months")
      .startOf("month")
      .toDate();
    const endOfLastMonth = moment()
      .subtract(1, "months")
      .endOf("month")
      .toDate();

    const todayUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfToday,
            $lt: endOfToday,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const todayAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfToday,
            $lt: endOfToday,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const todayTransactions =
      (todayUserTransactions[0]?.totalAmount || 0) +
      (todayAgentTransactions[0]?.totalAmount || 0);

    const thisWeekUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfWeek,
            $lt: endOfWeek,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const thisWeekAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfWeek,
            $lt: endOfWeek,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const thisWeekTransactions =
      (thisWeekUserTransactions[0]?.totalAmount || 0) +
      (thisWeekAgentTransactions[0]?.totalAmount || 0);

    const thisMonthUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfMonth,
            $lt: endOfMonth,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const thisMonthAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfMonth,
            $lt: endOfMonth,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const thisMonthTransactions =
      (thisMonthUserTransactions[0]?.totalAmount || 0) +
      (thisMonthAgentTransactions[0]?.totalAmount || 0);

    const yesterdayUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfYesterday,
            $lt: endOfYesterday,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const yesterdayAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfYesterday,
            $lt: endOfYesterday,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const yesterdayTransactions =
      (yesterdayUserTransactions[0]?.totalAmount || 0) +
      (yesterdayAgentTransactions[0]?.totalAmount || 0);
    // console.log(
    //       "yesterday user transactions")
    const lastWeekUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfLastWeek,
            $lt: endOfLastWeek,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    const lastWeekAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfLastWeek,
            $lt: endOfLastWeek,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const lastWeekTransactions =
      (lastWeekUserTransactions[0]?.totalAmount || 0) +
      (lastWeekAgentTransactions[0]?.totalAmount || 0);

    const lastMonthUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfLastMonth,
            $lt: endOfLastMonth,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const lastMonthAgentTransactions = await UserToAgentTransaction.aggregate([
      {
        $match: {
          transactionDate: {
            $gte: startOfLastMonth,
            $lt: endOfLastMonth,
          },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const lastMonthTransactions =
      (lastMonthUserTransactions[0]?.totalAmount || 0) +
      (lastMonthAgentTransactions[0]?.totalAmount || 0);
    // console.log(
    //   "last month transactions",
    //   lastMonthTransactions
    // );
    return res.status(200).json({
      success: true,
      data: {
        todayTransactions,
        thisWeekTransactions,
        thisMonthTransactions,
        yesterdayTransactions,
        lastWeekTransactions,
        lastMonthTransactions,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching transaction volume data", error });
  }
};

const updateSystemSettings = async (req, res) => {
  try {
    const {
      maxSingleTransaction,
      maxDailyLimit,
      maxWeeklyLimit,
      minTransactionAmount,
      transactionFee500to999,
      transactionFee1000to4999,
      transactionFee5000to9999,
      transactionFee10000,
      updatedBy,
    } = req.body;

    if (
      maxSingleTransaction === undefined ||
      maxDailyLimit === undefined ||
      maxWeeklyLimit === undefined ||
      minTransactionAmount === undefined ||
      transactionFee500to999 === undefined ||
      transactionFee1000to4999 === undefined ||
      transactionFee5000to9999 === undefined ||
      transactionFee10000 === undefined ||
      !updatedBy
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const updatedSettings = await SystemSettings.findOneAndUpdate(
      {},
      {
        maxSingleTransaction,
        maxDailyLimit,
        maxWeeklyLimit,
        minTransactionAmount,
        transactionFee500to999,
        transactionFee1000to4999,
        transactionFee5000to9999,
        transactionFee10000,
        updatedBy,
      },
      { new: true }
    );

    if (!updatedSettings) {
      return res.status(404).json({ message: "System settings not found" });
    }
    return res.status(200).json({
      success: true,
      data: updatedSettings,
      message: "System settings updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating system settings", error });
  }
};

const getAllUserRelatedTransactions = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const userTransactions = await UserToUserTransaction.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    })
      .populate("senderId", "firstName lastName phone")
      .populate("receiverId", "firstName lastName phone")
      .sort({ transactionDate: -1 });
    const agentTransactions = await UserToAgentTransaction.find({
      userId: userId,
    })
      .populate("userId", "firstName lastName phone")
      .populate("agentId", "firstName lastName phone")
      .sort({ transactionDate: -1 });
    const transactions = [
      ...userTransactions.map((transaction) => ({
        type: "User to User",
        ...transaction.toObject(),
      })),
      ...agentTransactions.map((transaction) => ({
        type: "User to Agent",
        ...transaction.toObject(),
      })),
    ];
    transactions.sort(
      (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
    );

    return res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error("Error fetching user related transactions:", error);
    res
      .status(500)
      .json({ message: "Error fetching user related transactions", error });
  }
};

module.exports = {
  getAdminOverviewCardData,
  createAdmin,
  getSystemSettings,
  getAllUserRelatedTransactions,
  getTransactionVolumeData,
  getAdminByPhone,
  createSystemSettings,
  checkAdminPassword,
  getRecentActivityData,
  commissionData,
  updateSystemSettings,
  getAdminId,
};
