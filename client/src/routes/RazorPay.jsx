import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { BACKEND_URL } from "../utils/constants";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { SignedIn } from "../redux/slices/isSignInSlice";
import { toast } from "react-toastify";
import { hideLoader, showLoader } from "../redux/slices/loadingSlice";
import { jwtDecode } from "jwt-decode";
import { createSocket, getSocket } from "../utils/socket";
import speak from "../utils/speak";
import useAuth from "../utils/useAuth";
import speakPremium from "../utils/speakPremium";

const RazorPay = () => {
  useAuth();
  const location = useLocation();
  const formData = location?.state?.data || null;
  const amount = location?.state?.amount || null;
  const agentData = location?.state?.agentData || null;
  const typeOfPayment = location?.state?.type || "FirstTimeDeposit";
  const agentId = location?.state?.agentId || null;
  const dispatch = useDispatch();
  const [razorPayInstance, setRazorPayInstance] = useState(null);
  const navigate = useNavigate();
  const hasInitiated = useRef(false);

  useEffect(() => {
    if ((formData || amount || typeOfPayment) && !hasInitiated?.current) {
      hasInitiated.current = true;
      dispatch(showLoader());
      setTimeout(() => {
        initiatePayment();
      }, 2000);
    }
  }, [formData]);
  const token = Cookies.get("token");

  const increaseSecurityDeposit = async () => {
    try {
      const response = await axios.put(
        `${BACKEND_URL}/api/agent/increaseSecurityDeposit`,
        {
          agentId,
          amount,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const response2 = await axios.post(
        `${BACKEND_URL}/api/adminToAgentTransaction/`,
        {
          agentId,
          amount,
          conversionType: "cashToERupees",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // console.log("Admin to Agent Transaction Response:", response2.data);
      // console.log("Increase Security Deposit Response:", response.data);
      const socket = getSocket(agentId);
      socket.emit("newRecentActivity", {
        ...response2?.data?.transaction,
        type: "adminToAgent",
      });
      if (razorPayInstance) {
        // console.log("Closing Razorpay instance after deposit");
        razorPayInstance.close();
      }
      dispatch(hideLoader());
      toast.success("Security deposit increased successfully by ₹" + amount);
      await speakPremium(
        `Security deposit increased successfully by ₹${amount}`
      );
      navigate("/agentDashboard");
      window.location.reload();
    } catch (error) {
      console.error("Error increasing security deposit:", error);
      toast.error("Failed to increase security deposit");
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const initiatePayment = async () => {
    // console.log("Initiating payment with formData:", formData);
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      return;
    }

    try {
      // console.log(
      //   "Creating order on backend with amount:",
      //   formData?.securityDeposit
      // );
      const orderRes = await axios.post(
        `${BACKEND_URL}/api/razorpay/create-order`,
        {
          amount: formData?.securityDeposit || amount,
        }
      );

      const { order_id } = orderRes?.data;

      const options = {
        key: "rzp_test_rcMN4fKyf8uvKF",
        amount: formData?.securityDeposit || amount,
        currency: "INR",
        name: "RuralFin",
        description: "Agent Registration Security Deposit Fee",
        order_id: order_id,
        theme: {
          color: "#000000",
        },
        handler: async (response) => {
          // console.log("Payment Success:", response);

          const verifyRes = await axios.post(
            `${BACKEND_URL}/api/razorpay/verify`,
            response
          );
          // console.log("Payment Verification Response:", verifyRes.data);
          if (verifyRes?.data?.success) {
            // console.log(
            //   "Payment verified successfully: calling toast and create agent"
            // );
            if (typeOfPayment === "FirstTimeDeposit") {
              createAgent();
            } else {
              increaseSecurityDeposit();
            }
            // toast.success("Payment verified successfully");
          } else {
            alert("Payment verification failed");
          }
        },
        prefill: {
          name:
            formData?.firstName + formData?.lastName ||
            agentData?.firstName + agentData?.lastName ||
            "",
          email: formData?.email || agentData?.email || "",
          contact: formData?.phone || agentData?.phone || "",
        },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            // console.log("Razorpay modal closed manually.");
            dispatch(hideLoader());
          },
        },
      };
      const razor = new window.Razorpay(options);
      setRazorPayInstance(razor);
      razor.open();
      // dispatch(hideLoader());
    } catch (error) {
      console.error("Payment initiation error:", error);
      alert("Payment failed to initiate");
    }
  };

  const createAgent = async () => {
    try {
      // console.log("Creating agent with formData:", formData);
      const response = await axios.post(
        `${BACKEND_URL}/api/agent/register`,
        formData
      );
      const response2 = await axios.post(
        `${BACKEND_URL}/api/adminToAgentTransaction/`,
        {
          agentId: response?.data?.agent?._id,
          amount: formData?.securityDeposit,
          conversionType: "cashToERupees",
        }
      );
      // console.log("Admin to Agent Transaction Response in create agent:", response2.data);
      const token = response?.data?.token;
      const decoded = jwtDecode(token);
      Cookies.set("token", token, { expires: 1 });
      createSocket(decoded?.id);
      const socket = getSocket(decoded?.id);
      // console.log("new user socket send",response?.data?.agent)
      socket.emit("newAccountCreated", response?.data?.agent);
      socket.emit("newRecentActivity", {
        ...response?.data?.agent,
        type: "Agent Created",
      });
      socket.emit("newRecentActivity", {
        ...response2?.data?.transaction,
        type: "adminToAgent",
      });
      // console.log("Token received:", token);
      toast.success("Agent account created successfully");
      // razor.close();
      // console.log("Closing Razorpay instance");
      dispatch(SignedIn());
      if (razorPayInstance) {
        razorPayInstance.close();
      }
      dispatch(hideLoader());
      navigate("/agentDashboard");
      window.location.reload();
    } catch (error) {
      console.error("Error creating agent:", error);
    }
  };

  return (
    <div className="text-center bg-black text-white text-3xl font-bold h-[100vh] w-full flex items-center justify-center"></div>
  );
};

export default RazorPay;
