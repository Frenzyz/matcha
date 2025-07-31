// Production EasyRTC Server for Render deployment with security features
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { randomBytes, createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const easyrtc = require('open-easyrtc');

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
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.log(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.round(rateLimiter.windowMs / 1000)
    });
  }
});

app.use('/socket.io/', rateLimiter);

// IP hashing for privacy
function hashIP(ip) {
  return createHash('sha256').update(ip + process.env.IP_SALT || 'matcha-salt').digest('hex').substring(0, 16);
}

// Generate secure session ID
function generateSecureSessionId() {
  return randomBytes(32).toString('hex');
}

// ===== CORS CONFIGURATION =====

console.log(`🌍 Environment: NODE_ENV = ${process.env.NODE_ENV}`);
console.log(`🔗 Frontend URL: FRONTEND_URL = ${process.env.FRONTEND_URL}`);

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

console.log(`📋 Configured CORS allowed origins:`, allowedOrigins.filter(o => typeof o === 'string'));

// Enhanced CORS configuration with origin validation
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
    console.log(`📋 Available allowed origins:`, allowedOrigins.filter(o => typeof o === 'string'));
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "OPTIONS"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'User-Agent', 'X-Requested-With'],
  exposedHeaders: ['Content-Length'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Additional explicit CORS headers for problematic browsers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin === 'https://matchaweb.org')) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, X-Requested-With');
  }
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ===== SOCKET.IO CONFIGURATION =====

// Initialize Socket.IO with CORS and security
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

// ===== EASYRTC CONFIGURATION =====

// Set EasyRTC options
easyrtc.setOption("logLevel", "debug");
easyrtc.setOption("roomDefaultEnable", true);

// Custom room management for Matcha study sessions
easyrtc.setOption("roomAutoCreateEnable", true);

// ===== EASYRTC EVENT HANDLERS =====

// Authentication function for Matcha users
easyrtc.setServerListener("authenticate", function(socket, easyrtcid, msg, socketCallback, callback) {
  const username = msg.msgData.credential && msg.msgData.credential.username;
  const roomId = msg.msgData.credential && msg.msgData.credential.roomId;
  const userId = msg.msgData.credential && msg.msgData.credential.userId;
  
  console.log(`🔐 EasyRTC Authentication attempt:`, {
    easyrtcid,
    username,
    roomId,
    userId,
    ip: hashIP(socket.handshake.address),
    timestamp: new Date().toISOString()
  });
  
  // For production, you'd validate the user credentials here
  if (username && roomId) {
    console.log(`✅ EasyRTC User authenticated: ${username} joining ${roomId}`);
    callback(null);
  } else {
    console.log(`⚠️ EasyRTC User connecting without full credentials, allowing anyway`);
    callback(null); // Still allow for now
  }
});

// Room join event handler
easyrtc.setServerListener("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
  const easyrtcid = connectionObj.getEasyrtcid();
  console.log(`🚪 EasyRTC User ${easyrtcid} joining room: ${roomName}`);
  
  // Get room participants count
  const room = easyrtc.getRoom(roomName);
  const participantCount = room ? Object.keys(room.getConnectedUsers()).length : 0;
  
  console.log(`📊 Room ${roomName} now has ${participantCount + 1} participants`);
  
  // Security audit for room joins
  console.log(`🔒 Security audit - Room join: ${easyrtcid} → ${roomName}, IP: ${hashIP(connectionObj.getSocket().handshake.address)}`);
  
  callback(null);
});

// Room leave event handler
easyrtc.setServerListener("roomLeave", function(connectionObj, roomName, roomParameter, callback) {
  const easyrtcid = connectionObj.getEasyrtcid();
  console.log(`👋 EasyRTC User ${easyrtcid} leaving room: ${roomName}`);
  
  // Get room participants count
  const room = easyrtc.getRoom(roomName);
  const participantCount = room ? Object.keys(room.getConnectedUsers()).length : 0;
  
  console.log(`📊 Room ${roomName} now has ${Math.max(0, participantCount - 1)} participants`);
  
  callback(null);
});

// Connection event handler with security audit
easyrtc.setServerListener("connection", function(socket, easyrtcid, params, callback) {
  const ipHash = hashIP(socket.handshake.address);
  const userAgent = socket.handshake.headers['user-agent'];
  const isFirefox = userAgent && userAgent.toLowerCase().includes('firefox');
  
  console.log(`🔒 EasyRTC Connection attempt from IP hash: ${ipHash}... (${isFirefox ? 'Firefox' : 'Other'})`);
  console.log(`🔒 EasyRTC Secure connection established: ${easyrtcid}`);
  console.log(`Security audit - Socket: ${easyrtcid}, IP: ${ipHash}...`);
  
  callback(null);
});

// Disconnection event handler
easyrtc.setServerListener("disconnect", function(connectionObj, next) {
  const easyrtcid = connectionObj.getEasyrtcid();
  console.log(`🔌 EasyRTC User disconnected: ${easyrtcid}`);
  next();
});

// Message filtering for security
easyrtc.setServerListener("msgTypeDefault", function(connectionObj, msg, socketCallback, callback) {
  // Log all messages for security audit
  const easyrtcid = connectionObj.getEasyrtcid();
  console.log(`📝 EasyRTC Message from ${easyrtcid}: ${msg.msgType}`);
  
  // You can add message filtering/validation here
  callback(null, msg);
});

// ===== EXPRESS ROUTES =====

// Serve EasyRTC client files
app.use('/easyrtc', express.static('node_modules/open-easyrtc/api'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'EasyRTC Server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// CORS test endpoint
app.get('/cors-test', (req, res) => {
  res.json({ 
    origin: req.headers.origin,
    status: 'CORS working for EasyRTC',
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent']
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Matcha EasyRTC Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      corsTest: '/cors-test',
      easyrtc: '/easyrtc/'
    }
  });
});

// ===== SERVER STARTUP =====

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
    console.log(`🚀 Matcha EasyRTC server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 WebRTC signaling ready with CORS for:`, allowedOrigins.filter(o => typeof o === 'string'));
    console.log(`🔒 Security features enabled: Rate limiting, CORS, Helmet, IP hashing`);
    console.log(`==> Your service is live 🎉`);
    console.log(`==> Available at your primary URL https://matcha-0jcn.onrender.com`);
  });
});

// ===== GRACEFUL SHUTDOWN =====

// Graceful shutdown handlers
const gracefulShutdown = () => {
  console.log('📴 EasyRTC server shutting down gracefully...');
  server.close(() => {
    console.log('✅ EasyRTC server stopped');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});