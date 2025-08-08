const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { allocateRuralFinId } = require("../utils/allocateRuralFinId");
const Finance = require("../models/financeModel");
const UserToUserTransaction = require("../models/userToUserTransactionModel");
const AgentToUserTransaction = require("../models/userToAgentTransactionModel");
const moment = require("moment");
const findAge = require("../utils/findAgeBackend");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found", success: false });
    }
    res.status(200).json({
      data: users,
      message: "Users fetched successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

const getAllUsersWithFinanceData = async (req, res) => {
  try {
    const users = await User.find().populate("finance");
    if (!users || users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found", success: false });
    }
    res.status(200).json({
      data: users,
      message: "Users fetched successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  try {
    // console.log("req.params.id", req.params.id);
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    res.status(200).json({
      message: "User found",
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error });
  }
};

const getFavouritesByUserId = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log("Fetching favourites for user ID:", id);
    const userFavoruites = await User.findById(id).populate("favourites");
    if (!userFavoruites) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    // console.log("User favourites found:", userFavoruites);
    return res.status(200).json({
      message: "Favourites fetched successfully",
      success: true,
      favourites: userFavoruites.favourites,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching favourites", error });
  }
};

const checkUserPassword = async (req, res) => {
  try {
    const { phoneNumber, role, password } = req.body;
    // console.log("userId", phoneNumber);
    // console.log("role", role);
    // console.log("password", password);

    const user = await User.findOne({ phone: phoneNumber, role: role });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(200)
        .json({ message: "Invalid password", success: false });
    }
    return res.status(200).json({
      message: "Password is valid",
      success: true,
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking user password", error });
  }
};

const getUserByPhone = async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;
    // console.log("phoneNumber", phoneNumber);
    // console.log("role", role);
    const user = await User.findOne({ phone: phoneNumber, role: role });
    // console.log("user found", user);
    if (user) {
      const token = jwt.sign(
        { id: user._id, phone: user.phone, role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      return res
        .status(200)
        .json({
          message: "User found",
          success: true,
          data: user,
          token: token,
        });
    } else {
      return res
        .status(200)
        .json({ message: "User not found", success: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error });
  }
};

const getUserByAadhar = async (req, res) => {
  try {
    const { aadhar } = req.body;
    const user = await User.findOne({ aadhar });
    if (user) {
      return res.status(200).json({ success: true, data: user });
    }
    return res.status(200).json({ success: false });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "error fetching user by aadhar",
        error: error,
      });
  }
};

const checkValidRuralFinId = async (req, res) => {
  try {
    const id = req.params.id;
    // console.log("id", id);
    const user = await User.findOne({ ruralFinId: id });
    // console.log("user", user);
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false, found: false });
    }
    return res
      .status(200)
      .json({ message: "User found", success: true, found: true });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error });
  }
};

const addFavouriteToUserById = async (req, res) => {
  try {
    const { userId, ruralFinId } = req.body;
    // console.log("userId", userId);
    // console.log("ruralFinId", ruralFinId);

    if (!userId) {
      return res
        .status(400)
        .json({ message: "User ID is required", success: false });
    }

    const user = await User.findById(userId);
    // console.log("user", user);

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const favouriteUser = await User.findOne({ ruralFinId: ruralFinId });
    if (!favouriteUser) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    const userFavourites = user.favourites || [];
    // console.log("userFavourites", userFavourites);

    const isAlreadyFavourite = userFavourites.some((id) =>
      id.equals(favouriteUser._id)
    );

    if (isAlreadyFavourite) {
      return res
        .status(400)
        .json({ message: "User already in favourites", success: false });
    }

    user.favourites.push(favouriteUser._id);
    const updatedUser = await user.save();

    // console.log("updatedUser", updatedUser);

    return res.status(200).json({
      message: "User updated successfully",
      success: true,
      updatedUser,
    });
  } catch (error) {
    console.error("Error adding favourite:", error);
    return res.status(500).json({ message: "Error adding favourite", error });
  }
};

// Create a new user
const createUser = async (req, res) => {
  try {
    const requiredFields = [
      "firstName",
      "lastName",
      "phone",
      "password",
      "dob",
      "city",
      "state",
      "country",
      "zipCode",
      "gender",
      "aadhar",
    ];

    // console.log("req.body", req.body);

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    const existingUser = await User.findOne({ phone: req.body.phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this phone number already exists",
      });
    }

    const age = findAge(req.body.dob);

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const hashedPin = await bcrypt.hash(req.body.transactionPin, 10);
    const user = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      age: age,
      dob: req.body.dob,
      gender: req.body.gender,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      zipCode: req.body.zipCode,
      phone: req.body.phone,
      aadhar: req.body.aadhar,
      password: hashedPassword,
      lastTransactionDate: null,
      transactionPin: hashedPin,
    });

    try {
      // Attempt allocation
      await allocateRuralFinId(user._id);
    } catch (err) {
      console.error("First attempt to allocate ruralFinId failed:", err);
      // Retry after random delay (non-blocking retry pattern)
      const randomDelay = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
      setTimeout(async () => {
        try {
          await allocateRuralFinId(user._id);
          // console.log("Retry allocation success");
        } catch (retryErr) {
          console.error("Retry allocation still failed:", retryErr);
          await User.findByIdAndDelete(user._id);
          await Finance.deleteOne({ userId: user._id });
          return res.status(400).json({
            success: false,
            message: "Error assinging RuralFin ID. User creation rolled back.",
          });
        }
      }, randomDelay);
    }

    // Always await finance creation properly
    const finance = await Finance.create({
      userId: user._id,
      transactions: [],
    });

    if (!finance) {
      // Clean up the user if finance fails to create
      await User.findByIdAndDelete(user._id);
      return res.status(400).json({
        success: false,
        message: "Error creating finance record. User creation rolled back.",
      });
    }

    user.finance = finance._id;
    await user.save();

    const populatedUser = await User.findById(user._id).populate("finance");

    const token = jwt.sign(
      { id: user._id, phone: user.phone,role: "user" },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: populatedUser,
      token: token,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(400).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};

// Update a user by ID
const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: "Error updating user", error });
  }
};

// Delete a user by ID
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

const getAllTransactionsAmountsByUserId = async (req, res) => {
  try {
    const start = moment().startOf("week").add(1, "days");
    const end = moment().endOf("week").add(1, "days");
    const { id } = req.params;
    const userTodayTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          senderId: id,
          status: "completed",
          transactionDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    if (!userTodayTransactions || userTodayTransactions.length === 0) {
      userTodayTransactions.push({ totalAmount: 0 });
    }
    const thisWeekUserTransactions = await UserToUserTransaction.aggregate([
      {
        $match: {
          senderId: id,
          status: "completed",
          transactionDate: {
            $gte: start.toDate(),
            $lt: end.toDate(),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    if (!thisWeekUserTransactions || thisWeekUserTransactions.length === 0) {
      thisWeekUserTransactions.push({ totalAmount: 0 });
    }
    return res.status(200).json({
      data: {
        today: userTodayTransactions[0].totalAmount,
        thisWeek: thisWeekUserTransactions[0].totalAmount,
      },
      message: "User transactions found",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error });
  }
};

const getAllAgentTransactionsAmountsByUserId = async (req, res) => {
  try {
    const start = moment().startOf("week").add(1, "days");
    const end = moment().endOf("week").add(1, "days");
    const { id } = req.params;
    const userTodayTransactions = await AgentToUserTransaction.aggregate([
      {
        $match: {
          userId: id,
          status: "completed",
          transactionDate: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    if (!userTodayTransactions || userTodayTransactions.length === 0) {
      userTodayTransactions.push({ totalAmount: 0 });
    }
    const thisWeekUserTransactions = await AgentToUserTransaction.aggregate([
      {
        $match: {
          userId: id,
          status: "completed",
          transactionDate: {
            $gte: start.toDate(),
            $lt: end.toDate(),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    if (!thisWeekUserTransactions || thisWeekUserTransactions.length === 0) {
      thisWeekUserTransactions.push({ totalAmount: 0 });
    }
    return res.status(200).json({
      data: {
        today: userTodayTransactions[0].totalAmount,
        thisWeek: thisWeekUserTransactions[0].totalAmount,
      },
      message: "User transactions found",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching transactions", error });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getAllUsersWithFinanceData,
  createUser,
  getAllTransactionsAmountsByUserId,
  updateUser,
  deleteUser,
  getUserByPhone,
  getAllAgentTransactionsAmountsByUserId,
  checkValidRuralFinId,
  addFavouriteToUserById,
  getFavouritesByUserId,
  checkUserPassword,
  getUserByAadhar,
};
