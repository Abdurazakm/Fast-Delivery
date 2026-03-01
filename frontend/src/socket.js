import { io } from "socket.io-client";
import API from "./api";

let socket;

function resolveSocketUrl() {
  const apiBase = API.defaults.baseURL;

  if (!apiBase) {
    return window.location.origin;
  }

  try {
    return new URL(apiBase).origin;
  } catch (err) {
    return apiBase.replace(/\/api\/?$/, "");
  }
}

export function getSocket() {
  if (!socket) {
    socket = io(resolveSocketUrl(), {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
  }

  return socket;
}
