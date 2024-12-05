import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Track connected users and their rooms
const rooms = new Map();
const chatRooms = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // WebRTC signaling
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    // Notify others in room
    socket.to(roomId).emit('user-joined', socket.id);
    
    // Send list of connected peers to new user
    const peers = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);
    socket.emit('peers', peers);
  });

  socket.on('signal', ({ to, signal }) => {
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });

  // Chat functionality
  socket.on('join-chat', ({ roomId, userId }) => {
    socket.join(`chat:${roomId}`);
    
    if (!chatRooms.has(roomId)) {
      chatRooms.set(roomId, new Set());
    }
    chatRooms.get(roomId).add(userId);
  });

  socket.on('send-message', ({ roomId, message }) => {
    io.to(`chat:${roomId}`).emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up WebRTC rooms
    rooms.forEach((peers, roomId) => {
      if (peers.has(socket.id)) {
        peers.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        
        if (peers.size === 0) {
          rooms.delete(roomId);
        }
      }
    });

    // Clean up chat rooms
    chatRooms.forEach((users, roomId) => {
      users.delete(socket.id);
      if (users.size === 0) {
        chatRooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});

export default server;