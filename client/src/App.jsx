import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import UserDashboard from "./routes/UserDashboard";
import { useDispatch, useSelector } from "react-redux";
import Loader from "./components/Loader";
import ScrollToTop from "./components/ScrollToTop";
import Header from "./components/Header";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { createSocket, getSocket } from "./utils/socket";
import capitalize from "./utils/capitalize";
import speak from "./utils/speak";
import { socketConnected } from "./redux/slices/socketSlice";
import speakPremium from "./utils/speakPremium";

function App() {
  const isLoading = useSelector((state) => state.loading.isLoading);
  const location = useLocation();
  // const [decoded, setDecoded] = useState(null);
  const isSocketConnected = useSelector(
    (state) => state.socket.isSocketConnected
  );
  const dispatch = useDispatch();

  const token = Cookies.get("token");
  const decoded = useMemo(() => {
    if (token) return jwtDecode(token);
    return null;
  }, [token]);
  // useEffect(() => {
  //   if (token && !isSocketConnected) {
  //     // console.log("Creating socket for userId: from app", decoded?.id,token,isSocketConnected);
  //     createSocket(decoded?.id);
  //     dispatch(socketConnected());
  //   }
  // }, [isSocketConnected, dispatch]);

  useEffect(() => {
    if (!decoded) return;
    const socket = getSocket(decoded.id);
    const handler1 = async (data) => {
      // console.log("User Agent Request Accepted :", data);
      if (data.userId._id == decoded.id) {
        toast.success(
          `Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been accepted by ${capitalize(
            data.agentId.firstName
          )} ${capitalize(data.agentId.lastName)}`
        );
        await speakPremium(
          `Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been accepted by ${capitalize(
            data.agentId.firstName
          )} ${capitalize(data.agentId.lastName)}`
        );
      }
    };

    const handler2 = async (data) => {
      // console.log("User Agent Request Rejected:", data);
      if (data.userId._id == decoded.id) {
        toast.error(
          `Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been rejected by ${capitalize(
            data.agentId.firstName
          )} ${capitalize(data.agentId.lastName)}`
        );
        await speakPremium(
          `Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been rejected by ${capitalize(
            data.agentId.firstName
          )} ${capitalize(data.agentId.lastName)}`
        );
      }
    };
    const handler3 = async (data) => {
      // console.log("request completed deposit");
      if (data?.userId?._id == decoded?.id) {
        toast.info(
          `Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been completed by ${capitalize(
            data.agentId.firstName
          )} ${capitalize(data.agentId.lastName)}`
        );
        toast.success(
          `₹${data.amount - data.commission} has been deposited successfully`
        );
        await speakPremium(`
          Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been completed by ${capitalize(
          data.agentId.firstName
        )}  ${capitalize(data.agentId.lastName)} and ₹${
          data.amount - data.commission
        } has been deposited successfully`);
      }
    };

    const handler4 = async (data) => {
      if (data.userId._id == decoded.id) {
        toast.info(
          `Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been completed by ${capitalize(
            data.agentId.firstName
          )} ${capitalize(data.agentId.lastName)}`
        );
        toast.success(
          `₹${data.amount + data.commission} has been withdrawn successfully`
        );
        await speakPremium(`
          Your ${
            data.conversionType == "cashToERupees"
              ? "cash to eRupees"
              : "eRupees to cash"
          } request has been completed by ${capitalize(
          data.agentId.firstName
        )} ${capitalize(data.agentId.lastName)} and ₹${
          data.amount + data.commission
        } has been withdrawn successfully`);
      }
    };
    if (socket) {
      socket.on("UserAgentRequestAcceptedBackend", handler1);
      socket.on("UserAgentRequestRejectedBackend", handler2);
      socket.on("UserAgentDepositCompletedBackend", handler3);
      socket.on("UserAgentWithdrawCompletedBackend", handler4);
    }

    return () => {
      socket.off("UserAgentWithdrawCompletedBackend", handler4);
      socket.off("UserAgentRequestAcceptedBackend", handler1);
      socket.off("UserAgentRequestRejectedBackend", handler2);
      socket.off("UserAgentDepositCompletedBackend", handler3);
    };
  }, [decoded]);
  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      {location.pathname != "/razorpay" && <Header />}
      <ToastContainer
        className={"z-50"}
        toastClassName="!max-w-[220px] sm:!max-w-[250px] md:!max-w-md !rounded-xl !shadow-lg !text-sm sm:!text-sm md:!text-base"
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export default App;
