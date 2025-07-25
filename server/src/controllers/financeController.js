const Finance = require("../models/financeModel");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const UserToUserTransaction = require("../models/userToUserTransactionModel");
const userToAgentTransaction = require("../models/userToAgentTransactionModel");
const Agent = require("../models/agentModel");
const AgentCommission = require("../models/agentCommissionModel");

const getFinanceById = async (req, res) => {
  try {
    const finance = await Finance.findById(req.params.id);
    if (!finance) {
      return res
        .status(404)
        .json({ message: "Finance record not found", success: false });
    }
    return res
      .status(200)
      .json({ finance, message: "Finance record found", success: true });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching finance record",
      error,
      success: false,
    });
  }
};

const getfinanceByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    // console.log("Fetching finance record for userId:", userId);
    if (!userId) {
      return res
        .status(400)
        .json({ message: "User ID is required", success: false });
    }

    const finance = await Finance.findOne({ userId });
    // console.log("Finance record found:", finance);
    if (!finance) {
      return res
        .status(404)
        .json({ message: "Finance record not found", success: false });
    }
    return res
      .status(200)
      .json({ finance, message: "Finance record found", success: true });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching finance record by userId",
      error,
      success: false,
    });
  }
};

const transferFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { senderId, receiverId, amount, transactionId } = req.body;
    // console.log("Transfer Funds Request:", req.body);
    // console.log("senderId:", senderId);
    // console.log("receiverId:", receiverId);
    // console.log("amount:", amount);
    // console.log("transactionId:", transactionId);

    if (!senderId || !receiverId || !amount || !transactionId) {
      return res
        .status(400)
        .json({ message: "Invalid request", success: false });
    }

    const sender = await User.findById(senderId).session(session);
    const receiver = await User.findById(receiverId).session(session);
    // console.log("sender and receiver found");
    if (!sender || !receiver) {
      return res
        .status(404)
        .json({ message: "User or Receiver not found", success: false });
    }

    const transaction = await UserToUserTransaction.findById(
      transactionId
    ).session(session);
    // console.log("transaction found");
    if (!transaction) {
      return res
        .status(404)
        .json({ message: "Transaction not found", success: false });
    }

    if (transaction.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Transaction is not pending", success: false });
    }
    // console.log("Transaction is pending");
    const senderFinance = await Finance.findOne({ userId: senderId }).session(
      session
    );
    const receiverFinance = await Finance.findOne({
      userId: receiverId,
    }).session(session);

    if (!senderFinance || !receiverFinance) {
      return res
        .status(404)
        .json({ message: "Finance record not found", success: false });
    }

    // Check sufficient balance
    // if (senderFinance.balance < amount) {
    //   return res
    //     .status(400)
    //     .json({ message: "Insufficient balance", success: false });
    // }
    let isDebitSuccessful = false;
    let isCreditSuccessful = false;

    try {
      // Debit senderFinance
      senderFinance.balance -= amount;
      await senderFinance.save({ session });
      isDebitSuccessful = true;
      // console.log("Debit successful");
      // Credit receiverFinance
      receiverFinance.balance += amount;
      await receiverFinance.save({ session });
      isCreditSuccessful = true;
      // console.log("Credit successful");
      // Mark transaction as completed
      transaction.status = "completed";
      await transaction.save({ session });
      // console.log("Transaction marked as completed");
      await session.commitTransaction();
      session.endSession();
      // console.log("Transaction committed successfully");
      return res
        .status(200)
        .json({ success: true, message: "Transaction completed successfully" });
    } catch (innerError) {
      console.error("Inner transaction error:", innerError.message);

      // Rollback Debit
      if (isDebitSuccessful) {
        senderFinance.balance += amount;
        await senderFinance.save({ session });
        // console.log("Debit rolled back");
      }

      // Rollback Credit
      if (isCreditSuccessful) {
        receiverFinance.balance -= amount;
        await receiverFinance.save({ session });
        // console.log("Credit rolled back");
      }

      throw innerError; // Propagate the error to the main catch block
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const depositFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { trId, userId, amount, agentId, commission } = req.body;
    // console.log("Deposit Funds Request:", req.body);
    if (!userId || !amount) {
      return res
        .status(400)
        .json({ message: "Invalid request", success: false });
    }

    const finance = await Finance.findOne({ userId }).session(session);
    // console.log("Finance record found:", finance);
    if (!finance) {
      return res
        .status(404)
        .json({ message: "Finance record not found", success: false });
    }

    finance.balance += amount - commission-commission;
    await finance.save({ session });
    // console.log("Finance balance updated:", finance.balance);

    const agentUpdate = await Agent.findByIdAndUpdate(
      { _id: agentId },
      {
        $inc: {
          balance: commission - amount,
        },
      },
      { new: true, session }
    );
    // console.log("Agent update:", agentUpdate);
    if (!agentUpdate) {
      return res
        .status(404)
        .json({ message: "Agent not found", success: false });
    }

    const transactionUpdate = await userToAgentTransaction.findByIdAndUpdate(
      { _id: trId },
      { status: "completed", transactionDate: new Date() },
      { new: true, session }
    );
    // console.log("Transaction update:", transactionUpdate);
    if (!transactionUpdate) {
      return res
        .status(404)
        .json({ message: "Transaction not found", success: false });
    }
    const transaction = await userToAgentTransaction
      .findById(trId)
      .populate("userId")
      .populate("agentId")
      .session(session);

    const agentCommissionUpdate = await AgentCommission.updateOne(
      {
        agentId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
      {
        $inc: { totalCommissionEarned: commission },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true, session }
    );

    if (!agentCommissionUpdate) {
      return res
        .status(404)
        .json({ message: "Agent commission record not found", success: false });
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      data: transaction,
      success: true,
      message: "Funds deposited successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Deposit failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const withdrawFunds = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, amount, agentId, trId, commission } = req.body;
    // console.log("Withdraw Funds Request:", req.body);
    if (!userId || !amount) {
      return res
        .status(400)
        .json({ message: "Invalid request", success: false });
    }

    const finance = await Finance.findOne({ userId }).session(session);
    // console.log("Finance record found:", finance);
    if (!finance) {
      return res
        .status(404)
        .json({ message: "Finance record not found", success: false });
    }

    if (finance.balance < amount) {
      return res
        .status(400)
        .json({ message: "Insufficient balance", success: false });
    }
    const val = amount + commission;

    finance.balance -= val;
    await finance.save({ session });
    // console.log("Finance balance updated:", finance.balance);

    const agentUpdate = await Agent.findByIdAndUpdate(
      agentId,
      {
        $inc: {
          balance: amount + commission,
          commissionEarned: commission,
        },
      },
      { new: true, session }
    );
    // console.log("Agent update:", agentUpdate);
    if (!agentUpdate) {
      return res
        .status(404)
        .json({ message: "Agent not found", success: false });
    }
    const transactionUpdate = await userToAgentTransaction.findOneAndUpdate(
      { _id: trId },
      { status: "completed", transactionDate: new Date() },
      { new: true, session }
    );
    // console.log("Transaction update:", transactionUpdate);
    const transaction = await userToAgentTransaction
      .findById(trId)
      .populate("userId")
      .populate("agentId")
      .session(session);

    if (!transactionUpdate) {
      return res
        .status(404)
        .json({ message: "Transaction not found", success: false });
    }

    const agentCommissionUpdate = await AgentCommission.updateOne(
      {
        agentId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
      {
        $inc: { totalCommissionEarned: commission },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true, session }
    );
    if (!agentCommissionUpdate) {
      return res
        .status(404)
        .json({ message: "Agent commission record not found", success: false });
    }

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json({
        data: transaction,
        success: true,
        message: "Funds withdrawn successfully",
      });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Withdrawal failed:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getFinanceById,
  transferFunds,
  depositFunds,
  withdrawFunds,
  getfinanceByUserId,
};
