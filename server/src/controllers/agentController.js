const Agent = require("../models/agentModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const findAge = require("../utils/findAgeBackend");
// Get all agents
const getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find();
    res.json({ agents, message: "agents fetched successfully", success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get agent by ID
const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent)
      return res
        .status(404)
        .json({ message: "Agent not found", success: false });
    res.json({ agent, message: "Agent found", success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkAgentPassword = async (req, res) => {
  try {
    const { phoneNumber, role, password } = req.body;
    // console.log("userId", phoneNumber);
    // console.log("role", role);
    // console.log("password", password);

    const agent = await Agent.findOne({ phone: phoneNumber, role: role });
    if (!agent) {
      return res
        .status(404)
        .json({ message: "Agent not found", success: false });
    }
    const isPasswordValid = await bcrypt.compare(password, agent.password);

    if (!isPasswordValid) {
      return res
        .status(200)
        .json({ message: "Invalid password", success: false });
    }
    return res.status(200).json({
      message: "Password is valid",
      success: true,
      userId: agent._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking agent password", error });
  }
};

// Create new agent (sync with frontend AgentForm, use bcrypt & jwt)
const createAgent = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dob,
      gender,
      aadhar,
      city,
      state,
      country,
      zipCode,
      accountNumber,
      password,
      securityDeposit,
      ifscCode,
      bankName,
    } = req.body; // adjust fields as per AgentForm

    const requiredFields = [
      "firstName",
      "lastName",
      "phone",
      "password",
      "dob",
      "city",
      "country",
      "state",
      "zipCode",
      "gender",
      "aadhar",
      "accountNumber",
      "ifscCode",
      "bankName",
      "securityDeposit",
    ];
    // console.log(req.body);
    // Check if all required fields are present
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`,
        });
      }
    }

    // Check if agent already exists
    const existingAgent = await Agent.findOne({ phone });
    if (existingAgent) {
      return res
        .status(400)
        .json({ error: "Profile with this phone already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create agent
    const age = findAge(dob);
    const agent = await Agent.create({
      firstName,
      lastName,
      age,
      dob,
      gender,
      aadhar,
      accountNumber,
      ifscCode,
      bankName,
      securityDeposit: securityDeposit,
      balance: securityDeposit,
      password: hashedPassword,
      phone,
      city,
      state,
      country,
      zipCode,
    });

    if (agent) {
      // Generate JWT
      // console.log("agent token creation", agent._id, agent.phone);
      const token = jwt.sign(
        { id: agent._id, phone: agent.phone,role:"agent" },
        process.env.JWT_SECRET ,
        { expiresIn: "1h" }
      );

      res.status(201).json({
        success: true,
        message: "Agent created successfully",
        agent,
        token,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to create agent",
      });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


const increaseSecurityDeposit = async (req, res) => {
  try{
    const { agentId, amount } = req.body;

    // Validate required fields
    if (!agentId || !amount) {
      return res.status(400).json({
        message: "agentId and amount are required",
        success: false,
      });
    }

    // Find the agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found", success: false });
    }

    // Update the security deposit and balance
    agent.securityDeposit += amount;
    agent.balance += amount;

    // Save the updated agent
    const updatedAgent = await agent.save();

    res.status(200).json({
      message: "Security deposit increased successfully",
      success: true,
      data: updatedAgent,
    });

  }catch(error){
    res.status(500).json({ message: "Error increasing security deposit", error,success: false });
  }
}

const getAgentByPhone = async (req, res) => {
  try {
    // console.log("getAgentByPhone called");
    const { phoneNumber, role } = req.body;
    // console.log("phoneNumber", phoneNumber);
    // console.log("role", role);
    const agent = await Agent.findOne({ phone: phoneNumber, role: role });
    // console.log("agent found", agent);
    if (agent) {
      const token = jwt.sign(
        { id: agent._id, phone: agent.phone, role: "agent" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      return res
        .status(200)
        .json({ message: "Agent found", success: true, data:agent, token: token });
    } else {
      return res
        .status(200)
        .json({ message: "Agent not found", success: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching Agent", error });
  }
};

// Update agent
const updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete agent
const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json({ message: "Agent deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentByPhone,
  increaseSecurityDeposit,
  checkAgentPassword,
};
