// Open-EasyRTC Server for Matcha Study Platform
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const easyrtc = require('open-easyrtc');

const app = express();
const server = createServer(app);

// Configure CORS for production and development
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
      'https://matcha-study.netlify.app',
      'https://matchaweb.org',
      'https://matchaweb.netlify.app',
      'https://matcha.netlify.app',
      'https://matcha-app.netlify.app',
      'https://frenzyz-matcha.netlify.app',
      'https://matcha-frontend.vercel.app',
      'https://matcha.vercel.app',
      /^https:\/\/.*\.netlify\.app$/,
      /^https:\/\/.*\.vercel\.app$/,
      "http://localhost:5173", 
      "http://localhost:3000",
      "http://localhost:5174"
    ].filter(Boolean)
  : [
      "http://localhost:5173", 
      "http://localhost:3000",
      "http://localhost:5174",
      /^http:\/\/localhost:\d+$/
    ];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    console.log(`🔍 EasyRTC CORS checking origin: ${origin}`);
    
    // Temporary fix for matchaweb.org
    if (origin === 'https://matchaweb.org') {
      console.log(`✅ EasyRTC CORS allowed temporary fix: ${origin}`);
      return callback(null, true);
    }
    
    // Check against all allowed origins
    for (const allowedOrigin of allowedOrigins) {
      if (typeof allowedOrigin === 'string') {
        if (allowedOrigin === origin) {
          console.log(`✅ EasyRTC CORS allowed exact match: ${origin}`);
          return callback(null, true);
        }
      } else if (allowedOrigin instanceof RegExp) {
        if (allowedOrigin.test(origin)) {
          console.log(`✅ EasyRTC CORS allowed regex match: ${origin}`);
          return callback(null, true);
        }
      }
    }
    
    console.log(`❌ EasyRTC CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'X-Requested-With'],
  exposedHeaders: ['Content-Length'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket'],
  pingTimeout: 120000,
  pingInterval: 30000,
  maxHttpBufferSize: 1e6,
  allowEIO3: false,
  upgradeTimeout: 30000,
  cookie: {
    name: 'io',
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production'
  }
});

// Apply CORS middleware to Express
app.use(require('cors')(corsOptions));

// Serve static files for EasyRTC client
app.use(express.static(__dirname + '/node_modules/open-easyrtc/api'));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.json({ 
    origin: req.headers.origin,
    status: 'CORS working',
    timestamp: new Date().toISOString()
  });
});

// Start EasyRTC server
easyrtc.setOption("logLevel", "debug");

// Custom room management for Matcha study sessions
easyrtc.setOption("roomDefaultEnable", true);

// Authentication function for Matcha users
easyrtc.setServerListener("authenticate", function(socket, easyrtcid, msg, socketCallback, callback) {
  const username = msg.msgData.credential && msg.msgData.credential.username;
  const roomId = msg.msgData.credential && msg.msgData.credential.roomId;
  
  console.log(`🔐 EasyRTC Authentication attempt:`, {
    easyrtcid,
    username,
    roomId,
    timestamp: new Date().toISOString()
  });
  
  // For now, allow all connections but log them
  // In production, you'd validate the user credentials here
  if (username && roomId) {
    console.log(`✅ EasyRTC User authenticated: ${username} joining ${roomId}`);
    callback(null);
  } else {
    console.log(`⚠️ EasyRTC User connecting without full credentials`);
    callback(null); // Still allow for now
  }
});

// Room join event handler
easyrtc.setServerListener("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
  console.log(`🚪 EasyRTC User ${connectionObj.getEasyrtcid()} joining room: ${roomName}`);
  
  // Get room participants count
  const room = easyrtc.getRoom(roomName);
  const participantCount = room ? Object.keys(room.getConnectedUsers()).length : 0;
  
  console.log(`📊 Room ${roomName} now has ${participantCount + 1} participants`);
  
  callback(null);
});

// Room leave event handler
easyrtc.setServerListener("roomLeave", function(connectionObj, roomName, roomParameter, callback) {
  console.log(`👋 EasyRTC User ${connectionObj.getEasyrtcid()} leaving room: ${roomName}`);
  
  // Get room participants count
  const room = easyrtc.getRoom(roomName);
  const participantCount = room ? Object.keys(room.getConnectedUsers()).length : 0;
  
  console.log(`📊 Room ${roomName} now has ${participantCount - 1} participants`);
  
  callback(null);
});

// Connection event handler
easyrtc.setServerListener("connection", function(socket, easyrtcid, params, callback) {
  console.log(`🔌 EasyRTC Connection established: ${easyrtcid}`);
  callback(null);
});

// Disconnection event handler
easyrtc.setServerListener("disconnect", function(connectionObj, next) {
  console.log(`🔌 EasyRTC User disconnected: ${connectionObj.getEasyrtcid()}`);
  next();
});

// Initialize EasyRTC
easyrtc.listen(app, io, null, function(err, rtcRef) {
  if (err) {
    console.error('❌ EasyRTC initialization failed:', err);
    process.exit(1);
  }
  
  console.log('🎉 EasyRTC server initialized successfully');
  
  // Start the server
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 EasyRTC server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 WebRTC signaling ready with CORS for:`, allowedOrigins.filter(o => typeof o === 'string'));
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 EasyRTC server shutting down gracefully...');
  server.close(() => {
    console.log('✅ EasyRTC server stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 EasyRTC server interrupted, shutting down...');
  server.close(() => {
    console.log('✅ EasyRTC server stopped');
    process.exit(0);
  });
});