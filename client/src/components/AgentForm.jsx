import React, { useMemo, useState, useEffect } from "react";
import debounce from "lodash.debounce";
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import {
  User,
  Phone,
  Calendar,
  MapPin,
  Lock,
  CreditCardIcon,
  ScanLineIcon,
  Building2,
  ReceiptIndianRupee,
  Globe,
  Map,
} from "lucide-react";
import {
  agentValidationSchemaStep1,
  agentValidationSchemaStep2,
  userValidationSchemaStep1,
} from "../yupValidators/validationSchema";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../redux/slices/loadingSlice";
import axios from "axios";
import { BACKEND_URL } from "../utils/constants";
import { useNavigate } from "react-router-dom";
import Loader from "./Loader";
import { toast } from "react-toastify";
import CityAutocomplete from "./CityAutoComplete";

const AgentForm = ({ resetRole }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector((state) => state.loading.isLoading);
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [agentData, setAgentData] = useState(null);
  const initialValuesStep2 = {
    aadhar: "",
    password: "",
    confirmPassword: "",
    securityDeposit: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  };
  const initialValuesStep1 = {
    firstName: agentData?.firstName || "",
    lastName: agentData?.lastName || "",
    phone: agentData?.phone || "",
    dob: agentData?.dob || "",
    gender: agentData?.gender || "",
    city: agentData?.city || "",
    state: agentData?.state || "",
    country: agentData?.country || "",
    zipCode: agentData?.zipCode || "",
  };
  const handleSubmitStep1 = async (values) => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/agent/getAgentByPhone`,
        { phoneNumber: values.phone, role: "agent" }
      );
      // console.log(response.data, "response in step 1");
      if (response.data.success) {
        toast.error("Agent with this phone number already exists.");
        return;
      }
      setStep(2);
      setAgentData(values);
      // setUserFormStep2(true);
    } catch (error) {
      console.log("error in step 1", error);
    }
  };

  const handleSubmit = async (values, { setErrors }) => {
    const data = { ...values, ...agentData };
    //console.log(data, "data");
    dispatch(showLoader());
    try {
      navigate("/razorpay", {
        state: { data: data },
      });
    } catch (error) {
      console.log("error in creating agent", error);
    } finally {
      dispatch(hideLoader());
    }
  };

  return  (
    <div className="space-y-6">
      {step == 1 && (
        <Formik
          initialValues={initialValuesStep1}
          validationSchema={userValidationSchemaStep1}
          onSubmit={handleSubmitStep1}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-5">
              <div className="grid md:grid-cols-3 gap-4 ">
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
                  <div className="flex space-x-4">
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

              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative flex flex-wrap content-start justify-start w-full">
                  <label
                    htmlFor="state"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    State
                  </label>
                  <div className=" relative -left-8 top-9 pl-3 flex items-center pointer-events-none">
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

                <div className="relative flex flex-wrap content-start justify-start w-full">
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

                <div className="relative flex flex-wrap content-start justify-start w-full">
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
                  className="mt-4 flex justify-center items-center w-52 px-4 py-3 shadow-lg hover:shadow-black/50 bg-gray-400 text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer hover:bg-gray-600 disabled:bg-gray-600"
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="mt-4 w-52 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-black/50 hover:bg-blue-800 transition-all duration-300 cursor-pointer  disabled:bg-gray-400"
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
          validationSchema={agentValidationSchemaStep2}
          onSubmit={handleSubmit}
          validateOnBlur={true}
          validateOnChange={true}
        >
          {({ isSubmitting, values, setFieldValue, setFieldError }) => {
            const fetchIFSCInfo = useMemo(
              () =>
                debounce(async (ifsc) => {
                  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) return;
                  try {
                    const res = await fetch(
                      `https://ifsc.razorpay.com/${ifsc}`
                    );
                    if (res.ok) {
                      const data = await res.json();
                      const formatted = `${data.BANK.toUpperCase()}, ${
                        data.BRANCH
                      }, ${data.CITY}`;
                      setFieldValue("bankName", formatted);
                    } else {
                      setFieldValue("bankName", "");
                    }
                  } catch (e) {
                    console.error("IFSC fetch failedddddddddddddddddd", e);
                    setFieldValue("bankName", "");
                  }
                }, 800),
              [setFieldValue]
            );

            useEffect(() => {
              if (values.ifscCode) {
                fetchIFSCInfo(values.ifscCode.toUpperCase());
              }
            }, [values.ifscCode]);

            return (
              <Form className="space-y-5">
                <div className=" p-0 pt-0 rounded-lg mb-0">
                  <div className="grid md:grid-cols-2 gap-4 mt-0">
                    <div className="space-y-2">
                      <label
                        htmlFor="aadhar"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Aadhar Number
                      </label>
                      <Field
                        type="number"
                        id="aadhar"
                        name="aadhar"
                        className="block w-full px-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 shadow-sm focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none text-gray-900"
                        placeholder="12-digit Aadhar number"
                      />
                      <ErrorMessage
                        name="aadhar"
                        component="div"
                        className="text-sm text-red-600 mt-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="accountNumber"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Account Number
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CreditCardIcon className="h-5 w-5 text-gray-600" />
                        </div>
                        <Field
                          type="number"
                          id="accountNumber"
                          name="accountNumber"
                          className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                          placeholder="Account number"
                        />
                      </div>
                      <ErrorMessage
                        name="accountNumber"
                        component="div"
                        className="text-sm text-red-600 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Banking Information */}
                <div className=" grid grid-cols-3 gap-4 p-0 pt-5 rounded-lg mb-0">
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

                  <div className="space-y-2">
                    <label
                      htmlFor="securityDeposit"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Security Deposit
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ReceiptIndianRupee className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="number"
                        id="securityDeposit"
                        name="securityDeposit"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="Security Deposit"
                      />
                    </div>
                    <ErrorMessage
                      name="securityDeposit"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 p-0 pt-5 rounded-lg mb-5">
                  <div className="space-y-2 ">
                    <label
                      htmlFor="ifscCode"
                      className="block text-sm font-medium text-gray-700"
                    >
                      IFSC Code
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ScanLineIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="text"
                        id="ifscCode"
                        name="ifscCode"
                        className="block w-full pl-10 pr-3 py-3 uppercase placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="IFSC code"
                      />
                    </div>
                    <ErrorMessage
                      name="ifscCode"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>

                  <div className="space-y-2 ">
                    <label
                      htmlFor="bankName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Bank Address
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <Field
                        type="text"
                        id="bankName"
                        name="bankName"
                        className="block w-full pl-10 pr-3 py-3 placeholder:text-gray-600 border-gray-300 border-[1px] bg-gray-50 focus:ring-black focus:border-black rounded-lg transition-all duration-200 outline-none focus:bg-white text-gray-900"
                        placeholder="Bank name"
                        readOnly
                      />
                    </div>
                    <ErrorMessage
                      name="bankName"
                      component="div"
                      className="text-sm text-red-600 mt-1"
                    />
                  </div>
                </div>
                {/* Submit Button */}
                <div className="mt-0 flex justify-between items-center">
                  <button
                    onClick={() => setStep(1)}
                    className="mt-4 flex justify-center items-center w-52 px-4 py-3 shadow-lg hover:shadow-black/50 bg-gray-400 text-white font-semibold rounded-lg transition-all duration-300 cursor-pointer hover:bg-gray-600 disabled:bg-gray-600"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-52 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-black/50 hover:bg-blue-800 transition-all duration-300 cursor-pointer  disabled:bg-gray-400"
                  >
                    Create Agent Account
                  </button>
                </div>
              </Form>
            );
          }}
        </Formik>
      )}
    </div>
  );
};

export default AgentForm;
