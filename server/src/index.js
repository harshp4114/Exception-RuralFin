require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const connectMongo = require("./config");
const userRoutes = require("./routes/userRoutes");
const agentRoutes = require("./routes/agentRoutes");
const userToUserTransactionRoutes = require("./routes/userToUserTransactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const financeRoutes = require("./routes/financeRoutes");
const agentToUserTransactionRoutes = require("./routes/userToAgentTransactionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { createServer } = require("http");
const { Server } = require("socket.io");
const {
  createNotification,
  createAdminNotificationForAll,
} = require("./controllers/notificationController");
const notificationRoutes = require("./routes/notificationRoutes");
const razorpayRoutes = require("./routes/razorpayRoutes");
const agentCommissionRoutes = require("./routes/agentCommissionRoutes");
const adminToAgentTransactionRoutes = require("./routes/adminToAgentTransactionRoutes");
const adminCommissionRoutes = require("./routes/adminCommissionRoutes");
const { getAdminId } = require("./controllers/adminController");
const {
  increaseAgentCommission,
} = require("./controllers/agentCommissionsController");
const ttsHandler = require("./utils/tts");
const {
  increaseAdminCommission,
} = require("./controllers/adminCommissionController");

const app = express();
connectMongo();
const httpServer = createServer(app);

const corsOptions = {
  // origin: "https://ruralfin.netlify.app",
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

const io = new Server(httpServer, {
  cors: corsOptions,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

let onlineUsers = {};

io.use(async (socket, next) => {
  console.log("Socket connection attempt:", socket.handshake.auth.token);
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    // Verify token (use your OLRE JWT secret)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    if (!decoded || !decoded.id) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.authenticated = true;
    console.log("Socket authenticated:", decoded.id, socket.authenticated);
    next();
  } catch (err) {
    console.error("Socket authentication error:", err);
    next(new Error("Authentication error"));
  }
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on("join", (userId) => {
    // if (!socket.authenticated) return;

    if (!userId) return console.error("User ID is required to join the socket");
    onlineUsers[userId] = socket.id;
    io.emit("activeUsers", Object.keys(onlineUsers));
    console.log(`User ${userId} connected with socket id: ${socket.id}`);
    // console.log("Online users after connection:", onlineUsers);
  });

  socket.on("money-sent-by-sender", async (data) => {
    if (!socket.authenticated) return;
    const receiverId = data.transaction.receiverId._id;
    const senderId = data.transaction.senderId._id;
    // console.log("Money sent by sender:", receiverId, senderId);

    const receiverSocketId = onlineUsers[receiverId];
    const senderSocketId = onlineUsers[senderId];
    const adminId = await getAdminId();
    const adminSocketId = onlineUsers[adminId];
    if (adminSocketId) {
      io.to(adminSocketId).emit("newTransactionMade", data);
    }
    if (receiverSocketId || senderSocketId) {
      io.to([receiverSocketId, senderSocketId]).emit(
        "money-received-by-receiver",
        data
      );
      if (receiverSocketId) {
        const notificationObj = await createNotification({
          userType: "User",
          userId: data.transaction.receiverId._id,
          message: `You have received ₹${data.transaction.amount} from ${data.transaction.senderId.firstName} ${data.transaction.senderId.lastName}`,
          type: "transaction",
          read: false,
        });

        // console.log("notificationObj", notificationObj);
        const socketToSend = receiverSocketId;
        // console.log("notifiaction socket called", socketToSend);
        if (socketToSend) {
          io.to(socketToSend).emit("newNotificationSend", [
            notificationObj.data,
          ]);
          // console.log("io sent newNotificationSend");
        }
      }
    } else {
      console.error("Receiver or Sender ID is missing in the transaction data");
      createNotification({
        userType: "User",
        userId: data.transaction.receiverId._id,
        message: `You have received ₹${data.transaction.amount} from ${data.transaction.senderId.firstName} ${data.transaction.senderId.lastName}`,
        type: "transaction",
        read: false,
      });
    }
  });

  socket.on("newUserAgentTransactionRequest", async (data) => {
    if (!socket.authenticated) return;
    const userIdSocketId = onlineUsers[data.transaction.userId._id];
    const agentIdSocketId = onlineUsers[data.transaction.agentId._id];
    if (agentIdSocketId && userIdSocketId) {
      io.to([userIdSocketId, agentIdSocketId]).emit(
        "newUserAgentTransactionSent",
        data
      );
      if (agentIdSocketId) {
        const notificationObj = await createNotification({
          userType: "Agent",
          userId: data.transaction.agentId._id,
          message: `You have received a new ${
            data.conversionType == "cashToERupees" ? "deposit" : "withdrawal"
          } request of ₹${data.transaction.amount} from ${
            data.transaction.userId.firstName
          } ${data.transaction.userId.lastName}`,
          type: "transaction",
          read: false,
        });

        // console.log("notificationObj", notificationObj);
        const socketToSend = agentIdSocketId;
        // console.log("notifiaction socket called", socketToSend);
        if (socketToSend) {
          io.to(socketToSend).emit("newNotificationSend", [
            notificationObj.data,
          ]);
          // console.log("io sent newNotificationSend");
        }
      }
    } else {
      console.error("User or Agent ID is missing in the transaction data");
      createNotification({
        userType: "Agent",
        userId: data.transaction.agentId._id,
        message: `You have received a new ${
          data.conversionType == "cashToERupees" ? "deposit" : "withdrawal"
        } request of ₹${data.transaction.amount} from ${
          data.transaction.userId.firstName
        } ${data.transaction.userId.lastName}`,
        type: "transaction",
        read: false,
      });
    }
  });

  socket.on("UserAgentRequestAccepted", async (data) => {
    if (!socket.authenticated) return;
    // console.log("User Agent Request Accepted:");
    const userIdSocketId = onlineUsers[data.userId._id];
    // console.log(
    // "User Agent Request Accepted:",
    // userIdSocketId
    // );
    if (userIdSocketId) {
      io.to(userIdSocketId).emit("UserAgentRequestAcceptedBackend", data);
      // console.log("io sent");
      const notificationObj = await createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been accepted by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });
      // console.log("notificationObj", notificationObj);
      const socketToSend = userIdSocketId;
      // console.log("notifiaction socket called", socketToSend);
      if (socketToSend) {
        io.to(socketToSend).emit("newNotificationSend", [notificationObj.data]);
        // console.log("io sent newNotificationSend");
      }
    } else {
      console.error("User ID is missing in the request data");
      createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been accepted by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });
    }
  });

  socket.on("UserAgentRequestRejected", async (data) => {
    if (!socket.authenticated) return;
    const userIdSocketId = onlineUsers[data.userId._id];
    // console.log("User Agent Request Rejected:", data);
    if (userIdSocketId) {
      io.to(userIdSocketId).emit("UserAgentRequestRejectedBackend", data);
      const notificationObj = await createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been rejected by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });
      // console.log("notificationObj", notificationObj);
      const socketToSend = onlineUsers[data.userId._id];
      // console.log("notifiaction socket called", socketToSend);
      if (socketToSend) {
        io.to(socketToSend).emit("newNotificationSend", [notificationObj.data]);
        // console.log("io sent newNotificationSend");
      }
    } else {
      console.error("User ID is missing in the request data");
      createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been rejected by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });
    }
  });
  socket.on("UserAgentDepositCompleted", async (data) => {
    if (!socket.authenticated) return;
    // console.log("in UserAgentDepositCompleted");
    const userIdSocketId = onlineUsers[data.userId._id];
    const agentSocketId = onlineUsers[data.agentId._id];
    // console.log("User Agent Deposit Completed:", userIdSocketId);
    const adminId = await getAdminId();
    const adminIdSocketId = onlineUsers[adminId];
    const agentId = data.agentId._id;
    // const updatedCommission = await increaseAgentCommission({
    //   agentId,
    //   amount: (data.commission)/2,
    // });
    if (adminIdSocketId) {
      // console.log("Admin ID:", adminId, "Agent ID:", agentId);
      const adminCommission = await increaseAdminCommission({
        adminId,
        commission: data.commission / 2,
      });
      // console.log("Updated Commission:", "Admin Commission:", adminCommission);
      io.to(adminIdSocketId).emit("increaseAgentCommission", {
        transaction: data,
        adminCommission,
      });
      // console.log("io sent newTransactionMade to admin");
    }
    if (agentSocketId) {
      io.to(agentSocketId).emit("UserAgentDepositCompletedBackend", {
        transaction: data,
      });
    }
    if (userIdSocketId) {
      io.to(userIdSocketId).emit("UserAgentDepositCompletedBackend", data);
      // console.log("io emitted for data", data);
      const notificationObj = await createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been completed by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });

      const notificationObj2 = await createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `₹${
          data.amount - data.commission
        } has been deposited successfully`,
        type: "transaction",
        read: false,
      });

      // console.log("notificationObj", notificationObj, notificationObj2);
      const socketToSend = userIdSocketId;
      // console.log("notifiaction socket called", socketToSend);
      if (socketToSend) {
        io.to(socketToSend).emit("newNotificationSend", [
          notificationObj.data,
          notificationObj2.data,
        ]);
        // console.log("io sent newNotificationSend");
      }
    } else {
      console.error("User ID is missing in the deposit data");
      createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been completed by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });
      createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `₹${
          data.amount - data.commission
        } has been deposited successfully`,
        type: "transaction",
        read: false,
      });
    }
    // console.log("io sent UserAgentDepositCompletedBackend");
  });

  socket.on("UserAgentWithdrawCompleted", async (data) => {
    if (!socket.authenticated) return;
    const userIdSocketId = onlineUsers[data.userId._id];
    // console.log("User Agent Withdraw Completed:", userIdSocketId);
    const adminId = await getAdminId();
    const adminIdSocketId = onlineUsers[adminId];
    if (adminIdSocketId) {
      const agentId = data.agentId._id;
      // console.log("Admin ID:", adminId, "Agent ID:", agentId);
      // const updatedCommission = await increaseAgentCommission({
      //   agentId,
      //   amount: (data.commission)/2,
      // });
      const adminCommission = await increaseAdminCommission({
        adminId,
        commission: data.commission / 2,
      });
      // console.log("Updated Commission:", "Admin Commission:", adminCommission);
      io.to(adminIdSocketId).emit("increaseAgentCommission", {
        transaction: data,
        adminCommission,
      });
      // console.log("io sent newTransactionMade to admin");
    }
    if (userIdSocketId) {
      io.to(userIdSocketId).emit("UserAgentWithdrawCompletedBackend", data);
      const notificationObj = await createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been completed by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });

      const notificationObj2 = await createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `₹${
          data.amount + data.commission
        } has been withdrawn successfully`,
        type: "transaction",
        read: false,
      });

      // console.log("notificationObj", notificationObj, notificationObj2);
      const socketToSend = userIdSocketId;
      // console.log("notifiaction socket called", socketToSend);
      if (socketToSend) {
        io.to(socketToSend).emit("newNotificationSend", [
          notificationObj.data,
          notificationObj2.data,
        ]);
        // console.log("io sent newNotificationSend");
      }
    } else {
      console.error("User ID is missing in the withdraw data");
      createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `Your ${
          data.conversionType == "cashToERupees"
            ? "cash to eRupees"
            : "eRupees to cash"
        } request of ₹${data.amount} has been completed by ${
          data.agentId.firstName
        } ${data.agentId.lastName}`,
        type: "transaction",
        read: false,
      });
      createNotification({
        userType: "User",
        userId: data.userId._id,
        message: `₹${
          data.amount + data.commission
        } has been withdrawn successfully`,
        type: "transaction",
        read: false,
      });
    }
    // console.log("io sent UserAgentWithdrawCompletedBackend");
  });

  socket.on("updateSystemSettings", async (data) => {
    if (!socket.authenticated) return;
    // console.log("updateSystemSettings data:", data);

    const notifications = await createAdminNotificationForAll();
    io.emit("updateSystemSettingsBackend", notifications);
    // console.log("socket io sent updateSystemSettingsBackend");
  });

  socket.on("newRecentActivity", async (data) => {
    if (!socket.authenticated) return;
    // console.log("newRecentActivity data:", data);
    const adminId = await getAdminId();
    const adminIdSocketId = onlineUsers[adminId];
    if (adminIdSocketId) {
      io.to(adminIdSocketId).emit("newRecentActivityBackend", data);
      // console.log("io sent newRecentActivityBackend to admin");
    }
  });

  socket.on("newAccountCreated", async (data) => {
    if (!socket.authenticated) return;
    const adminId = await getAdminId();
    const adminIdSocketId = onlineUsers[adminId];
    // console.log(
    //   "Admin ID: in admin create user socket",
    //   adminId,
    //   adminIdSocketId,
    //   data
    // );
    if (adminIdSocketId) {
      io.to(adminIdSocketId).emit("newAccountCreatedBackend", data);
    } else {
      console.error("Admin Socket is missing in the new account data");
    }
  });

  socket.on("disconnect", () => {
    if (!socket.authenticated) return;
    // console.log(`Client disconnected: ${socket.id}`);
    for (const userId in onlineUsers) {
      if (onlineUsers[userId] === socket.id) {
        delete onlineUsers[userId];
        io.emit("activeUsers", Object.keys(onlineUsers));
        // console.log(`User ${userId} disconnected`);
        break;
      }
    }
    // console.log("Online users after disconnect:", onlineUsers);
  });
});

app.get("/api/getActiveUsers", async (req, res) => {
  try {
    const activeUsers = Object.keys(onlineUsers);
    // console.log("Active users:", activeUsers);
    res.status(200).json({
      data: activeUsers,
      message: "Active users fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching active users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.options("*", cors(corsOptions));
app.use("/api/razorpay", razorpayRoutes);
app.use("/api/user", userRoutes);
app.use("/api/agent", agentRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/userToUserTransaction", userToUserTransactionRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/agentToUserTransaction", agentToUserTransactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/agentCommission", agentCommissionRoutes);
app.use("/api/adminToAgentTransaction", adminToAgentTransactionRoutes);
app.use("/api/adminCommission", adminCommissionRoutes);
app.post("/tts", ttsHandler);

const serverStartTime = new Date();

app.use("/api/checkOnline", async (req, res) => {
  try {
    const { accountId } = req.body;
    // console.log("Checking online status for accountId:", accountId,onlineUsers);
    if (!accountId) {
      return res
        .status(400)
        .json({ message: "Account ID is required", success: false });
    }
    const socketId = onlineUsers[accountId];
    if (socketId) {
      return res.status(200).json({ message: "User is online", success: true });
    } else {
      return res
        .status(200)
        .json({ message: "User is offline", success: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error", success: false });
  }
});

app.use("/api/uptime", (req, res) => {
  res.json({ startTime: serverStartTime });
});

httpServer.listen(5000, () => {
  try {
    console.log(`App running on Port 5000`);
  } catch (error) {
    console.log(`error in running`, error);
  }
});
