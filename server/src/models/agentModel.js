const mongoose = require("mongoose");
const { Schema } = mongoose;

// Agent Model
const agentSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    age: { type: Number, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    aadhar: { type: String, required: true },
    accountNumber: { type: String, required: true },
    password: { type: String, required: true },
    securityDeposit: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    ifscCode: { type: String, required: true },
    bankName: { type: String, required: true },
    transactionCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    role: {
      type: String,
      enum: ["agent"],
      default: "agent",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", agentSchema);
