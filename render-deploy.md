# Deploying EasyRTC Server to Render

## 🚀 Quick Deploy Steps

### 1. Update Your Render Service

In your Render dashboard for `matcha-0jcn.onrender.com`:

**Build Command:**
```bash
npm install
```

**Start Command:**
```bash
npm run easyrtc-production
```

### 2. Environment Variables

Set these in your Render service settings:

```bash
NODE_ENV=production
FRONTEND_URL=https://matchaweb.org
PORT=10000
IP_SALT=your-secret-salt-here
```

### 3. Deploy

Just push this code to your repository and Render will automatically deploy!

## 🔧 What Changed

- **NEW**: `webrtc-server-easyrtc.js` - Production-ready EasyRTC server
- **NEW**: `easyRTCService.ts` - Client service using Open-EasyRTC
- **NEW**: `VideoCallEasyRTC.tsx` - Component using EasyRTC
- **UPDATED**: `StudyRoom.tsx` - Now uses EasyRTC component
- **UPDATED**: `index.html` - Includes EasyRTC client script

## 🎯 Benefits of EasyRTC

1. **More Stable**: Mature library with better connection handling
2. **Better CORS**: Built-in cross-origin support
3. **Simpler API**: Less complex than PeerJS + Socket.IO
4. **Production Ready**: Used in many production applications
5. **Better Debugging**: Enhanced logging and error handling

## 🧪 Testing

After deployment, test with two users:

1. Open `https://matchaweb.org` in two different browsers
2. Join the same study room
3. Both users should see each other's video feeds
4. Check browser console for EasyRTC connection logs

## 🔍 Troubleshooting

**If video doesn't work:**

1. Check browser console for EasyRTC errors
2. Verify server logs in Render dashboard
3. Ensure CORS is properly configured
4. Test with different browsers (Chrome, Firefox, Safari)

**Common Issues:**

- **"EasyRTC library not loaded"**: Ensure `/easyrtc/easyrtc.js` is accessible
- **CORS errors**: Verify `FRONTEND_URL` environment variable
- **Connection timeouts**: Check network firewall settings

## 📊 Monitoring

Monitor your EasyRTC server through:

- Render dashboard logs
- `/health` endpoint for server status
- `/cors-test` endpoint for CORS verification
- Browser developer tools for client-side debugging