import { io, type Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

let socket: Socket | null = null;
let lastToken: string | null = null;

export const getSocket = (token?: string | null) => {
    if (!token) return null;
    if (socket && lastToken === token) return socket;

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    lastToken = token;
    socket = io(API_BASE, {
        auth: { token },
        transports: ["websocket"]
    });

    return socket;
};
