import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Lock,
  Map,
  Globe,
} from "lucide-react";
import {
  userValidationSchemaStep1,
  userValidationSchemaStep2,
} from "../yupValidators/validationSchema";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../redux/slices/loadingSlice";
import { BACKEND_URL } from "../utils/constants";
import { SignedIn } from "../redux/slices/isSignInSlice";
import Loader from "./Loader";
import { toast } from "react-toastify";
import Cookies from "js-cookie";
import CityAutocomplete from "./CityAutoComplete";
import { createSocket, getSocket } from "../utils/socket";
import { jwtDecode } from "jwt-decode";
const UserForm = ({ resetRole, setUserFormStep2 }) => {
  const initialValuesStep2 = {
    aadhar: "",
    password: "",
    confirmPassword: "",
    transactionPin: "",
    confirmTransactionPin: "",
  };

  const isLoading = useSelector((state) => state.loading.isLoading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [userData, setUserData] = useState(null);
  const initialValuesStep1 = {
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    phone: userData?.phone || "",
    dob: userData?.dob || "",
    gender: userData?.gender || "",
    city: userData?.city || "",
    state: userData?.state || "",
    country: userData?.country || "",
    zipCode: userData?.zipCode || "",
  };

  const handleSubmitStep1 = async (values) => {
    // console.log("Step 1 submitted with values:", values);
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/user/getUserByPhone`,
        { phoneNumber: values.phone, role: "user" }
      );
      // console.log("checking user phone duplicate",response);
      if (response.data.success) {
        toast.error("User with the phone number already exists.");
        return;
      }
      setStep(2);
      setUserData(values);
      setUserFormStep2(true);
    } catch (error) {
      console.log("error in checking for duplicate phone", error);
    }
  };

  const [step, setStep] = useState(1);

  const handleSubmitStep2 = async (values) => {
    // console.log("Submitting form with values:", values);
    dispatch(showLoader());
    try {
      const allValues = {
        ...userData,
        ...values,
      };
      // console.log("User Data:", userData, values);
      // console.log("All Values to be submitted:", allValues);
      const response = await axios.post(
        `${BACKEND_URL}/api/user/getUserByAadhar`,
        { aadhar: values.aadhar }
      );
      // console.log("response of fetching user by aadhar", response);
      if (response.data.success) {
        toast.error("User already present with the entered aadhar number");
        return;
      }
      // console.log("All Values to be submitted:", allValues);
      // return;
      const result = await axios.post(
        `${BACKEND_URL}/api/user/register`,
        allValues
      );
      // console.log("User created successfully:", result);
      // console.log("Final Values:", allValues);
      const decoded = jwtDecode(result.data.token);
      if (result?.data?.success) {
        toast.success("User created successfully");
        const token = result?.data?.token;
        Cookies.set("token", token, { expires: 1 });
        createSocket(decoded.id);
      }
      const socket = getSocket(decoded.id);
      // console.log("SOCKET CALLED IN USER FORM ",socket);
      socket.emit("newAccountCreated", result?.data?.data);
      socket.emit("newRecentActivity",{...result?.data?.data,type:"User Created"});

      setTimeout(() => {
        dispatch(SignedIn());
        dispatch(hideLoader());
        navigate("/dashboard");
      }, 2000);
      dispatch(showLoader())
      setUserFormStep2(false);
      setUserData(null);
      setStep(1);
    } catch (error) {
      console.error("Error submitting form:", error);
      if (
        error?.response?.data?.message ==
        "Error assinging RuralFin ID. User creation rolled back."
      ) {
        toast.error("Heavy Traffic. Please try again later");
      } else if (
        error?.response?.data?.message ==
        "User with this phone number already exists"
      ) {
        toast.error("User with this phone number already exists");
      } else if (
        error?.response?.data?.message ==
          "Error creating finance record. User creation rolled back." ||
        error?.response?.data?.message == "Error creating user"
      ) {
        toast.error("Error occured. Please try again later");
      }
    } finally {
      dispatch(hideLoader());
    }
  };

  return  (
    <>
      {/* <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    /> */}
      <div className="space-y-6">
        {step == 1 && (
          <Formik
            initialValues={initialValuesStep1}
            validationSchema={userValidationSchemaStep1}
            onSubmit={handleSubmitStep1}
          >
            {({ isSubmitting, values }) => (
              <Form className="space-y-5">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="text"
                        id="firstName"
                        name="firstName"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="First Name"
                      />
                    </div>
                    <ErrorMessage
                      name="firstName"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="text"
                        id="lastName"
                        name="lastName"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="Last Name"
                      />
                    </div>
                    <ErrorMessage
                      name="lastName"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
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
                        id="phone"
                        name="phone"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="10-digit phone number"
                      />
                    </div>
                    <ErrorMessage
                      name="phone"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="dob"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Date of Birth
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="date"
                        id="dob"
                        name="dob"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                      />
                    </div>
                    <ErrorMessage
                      name="dob"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                  <div className="space-y-2 ml-2 pt-4">
                    <label
                      htmlFor="gender"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Gender
                    </label>
                    <div className="flex space-x-4 mt-2">
                      <label className="inline-flex items-center">
                        <Field
                          type="radio"
                          name="gender"
                          value="male"
                          className="form-radio h-5 w-5 text-black border-gray-300 focus:ring-black"
                        />
                        <span className="ml-2 text-gray-700">Male</span>
                      </label>
                      <label className="inline-flex items-center">
                        <Field
                          type="radio"
                          name="gender"
                          value="female"
                          className="form-radio h-5 w-5 text-black border-gray-300 focus:ring-black"
                        />
                        <span className="ml-2 text-gray-700">Female</span>
                      </label>
                      <label className="inline-flex items-center">
                        <Field
                          type="radio"
                          name="gender"
                          value="other"
                          className="form-radio h-5 w-5 text-black border-gray-300 focus:ring-black"
                        />
                        <span className="ml-2 text-gray-700">Other</span>
                      </label>
                    </div>
                    <ErrorMessage
                      name="gender"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>

                  {/* City Autocomplete beside gender */}
                  <CityAutocomplete />
                </div>

                {/* Address Fields below */}
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="relative flex flex-wrap content-start justify-start w-full">
                    <label
                      htmlFor="state"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      State
                    </label>
                    <div className="relative  -left-8 top-9  pl-3 flex items-center pointer-events-none">
                      <Map className="h-5 w-5 text-gray-600" />
                    </div>
                    <Field
                      type="text"
                      name="state"
                      placeholder="State*"
                      disabled
                      className="block w-full cursor-not-allowed pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                    />
                    <ErrorMessage
                      name="state"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>

                  <div className="relative  flex flex-wrap content-start justify-start w-full">
                    <label
                      htmlFor="country"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Country
                    </label>
                    <div className="relative -left-13 top-9 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-5 w-5 text-gray-600" />
                    </div>
                    <Field
                      type="text"
                      name="country"
                      placeholder="Country*"
                      disabled
                      className="block w-full cursor-not-allowed pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                    />
                    <ErrorMessage
                      name="country"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>

                  <div className="relative  flex flex-wrap content-start justify-start w-full">
                    <label
                      htmlFor="zipCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      ZIP Code
                    </label>
                    <div className="relative -left-14 top-9 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-600" />
                    </div>
                    <Field
                      type="text"
                      name="zipCode"
                      placeholder="ZIP Code*"
                      disabled
                      className="block w-full  cursor-not-allowed pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                    />
                    <ErrorMessage
                      name="zipCode"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={resetRole}
                    className="mt-4 sm:mr-4 flex w-30 justify-center items-center md:w-52 px-4 py-3 shadow-lg hover:shadow-black/50 bg-black text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer hover:bg-gray-800 disabled:bg-gray-600"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    className="mt-4 w-30  md:w-52 px-4 py-3 bg-black text-white font-semibold rounded-lg shadow-lg hover:shadow-black/50 hover:bg-gray-800 transition-all duration-300 cursor-pointer  disabled:bg-gray-400"
                    disabled={isSubmitting}
                  >
                    Next
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}

        {step == 2 && (
          <Formik
            initialValues={initialValuesStep2}
            validationSchema={userValidationSchemaStep2}
            onSubmit={handleSubmitStep2}
          >
            {({ isSubmitting, values }) => (
              <Form className="space-y-5">
                <div className="grid md:grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="aadhar"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Aadhar Number
                    </label>
                    <Field
                      type="text"
                      id="aadhar"
                      name="aadhar"
                      className="block w-full px-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                      placeholder="12-digit Aadhar number"
                    />
                    <ErrorMessage
                      name="aadhar"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="transactionPin"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Transaction PIN
                    </label>
                    <Field
                      type="password"
                      id="transactionPin"
                      name="transactionPin"
                      className="block w-full px-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                      placeholder="4-digit Transaction PIN"
                    />
                    <ErrorMessage
                      name="transactionPin"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="confirmTransactionPin"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm Transaction PIN
                    </label>
                    <Field
                      type="password"
                      id="confirmTransactionPin"
                      name="confirmTransactionPin"
                      className="block w-full px-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                      placeholder="4-digit Transaction PIN"
                    />
                    <ErrorMessage
                      name="confirmTransactionPin"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="password"
                        id="password"
                        name="password"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="Create a strong password"
                      />
                    </div>
                    <ErrorMessage
                      name="password"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Confirm Password
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="Confirm your password"
                      />
                    </div>
                    <ErrorMessage
                      name="confirmPassword"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    className="mt-4 w-30  flex justify-center items-center md:w-52 px-4 py-3 shadow-lg hover:shadow-black/50 bg-black text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer hover:bg-gray-800 disabled:bg-gray-600"
                    onClick={() => {
                      setStep(1);
                      setUserFormStep2(false); //tochange the user form size
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="mt-4 w-45  md:w-52 px-4 py-3 bg-black text-white font-semibold rounded-lg shadow-lg hover:shadow-black/50 hover:bg-gray-800 transition-all duration-300 cursor-pointer  disabled:bg-gray-400"
                    disabled={isSubmitting}
                  >
                    Create User Account
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </div>
    </>
  );
};

export default UserForm;
