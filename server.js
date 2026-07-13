import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);

// Configure CORS so your frontend application can talk to this server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Change this to your frontend URL if different
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for incoming chat messages from a user
  socket.on('send_message', (data) => {
    // Broadcast the message instantly to everyone else connected
    io.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
