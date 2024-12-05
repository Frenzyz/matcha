import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Room management
const rooms = new Map<string, Set<string>>();
const userSockets = new Map<string, string>();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join', ({ roomId, userId }) => {
    socket.join(roomId);
    userSockets.set(socket.id, userId);
    
    // Add user to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)?.add(userId);

    // Send current participants to the new user
    const participants = Array.from(rooms.get(roomId) || []);
    socket.emit('room_users', participants);

    // Notify others about new user
    socket.to(roomId).emit('user_joined', { userId });
    
    console.log(`User ${userId} joined room ${roomId}`);
    console.log(`Room ${roomId} participants:`, participants);
  });

  socket.on('signal', ({ to, from, type, data, roomId }) => {
    console.log(`Signal ${type} from ${from} to ${to} in room ${roomId}`);
    socket.to(roomId).emit('signal', {
      to,
      from,
      type,
      data,
      roomId
    });
  });

  socket.on('leave', ({ roomId, userId }) => {
    handleUserLeave(socket, roomId, userId);
  });

  socket.on('disconnect', () => {
    const userId = userSockets.get(socket.id);
    if (userId) {
      // Find and leave all rooms the user was in
      rooms.forEach((users, roomId) => {
        if (users.has(userId)) {
          handleUserLeave(socket, roomId, userId);
        }
      });
      userSockets.delete(socket.id);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

function handleUserLeave(socket: any, roomId: string, userId: string) {
  socket.leave(roomId);
  rooms.get(roomId)?.delete(userId);
  
  if (rooms.get(roomId)?.size === 0) {
    rooms.delete(roomId);
  }

  socket.to(roomId).emit('user_left', { userId });
  console.log(`User ${userId} left room ${roomId}`);
  
  const remainingParticipants = Array.from(rooms.get(roomId) || []);
  console.log(`Room ${roomId} remaining participants:`, remainingParticipants);
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});

export { httpServer };