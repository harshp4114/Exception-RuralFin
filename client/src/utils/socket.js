import { io } from "socket.io-client";
import Cookies from "js-cookie";
let socket = null;

export const createSocket = (userId) => {
  console.trace("called from")
  if (socket) return socket;
  console.log("Creating socket for userId:", userId, Cookies.get("token"));
  socket = io("http://localhost:5000", {
    transports: ["websocket"],
    auth: {
      token: Cookies.get("token"),
    },
  });
  // socket = io("https://exception-ruralfin.onrender.com", {
  //   transports: ["websocket"],
  // auth:{
  //   token: Cookies.get("token"),
  // }
  // });

  socket.on("connect", () => {
    // console.log("Socket connected:", socket.id);
    socket.emit("join", userId);
  });

  return socket;
};

export const getSocket = (userId) => {
  if (socket==null) {
    socket = createSocket(userId);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    // console.log("Socket disconnected:", socket.id);
    socket.disconnect();
    socket = null;
  }
};
