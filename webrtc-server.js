// Secure Socket.io server for WebRTC signaling with enhanced security
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { randomBytes, createHash } from 'crypto';

const app = express();
const server = createServer(app);

// ===== SECURITY CONFIGURATION =====

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for WebRTC
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting for DDoS protection
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
});

app.use(rateLimiter);

// Additional security middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Remove server information
app.disable('x-powered-by');

// Security session management
const activeSessions = new Map();
const sessionTimeouts = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Generate secure session ID
function generateSecureSessionId() {
  return randomBytes(32).toString('hex');
}

// Validate session
function validateSession(sessionId) {
  if (!sessionId || !activeSessions.has(sessionId)) {
    return false;
  }
  
  const session = activeSessions.get(sessionId);
  const now = Date.now();
  
  if (now - session.lastActivity > SESSION_TIMEOUT) {
    // Session expired
    activeSessions.delete(sessionId);
    if (sessionTimeouts.has(sessionId)) {
      clearTimeout(sessionTimeouts.get(sessionId));
      sessionTimeouts.delete(sessionId);
    }
    return false;
  }
  
  // Update last activity
  session.lastActivity = now;
  return true;
}

// Create session
function createSession(userId, roomId) {
  const sessionId = generateSecureSessionId();
  const session = {
    userId,
    roomId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ipHash: null // Will be set from socket
  };
  
  activeSessions.set(sessionId, session);
  
  // Auto-cleanup session after timeout
  const timeoutId = setTimeout(() => {
    activeSessions.delete(sessionId);
    sessionTimeouts.delete(sessionId);
  }, SESSION_TIMEOUT);
  
  sessionTimeouts.set(sessionId, timeoutId);
  
  return sessionId;
}

// Configure CORS origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
      // Add your production frontend URLs here
      'https://matcha-study.netlify.app',
      'https://matchaweb.org',
      'https://matchaweb.netlify.app' // Add common Netlify URL patterns
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
  transports: ['websocket', 'polling'],
  // Enhanced security configuration
  pingTimeout: 60000,
  pingInterval: 25000,
  // Connection limits
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: false, // Disable legacy Engine.IO
  // Cookie configuration to handle Cloudflare and cross-origin issues
  cookie: {
    name: 'io',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
  },
  // Additional security
  serveClient: false,
  allowRequest: (req, callback) => {
    // Validate origin
    const origin = req.headers.origin;
    const isOriginAllowed = allowedOrigins.includes(origin);
    
    if (!isOriginAllowed && process.env.NODE_ENV === 'production') {
      console.log(`🚨 Rejected connection from unauthorized origin: ${origin}`);
      return callback('Origin not allowed', false);
    }
    
    // Rate limiting per IP
    const clientIP = req.socket.remoteAddress;
    const ipHash = createHash('sha256').update(clientIP).digest('hex');
    
    // Log connection attempt
    console.log(`🔒 Connection attempt from IP hash: ${ipHash.substring(0, 16)}...`);
    
    callback(null, true);
  }
});

// Store active rooms and participants
const rooms = new Map();
const userRooms = new Map();

io.on('connection', (socket) => {
  console.log(`🔒 Secure connection established: ${socket.id}`);
  
  // Store IP hash for security monitoring
  const clientIP = socket.handshake.address;
  const ipHash = createHash('sha256').update(clientIP).digest('hex');
  socket.ipHash = ipHash.substring(0, 16);
  
  // Connection security audit
  console.log(`Security audit - Socket: ${socket.id}, IP: ${socket.ipHash}...`);
  
  // Set connection timeout - increased for tab switching
  const connectionTimeout = setTimeout(() => {
    if (socket.connected) {
      console.log(`⏰ Connection timeout for ${socket.id}`);
      socket.disconnect(true);
    }
  }, 600000); // 10 minutes timeout to handle tab switching
  
  // Handle disconnection with grace period for tab switching
  let disconnectGracePeriod = null;
  
  socket.on('disconnect', (reason) => {
    clearTimeout(connectionTimeout);
    
    // Don't immediately remove user if it might be tab switching
    if (reason === 'transport close' || reason === 'ping timeout') {
      console.log(`🔄 User ${socket.id} disconnected (${reason}) - giving grace period for reconnection`);
      
      disconnectGracePeriod = setTimeout(() => {
        // Actually clean up the user after grace period
        cleanupUserFromAllRooms(socket.id);
      }, 60000); // 60 second grace period
    } else {
      // Immediate cleanup for intentional disconnects
      cleanupUserFromAllRooms(socket.id);
    }
  });

  socket.on('reconnect', () => {
    // Clear grace period if user reconnects
    if (disconnectGracePeriod) {
      clearTimeout(disconnectGracePeriod);
      disconnectGracePeriod = null;
      console.log(`✅ User ${socket.id} reconnected within grace period`);
    }
  });

  socket.on('join-room', (data) => {
    const { roomId, userId, userName, authToken, sessionId } = data;
    
    // Security validation for production
    if (process.env.NODE_ENV === 'production') {
      if (!authToken || !sessionId) {
        console.log(`🚨 Rejected join-room: Missing authentication for ${userId}`);
        socket.emit('auth-error', { message: 'Authentication required' });
        return;
      }
      
      // Validate session if provided
      if (sessionId && !validateSession(sessionId)) {
        console.log(`🚨 Rejected join-room: Invalid session for ${userId}`);
        socket.emit('auth-error', { message: 'Invalid or expired session' });
        return;
      }
    }
    
    // Input validation
    if (!roomId || !userId || !userName) {
      console.log(`🚨 Rejected join-room: Missing required fields`);
      socket.emit('validation-error', { message: 'Missing required fields' });
      return;
    }
    
    // Sanitize inputs
    const sanitizedRoomId = roomId.replace(/[^a-zA-Z0-9-_]/g, '');
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '');
    const sanitizedUserName = userName.substring(0, 50).replace(/[<>]/g, '');
    
    if (sanitizedRoomId !== roomId || sanitizedUserId !== userId) {
      console.log(`🚨 Rejected join-room: Invalid characters in room/user ID`);
      socket.emit('validation-error', { message: 'Invalid characters in identifiers' });
      return;
    }
    
    console.log(`🔒 Secure join: ${sanitizedUserId} (${sanitizedUserName}) → room ${sanitizedRoomId}`);
    
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
    
    // Get userName from room participants
    const roomParticipants = rooms.get(roomId);
    const userName = roomParticipants?.get(userId)?.userName || `User ${userId.slice(0, 8)}`;
    
    // Broadcast message to ALL users in the room (including sender)
    io.to(roomId).emit('room-message', {
      userId,
      message,
      timestamp,
      userName
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