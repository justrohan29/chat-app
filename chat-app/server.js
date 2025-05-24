const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("joinRoom", async ({ username, roomKey }) => {
    socket.join(roomKey);
    socket.username = username;
    socket.roomKey = roomKey;

    try {
      // Fetch chat history from Firestore for the room, ordered by timestamp ascending
      const messagesSnapshot = await db
        .collection("messages")
        .where("roomKey", "==", roomKey)
        .orderBy("timestamp", "asc")
        .get();

      const chatHistory = [];
      messagesSnapshot.forEach((doc) => {
        chatHistory.push(doc.data());
      });

      socket.emit("chatHistory", chatHistory);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      socket.emit("chatHistory", []);
    }

    socket.emit("joinSuccess");
  });

  socket.on("chatMessage", async ({ message }) => {
    const username = socket.username;
    const roomKey = socket.roomKey;
    if (!username || !roomKey) return;

    const timestamp = new Date();

    const msgData = {
      username,
      message,
      roomKey,
      timestamp
    };

    try {
      // Save message to Firestore
      await db.collection("messages").add(msgData);

      // Broadcast message to everyone in the room
      io.to(roomKey).emit("chatMessage", {
        ...msgData,
        timestamp: timestamp.toISOString()
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
