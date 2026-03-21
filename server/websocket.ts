import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";

const clients = new Map<number, WebSocket[]>();

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const userIdStr = url.searchParams.get("userId");
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;

    if (!userId || isNaN(userId)) {
      ws.close(1008, "Missing userId");
      return;
    }

    const existing = clients.get(userId) || [];
    existing.push(ws);
    clients.set(userId, existing);
    console.log(`[WS] User ${userId} connected (${existing.length} connections)`);

    ws.on("close", () => {
      const userSockets = clients.get(userId);
      if (userSockets) {
        const filtered = userSockets.filter((s) => s !== ws);
        if (filtered.length === 0) {
          clients.delete(userId);
        } else {
          clients.set(userId, filtered);
        }
      }
      console.log(`[WS] User ${userId} disconnected`);
    });

    ws.on("error", (err: Error) => {
      console.error(`[WS] Error for user ${userId}:`, err.message);
    });
  });

  console.log("[WS] WebSocket server initialized on /ws");
}

export function sendToUser(userId: number, message: unknown): boolean {
  const userSockets = clients.get(userId);
  if (!userSockets || userSockets.length === 0) return false;

  const payload = typeof message === "string" ? message : JSON.stringify(message);
  for (let i = 0; i < userSockets.length; i++) {
    if (userSockets[i].readyState === WebSocket.OPEN) {
      userSockets[i].send(payload);
    }
  }
  return true;
}

export function broadcastToAll(message: unknown): void {
  const payload = typeof message === "string" ? message : JSON.stringify(message);
  const allEntries = Array.from(clients.entries());
  for (let i = 0; i < allEntries.length; i++) {
    const sockets = allEntries[i][1];
    for (let j = 0; j < sockets.length; j++) {
      if (sockets[j].readyState === WebSocket.OPEN) {
        sockets[j].send(payload);
      }
    }
  }
}
