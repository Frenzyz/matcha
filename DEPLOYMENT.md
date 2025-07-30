# 🚀 Matcha Deployment Guide

## Overview

Matcha requires **two separate deployments**:
1. **Frontend** (React/Vite) → Static hosting (Netlify, Vercel, etc.)
2. **WebRTC Server** (Node.js) → Server hosting (Railway, Render, Heroku)

---

## 🔧 Quick Setup

### 1. Deploy WebRTC Server First

**Recommended: Railway.app**

```bash
# 1. Create Railway project at https://railway.app
# 2. Connect your GitHub repository
# 3. Set these environment variables in Railway:
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com

# 4. Set start command: node webrtc-server.js
# 5. Deploy and note your Railway URL (e.g., https://matcha-webrtc-production.up.railway.app)
```

### 2. Deploy Frontend

**Recommended: Netlify**

```bash
# 1. Build the project locally to test
npm run build

# 2. Connect repository to Netlify
# 3. Set build command: npm run build
# 4. Set publish directory: dist
# 5. Set these environment variables in Netlify:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key  
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GROQ_API_KEY=your_groq_api_key
VITE_WEBRTC_SERVER_URL=https://your-railway-webrtc-server.up.railway.app

# 6. Deploy
```

---

## 🎯 Deployment Options

### WebRTC Server Hosting

| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Railway** ⭐ | Easy setup, automatic deployments | Usage-based pricing | $5/month starter |
| **Render** | Free tier available | Slower cold starts on free tier | Free/$7/month |
| **Heroku** | Well-documented | Expensive, requires credit card | $5-7/month |

### Frontend Hosting

| Service | Pros | Cons | Cost |
|---------|------|------|------|
| **Netlify** ⭐ | Excellent for static sites | Limited to frontend only | Free/Pro plans |
| **Vercel** | Great DX, fast CDN | Vendor lock-in | Free/Pro plans |
| **GitHub Pages** | Free, simple | Limited features | Free |

---

## 📋 Step-by-Step Deployment

### Phase 1: WebRTC Server (Railway)

1. **Create Railway Account**: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. **Select Repository**: Connect your Matcha repository
4. **Configure Service**:
   - **Start Command**: `node webrtc-server.js`
   - **Environment Variables**:
     ```
     NODE_ENV=production
     PORT=3001
     FRONTEND_URL=https://your-frontend-url.netlify.app
     ```
5. **Deploy** and copy the generated URL (e.g., `https://matcha-abc123.up.railway.app`)

### Phase 2: Frontend (Netlify)

1. **Create Netlify Account**: https://netlify.com
2. **New Site** → **Import from Git**
3. **Select Repository**: Connect your Matcha repository
4. **Build Settings**:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. **Environment Variables** (Site Settings → Environment Variables):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   VITE_GROQ_API_KEY=your_groq_api_key
   VITE_WEBRTC_SERVER_URL=https://your-railway-url.up.railway.app
   ```
6. **Deploy** and get your site URL

### Phase 3: Update CORS (Important!)

1. **Update Railway Environment**:
   ```
   FRONTEND_URL=https://your-actual-netlify-url.netlify.app
   ```
2. **Redeploy Railway service** to apply CORS changes

---

## ✅ Testing Checklist

### Basic Functionality
- [ ] Site loads without errors
- [ ] User authentication works
- [ ] Calendar features work
- [ ] Settings page accessible

### Group Study Features  
- [ ] Can create study rooms
- [ ] Can join existing rooms
- [ ] Real-time chat works
- [ ] Messages persist after refresh
- [ ] Video call initialization works
- [ ] Camera/microphone permissions requested
- [ ] Multiple users can join same room

### Cross-Device Testing
- [ ] Works on desktop browsers
- [ ] Works on mobile devices
- [ ] WebRTC connections work across networks
- [ ] HTTPS/SSL certificates valid

---

## 🐛 Common Issues & Solutions

### Issue: "WebRTC Server Connection Failed"
**Solution**: Check `VITE_WEBRTC_SERVER_URL` environment variable

### Issue: "CORS Error" 
**Solution**: Add your frontend URL to `FRONTEND_URL` in Railway

### Issue: "Video Call Timeout"
**Solution**: Ensure WebRTC server is deployed and running

### Issue: "Messages Not Persisting"
**Solution**: Check Supabase connection and RLS policies

### Issue: "Railway/Render Server Sleeping"
**Solution**: Upgrade to paid plan or implement keep-alive ping

---

## 🔒 Security Considerations

### Environment Variables
- ✅ Never commit `.env` files
- ✅ Use separate keys for production
- ✅ Rotate API keys regularly
- ✅ Set up Supabase RLS policies

### CORS Configuration
- ✅ Only allow specific frontend origins
- ✅ Don't use wildcard (*) in production
- ✅ Use HTTPS in production

### WebRTC Security
- ✅ Use TURN servers for better connectivity
- ✅ Implement user authentication
- ✅ Rate limit socket connections

---

## 📊 Monitoring & Maintenance

### Logs & Monitoring
- **Railway**: Built-in logs and metrics
- **Netlify**: Function logs and analytics
- **Supabase**: Database and auth logs

### Performance
- Monitor WebRTC server resource usage
- Check frontend bundle size
- Monitor Supabase database performance
- Set up error tracking (Sentry recommended)

### Backups
- Supabase: Automatic backups included
- Code: GitHub repository
- Environment variables: Document securely

---

## 💡 Production Tips

1. **Enable HTTPS everywhere** - Required for WebRTC
2. **Use custom domains** for better branding
3. **Set up CI/CD** for automatic deployments
4. **Monitor costs** especially WebRTC server usage
5. **Implement error tracking** for better debugging
6. **Use environment-specific configurations**
7. **Set up health checks** for WebRTC server

---

## 🆘 Need Help?

1. **Check logs** in Railway/Netlify dashboards
2. **Test locally first** with `npm run dev:full`
3. **Verify environment variables** are set correctly
4. **Check browser console** for frontend errors
5. **Test WebRTC server** with direct requests

---

**🎉 Your Matcha application should now be fully deployed and functional in production!**