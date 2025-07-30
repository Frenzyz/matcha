// Simple Socket.io server for WebRTC signaling
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);

// Configure CORS origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
      // Add your production frontend URLs here
      'https://matcha-study.netlify.app',
      'https://your-frontend.vercel.app',
      'https://matchaweb.org' // Add your actual Netlify URL here
    ].filter(Boolean)
  : [
      "http://localhost:5173", 
      "http://localhost:3000",
      "http://localhost:5174"
    ];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store active rooms and participants
const rooms = new Map();
const userRooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-room', (data) => {
    const { roomId, userId, userName } = data;
    
    console.log(`User ${userId} (${userName}) joining room ${roomId}`);
    
    // Leave any existing room
    const existingRoom = userRooms.get(userId);
    if (existingRoom) {
      socket.leave(existingRoom);
      handleUserLeave(existingRoom, userId, socket);
    }

    // Join new room
    socket.join(roomId);
    userRooms.set(userId, roomId);
    
    // Add to room participants
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const roomParticipants = rooms.get(roomId);
    roomParticipants.set(userId, {
      socketId: socket.id,
      userName,
      joinTime: Date.now()
    });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', { userId, userName });
    
    // Send current participants to the new user
    const currentParticipants = Array.from(roomParticipants.entries())
      .filter(([id]) => id !== userId)
      .map(([id, info]) => ({ userId: id, userName: info.userName }));
    
    socket.emit('room-participants', currentParticipants);
    
    console.log(`Room ${roomId} now has ${roomParticipants.size} participants`);
  });

  socket.on('leave-room', (data) => {
    const { roomId, userId } = data;
    console.log(`User ${userId} leaving room ${roomId}`);
    
    socket.leave(roomId);
    handleUserLeave(roomId, userId, socket);
  });

  socket.on('room-message', (data) => {
    const { roomId, userId, message, timestamp } = data;
    console.log(`Message in room ${roomId} from ${userId}: ${message}`);
    
    // Broadcast message to ALL users in the room (including sender)
    io.to(roomId).emit('room-message', {
      userId,
      message,
      timestamp
    });
  });

  socket.on('webrtc-offer', (data) => {
    const { roomId, targetUserId, offer } = data;
    console.log(`WebRTC offer in room ${roomId} to ${targetUserId}`);
    
    io.to(roomId).emit('webrtc-offer', {
      from: data.userId,
      offer,
      targetUserId
    });
  });

  socket.on('webrtc-answer', (data) => {
    const { roomId, targetUserId, answer } = data;
    console.log(`WebRTC answer in room ${roomId} to ${targetUserId}`);
    
    io.to(roomId).emit('webrtc-answer', {
      from: data.userId,
      answer,
      targetUserId
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { roomId, targetUserId, candidate } = data;
    
    io.to(roomId).emit('webrtc-ice-candidate', {
      from: data.userId,
      candidate,
      targetUserId
    });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find and remove user from all rooms
    for (const [userId, roomId] of userRooms.entries()) {
      const roomParticipants = rooms.get(roomId);
      if (roomParticipants) {
        const participant = roomParticipants.get(userId);
        if (participant && participant.socketId === socket.id) {
          handleUserLeave(roomId, userId, socket);
          break;
        }
      }
    }
  });

  function handleUserLeave(roomId, userId, socket) {
    const roomParticipants = rooms.get(roomId);
    if (roomParticipants) {
      roomParticipants.delete(userId);
      userRooms.delete(userId);
      
      // Notify others in the room
      socket.to(roomId).emit('user-left', { userId });
      
      // Clean up empty room
      if (roomParticipants.size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      } else {
        console.log(`Room ${roomId} now has ${roomParticipants.size} participants`);
      }
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
  console.log(`📡 Socket.io enabled with CORS for localhost:5173`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
  });
});