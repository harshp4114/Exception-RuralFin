import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  PersonStanding,
  Phone,
  Lock,
  ArrowLeftIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { auth } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import axios from "axios";
import { BACKEND_URL } from "../utils/constants";
import { ToastContainer, toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../redux/slices/loadingSlice";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { SignedIn } from "../redux/slices/isSignInSlice";
import capitalize from "../utils/capitalize";
import { createSocket } from "../utils/socket";
import { socketConnected } from "../redux/slices/socketSlice";
import logoutAutomatically from "../utils/logoutAutomatically";

const Login = () => {
  logoutAutomatically();
  const [firebaseError, setFirebaseError] = useState("");
  // const [isSignup, setIsSignup] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [phoneState, setPhoneState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [whatRole, setWhatRole] = useState("");
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const initialValues = {
    phoneNumber: "",
    role: "",
    password: "",
  };
  const navigate = useNavigate();
  const validationSchemaOTP = Yup.object({
    otpNumber: Yup.string()
      .required("OTP is required")
      .matches(/^\d{6}$/, "Please enter a valid 6-digit OTP"),
  });

  const initialValuesOTP = {
    otpNumber: "",
  };

  // ✅ Setup reCAPTCHA once on component mount
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: (response) => {
            // console.log("reCAPTCHA solved:", response);
          },
          "expired-callback": () => {
            console.warn("reCAPTCHA expired. Please try again.");
          },
        }
      );

      window.recaptchaVerifier.render().then((widgetId) => {
        window.recaptchaWidgetId = widgetId;
      });
    }
  }, []);

  const handleSubmit = async (values, { setSubmitting }) => {
    setFirebaseError("");
    const appVerifier = window.recaptchaVerifier;
    if (!appVerifier) {
      toast.error("reCAPTCHA not initialized. Please refresh the page.");
      setSubmitting(false);
      return;
    }

    // console.log("btn clicked");

    const fullPhone = `+91${values?.phoneNumber}`;
    // console.log("Full Phone Number:", fullPhone);
    setPhoneState(fullPhone);
    try {
      const whichRole = values?.role;
      setWhatRole(whichRole);
      const response = await axios.post(
        `${BACKEND_URL}/api/${whichRole}/get${capitalize(whichRole)}ByPhone`,
        values
      );
      // console.log("Response from server:", response);

      if (!response?.data?.success) {
        toast.error("User not found with given phone number & role");
        setSubmitting(false);
      } else {
        // console.log("in else");

        const checkOnline = await axios.post(`${BACKEND_URL}/api/checkOnline`, {
          accountId: response?.data?.data?._id,
        });
        // console.log("Check Online Response:", checkOnline);
        if (checkOnline?.data?.success) {
          toast.error("This account is already logged in from another device.");
          setSubmitting(false);
          return;
        }

        const response2 = await axios.post(
          `${BACKEND_URL}/api/${whichRole}/checkPassword`,
          values
        );
        // console.log("Response from server for password check:", response2);
        if (!response2?.data?.success) {
          toast.error("Incorrect Password or Phone Number.");
          setSubmitting(false);
          return;
        }
        const token = response?.data?.token;
        Cookies.set("token", token, { expires: 1 });
        // const decodedToken = jwt(token);
        // appVerifier.verify().then(async ()=>{
        // console.log("reCAPTCHA verified");
        const confirmationResult = await signInWithPhoneNumber(
          auth,
          fullPhone,
          appVerifier
        );

        // console.log("Confirmation Result:", confirmationResult);

        // console.log("SMS sent successfully:", confirmationResult);
        window.confirmationResult = confirmationResult;
        // })
        toast.success("OTP sent successfully to " +values?.phoneNumber);
        setIsOtpSent(true);
      }
    } catch (error) {
      console.error("SMS not sent:", error);
      // setFirebaseError(error?.message);
      toast.error("Error sending OTP. Please refresh the page.");
      if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
    }

    setSubmitting(false);
  };

  //otp verification

  const handleOTPResend = async () => {
    setIsSubmitting(true);
    try {
      if (!isRendered) {
        if (window.recaptchaVerifier) {
          // console.log("Clearing previous reCAPTCHA instance...");
          await window.recaptchaVerifier.clear();
        }

        const recaptchaContainer = document.getElementById(
          "recaptcha-container-otp"
        );
        if (recaptchaContainer) {
          recaptchaContainer.innerHTML = "";
        }

        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          "recaptcha-container-otp",
          {
            size: "invisible",
            callback: (response) => {
              // console.log("reCAPTCHA solved:", response);
            },
            "expired-callback": () => {
              console.warn("reCAPTCHA expired. Please try again.");
            },
          }
        );

        const appVerifier = window.recaptchaVerifier;

        // Render the new instance
        await appVerifier.render();
        setIsRendered(true);
      }
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneState,
        appVerifier
      );
      toast.success("Resending OTP...");

      // console.log("Confirmation Result:", confirmationResult);

      // console.log("SMS sent successfully:", confirmationResult);
      window.confirmationResult = confirmationResult;
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Error sending OTP. Please try again.");
    }finally{
      setIsSubmitting(false);
    }
  };

  const handleSubmitOTP = async (values) => {
    setIsSubmitting(true);

    if (!window.confirmationResult) {
      toast.error("OTP session expired. You will be redirected to login page.");
      setTimeout(() => {
        Cookies.remove("token");
        setIsOtpSent(false);
        navigate("/login");
      }, 3000);
      return;
    }

    try {
      const { otpNumber } = values;
      const confirmationResult = window.confirmationResult;

      // Verify OTP
      const result = await confirmationResult.confirm(otpNumber);
      const user = result?.user;

      // console.log("User verified successfully:", user);
      const token = Cookies.get("token");
      dispatch(socketConnected());
      const decoded = jwtDecode(token);
      const socket = createSocket(decoded?.id);
      // console.log("Socket connected:", socket.id);
      toast.success("OTP verified successfully!");
      setTimeout(() => {
        dispatch(SignedIn());
        if (whatRole === "user") {
          navigate("/dashboard");
        } else if (whatRole === "agent") {
          dispatch(SignedIn());
          navigate("/agentDashboard");
        } else {
          navigate("/adminDashboard");
        }
        setIsSubmitting(false);
      }, 2000);
    } catch (error) {
      console.error("Eprror verifying OTP:", error);
      toast.error("Invalid OTP. Please try again.");
    }
  };

  if (isOtpSent) {
    return (
      <div className="min-h-[90vh] bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
        {/* <Header /> */}

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Enter OTP
              </h1>
              <p className="text-gray-600 text-base">
                We've sent a 6-digit OTP to{" "}
                <span className="font-semibold">{phoneState}</span>
              </p>
            </div>

            <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-100 transition-all duration-300 hover:shadow-xl">
              <Formik
                initialValues={initialValuesOTP}
                validationSchema={validationSchemaOTP}
                onSubmit={handleSubmitOTP}
              >
                {({
                  values,
                  handleChange,
                  handleBlur,
                  setFieldValue,
                  setErrors,
                  setTouched,
                }) => (
                  <Form className="space-y-6">
                    <div className="space-y-2">
                      <div
                        onClick={async () => {
                          setIsOtpSent(false);
                          if (window.recaptchaVerifier) {
                            // console.log(
                            //   "Clearing previous reCAPTCHA instance..."
                            // );
                            await window.recaptchaVerifier.clear();
                          }

                          const recaptchaContainer = document.getElementById(
                            "recaptcha-container-otp"
                          );
                          if (recaptchaContainer) {
                            recaptchaContainer.innerHTML = "";
                          }
                          if (Cookies.get("token")) {
                            Cookies.remove("token");
                          }
                          window.confirmationResult = null;
                          window.location.reload();
                        }}
                        className="mb-5 flex hover:text-gray-600 transition-all duration-300 items-center cursor-pointer"
                      >
                        <ArrowLeftIcon size={18} />
                        <p className="font-semibold ml-1 text-lg">Back</p>
                      </div>
                      <label
                        htmlFor="otpNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        OTP
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <Field
                          type="tel"
                          id="otpNumber"
                          name="otpNumber"
                          className="block w-full pl-10 pr-3 py-3 border-gray-300 bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                          placeholder="Enter 6-digit OTP"
                          value={values?.otpNumber}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        />
                      </div>
                      <ErrorMessage
                        name="otpNumber"
                        component="div"
                        className="text-sm text-red-600 mt-1"
                      />
                    </div>

                    <div className="pt-0">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full cursor-pointer disabled:cursor-not-allowed flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-black hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200"
                      >
                        {isSubmitting ? "Verifying..." : "Verify OTP"}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-8 flex justify-center items-center text-center">
                      <p className="text-sm mr-1 text-gray-600">
                        Didn't receive the code?{" "}
                      </p>
                      <div
                        className={` ${isSubmitting?"text-gray-400 cursor-not-allowed":"text-black cursor-pointer"} font-semibold `}
                        onClick={() => {
                          if (!isSubmitting) {
                            setFieldValue("otpNumber", "");
                            setErrors(null);
                            setTouched(false);
                            handleOTPResend();
                          }
                        }}
                      >
                        Resend OTP
                      </div>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
            <div className="recaptcha-wrapper mb-4">
              <div id="recaptcha-container-otp"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[90.8vh] bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 ">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg">
              Sign in with your phone number
            </p>
          </div>

          <div className="recaptcha-wrapper mb-4">
            <div id="recaptcha-container"></div>
          </div>

          <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100 transition-all duration-300 hover:shadow-2xl hover:shadow-black/40">
            <Formik
              initialValues={initialValues}
              // validationSchema={loginValidationSchema}
              onSubmit={handleSubmit}
            >
              {({ values, handleChange, handleBlur, isSubmitting }) => (
                <Form className="space-y-6">
                  <div className="space-y-2">
                    <div>
                      <label
                        htmlFor="phoneNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Phone Number
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-600" />
                        </div>
                        <Field
                          type="tel"
                          id="phoneNumber"
                          name="phoneNumber"
                          className="block mt-2 w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                          placeholder="Enter your 10-digit phone number"
                          value={values?.phoneNumber}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                          maxLength={10}
                          pattern="[0-9]{10}"
                          title="Please enter a valid 10-digit phone number"
                        />
                      </div>
                    </div>
                    <div className="h-full mt-3">
                      <label
                        htmlFor="role"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Role
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <PersonStanding className="h-5 w-5 text-gray-600" />
                        </div>
                        <Field
                          as="select"
                          id="role"
                          name="role"
                          className={`block mt-2 w-full pl-10 pr-10 py-3 text-gray-600  border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white `}
                          value={values?.role}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                          title="Select your role"
                        >
                          <option value="" disabled>
                            Select Role
                          </option>
                          <option value="user">User</option>
                          <option value="agent">Agent</option>
                          <option value="admin">Admin</option>
                        </Field>
                      </div>
                    </div>
                    <div className="h-full mt-3">
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Password
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 left-0 pl-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-600 cursor-pointer" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-600 cursor-pointer" />
                          )}
                        </div>
                        <Field
                          type={`${showPassword ? "text" : "password"}`}
                          id="password"
                          name="password"
                          className="block mt-2 w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                          placeholder="Enter Your Password"
                          value={values?.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          required
                          maxLength={10}
                          title="Please enter your password"
                        />
                      </div>
                    </div>

                    {/* {firebaseError && (
                      <div className="text-sm text-red-600 mt-1">
                        {firebaseError}
                      </div>
                    )} */}
                  </div>

                  <div className="pt-0">
                    <button
                      type="submit"
                      id="submit-btn"
                      disabled={isSubmitting}
                      className="w-full cursor-pointer disabled:cursor-not-allowed flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-black hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200"
                    >
                      {isSubmitting ? "Sending OTP..." : "Continue"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to={"/register"}
                  className="font-medium cursor-pointer text-gray-900 no-underline  hover:text-black transition-colors border-b border-gray-900"
                >
                  Register Now
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{" "}
              <a
                href="/terms"
                className="text-gray-700 hover:text-black transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                className="text-gray-700 hover:text-black transition-colors"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
