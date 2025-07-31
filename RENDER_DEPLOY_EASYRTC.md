# 🚀 Deploy EasyRTC to Your Render Instance

## Step 1: Update Your Render Service

In your **Render Dashboard** for `matcha-0jcn.onrender.com`:

### Build Command:
```bash
npm install
```

### Start Command:
```bash
npm run easyrtc-production
```

### Environment Variables:
```bash
NODE_ENV=production
FRONTEND_URL=https://matchaweb.org
PORT=10000
IP_SALT=matcha-secret-salt-2025
```

## Step 2: Deploy the Code

1. **Commit your changes:**
```bash
git add .
git commit -m "Migrate to Open-EasyRTC for stable video calls"
git push origin main
```

2. **Render will automatically deploy** the new EasyRTC server

## Step 3: Verify Deployment

Once deployed, test these endpoints:

- **Health Check**: `https://matcha-0jcn.onrender.com/health`
- **CORS Test**: `https://matcha-0jcn.onrender.com/cors-test` 
- **EasyRTC Script**: `https://matcha-0jcn.onrender.com/easyrtc/easyrtc.js`

## What Changed

### 🔄 **Server Migration**
- **OLD**: `webrtc-server.js` (PeerJS + Socket.IO)
- **NEW**: `webrtc-server-easyrtc.js` (Open-EasyRTC)

### 🎯 **Benefits**
- ✅ **More Stable** - EasyRTC is production-tested
- ✅ **Better CORS** - Built-in cross-origin support
- ✅ **Automatic Signaling** - No custom Socket.IO code needed
- ✅ **Firefox Compatible** - Works across all browsers
- ✅ **Auto Room Management** - Built-in room handling

### 📁 **File Changes**
- `webrtc-server-easyrtc.js` - New production server
- `src/services/easyRTCService.ts` - New client service
- `src/components/group-study/VideoCallEasyRTC.tsx` - New component
- `index.html` - Updated to load EasyRTC script
- `package.json` - Added EasyRTC scripts

## Expected Server Logs

After deployment, you should see:
```
🎉 EasyRTC server initialized successfully
🚀 Matcha EasyRTC server running on port 10000
🌍 Environment: production
📡 WebRTC signaling ready with CORS for: ['https://matchaweb.org']
🔒 Security features enabled: Rate limiting, CORS, Helmet, IP hashing
==> Your service is live 🎉
==> Available at your primary URL https://matcha-0jcn.onrender.com
```

## Testing Video Calls

1. Open `https://matchaweb.org` in **two different browsers**
2. Join the **same study room**
3. Both users should see each other's video feeds
4. Check browser console for connection logs

## Troubleshooting

### If EasyRTC script fails to load:
- Check `/easyrtc/easyrtc.js` endpoint responds with JavaScript
- Verify CORS headers allow your frontend domain

### If video doesn't connect:
- Check browser console for EasyRTC connection logs
- Verify both users are in the same room
- Test with Chrome and Firefox

### If deployment fails:
- Ensure `npm install` includes `open-easyrtc` package
- Check Render build logs for errors
- Verify start command is `npm run easyrtc-production`

## 🎊 Success Criteria

✅ **Server deploys** without errors  
✅ **EasyRTC script loads** from server  
✅ **Two users** can see each other's video  
✅ **No CORS errors** in browser console  
✅ **Stable connections** - no disconnects/reconnects

**Your WebRTC video calls should now be rock-solid stable!** 🎉