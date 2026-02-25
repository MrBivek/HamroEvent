import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { env } from "./configurations/env.js";
import { ConversationModel } from "./modules/conversations/conversation.model.js";

type SocketAuthPayload = { sub: string; role: string };

let io: Server | null = null;

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: { origin: true, credentials: true },
    });

    io.use((socket, next) => {
        const authToken = socket.handshake.auth?.token;
        const header = socket.handshake.headers.authorization;
        const token =
            typeof authToken === "string"
                ? authToken
                : typeof header === "string" && header.startsWith("Bearer ")
                  ? header.slice("Bearer ".length)
                  : null;

        if (!token) return next(new Error("Unauthorized"));
        try {
            const payload = jwt.verify(token, env.JWT_SECRET) as SocketAuthPayload;
            socket.data.userId = payload.sub;
            socket.data.role = payload.role;
            socket.join(`user:${payload.sub}`);
            next();
        } catch {
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        socket.on("conversation:join", async ({ conversationId }) => {
            try {
                if (!conversationId || !mongoose.isValidObjectId(conversationId)) return;
                const convo = await ConversationModel.findOne({
                    _id: conversationId,
                    participants: socket.data.userId,
                }).lean();
                if (!convo) return;
                socket.join(`conversation:${conversationId}`);
            } catch {
                // ignore
            }
        });

        socket.on("conversation:leave", ({ conversationId }) => {
            if (!conversationId) return;
            socket.leave(`conversation:${conversationId}`);
        });
    });

    return io;
}

export function emitMessage(conversationId: string, message: unknown) {
    if (!io) return;
    io.to(`conversation:${conversationId}`).emit("message:new", message);
}
