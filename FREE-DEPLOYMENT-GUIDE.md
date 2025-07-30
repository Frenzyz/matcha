# 🆓 FREE WebRTC Server Deployment Guide

## 🎯 **Completely FREE Options**

### **Option 1: Render.com FREE TIER ⭐ RECOMMENDED**

**✅ Pros:** No credit card, permanent free tier, easy setup
**❌ Cons:** Server sleeps after 15 minutes of inactivity

#### Steps:
1. **Sign up** at [render.com](https://render.com) (no credit card needed)
2. **Create New Web Service** → Connect GitHub repository
3. **Settings:**
   ```
   Name: matcha-webrtc
   Build Command: npm install
   Start Command: node webrtc-server.js
   ```
4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=10000
   FRONTEND_URL=https://your-netlify-url.netlify.app
   ```
5. **Deploy** → Get your URL: `https://matcha-webrtc.onrender.com`

---

### **Option 2: Fly.io FREE TIER**

**✅ Pros:** Better performance, doesn't sleep
**❌ Cons:** Requires credit card (but won't charge for free tier)

#### Steps:
1. **Install Fly CLI:** 
   ```bash
   # Windows (using winget)
   winget install flyio.flyctl
   
   # Or download from: https://fly.io/docs/hands-on/install-flyctl/
   ```
2. **Sign up and authenticate:**
   ```bash
   fly auth signup
   fly auth login
   ```
3. **Deploy with our fly.toml:**
   ```bash
   fly launch --no-deploy
   fly deploy
   ```
4. **Get your URL:** `https://matcha-webrtc.fly.dev`

---

## 🏠 **Self-Hosted Options**

### **Option 3: Docker (Local/VPS)**

**✅ Pros:** Complete control, no external dependencies
**❌ Cons:** Requires server management

#### Local Development:
```bash
# Build and run with Docker Compose
docker-compose up -d

# Your server runs at: http://localhost:3001
```

#### VPS Deployment:
```bash
# On your VPS (Ubuntu/Debian)
sudo apt update && sudo apt install docker.io docker-compose

# Clone your repo
git clone https://github.com/your-username/matcha.git
cd matcha

# Deploy
docker-compose up -d

# Access via: http://your-vps-ip:3001
```

---

### **Option 4: Cheap VPS Providers**

**💰 Ultra-cheap options ($2-5/month):**

| Provider | Price | RAM | Storage | Bandwidth |
|----------|-------|-----|---------|-----------|
| **Contabo** | $4.50/mo | 4GB | 200GB | Unlimited |
| **Hetzner** | $4.15/mo | 4GB | 40GB | 20TB |
| **DigitalOcean** | $4/mo | 512MB | 10GB | 500GB |
| **Vultr** | $2.50/mo | 512MB | 10GB | 500GB |

#### VPS Setup Commands:
```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone and setup
git clone https://github.com/your-username/matcha.git
cd matcha
npm install

# 4. Run with PM2 (process manager)
sudo npm install -g pm2
pm2 start webrtc-server.js --name "matcha-webrtc"
pm2 startup
pm2 save

# 5. Setup firewall
sudo ufw allow 3001
sudo ufw enable
```

---

### **Option 5: Oracle Cloud (ALWAYS FREE)**

**✅ Pros:** Generous always-free tier, powerful VMs
**❌ Cons:** Setup can be complex

**Always Free includes:**
- 2 AMD Compute VMs (1GB RAM each)
- 4 ARM Compute VMs (24GB RAM total!)
- 200GB storage

#### Steps:
1. **Sign up** at [oracle.com/cloud](https://oracle.com/cloud)
2. **Create Ubuntu 20.04 VM** (ARM Ampere is more powerful)
3. **Follow VPS setup commands** above
4. **Configure Security List** to allow port 3001

---

## 🔧 **Frontend Configuration**

After deploying your WebRTC server, update your **Netlify environment variables:**

```bash
# In Netlify dashboard → Site Settings → Environment Variables
VITE_WEBRTC_SERVER_URL=https://your-deployed-webrtc-server.com
```

**Examples:**
- Render: `https://matcha-webrtc.onrender.com`
- Fly.io: `https://matcha-webrtc.fly.dev`
- VPS: `https://your-domain.com` or `http://your-vps-ip:3001`

---

## ⚡ **Quick Start Commands**

### **Render.com (Easiest):**
```bash
# 1. Push code to GitHub
git add render.yaml
git commit -m "Add Render config"
git push

# 2. Go to render.com → New Web Service → Connect repo
# 3. Use our render.yaml (auto-detected)
# 4. Deploy!
```

### **Fly.io (Best Performance):**
```bash
# 1. Install Fly CLI and login
fly auth login

# 2. Deploy
fly launch
fly deploy

# Done! Get URL with: fly status
```

### **Docker (Self-Hosted):**
```bash
# 1. Run locally
docker-compose up -d

# 2. Test: curl http://localhost:3001/health
# 3. Update VITE_WEBRTC_SERVER_URL=http://localhost:3001
```

---

## 🆓 **Recommended FREE Setup:**

### **For Testing/Small Usage:**
1. **WebRTC Server:** Render.com (free)
2. **Frontend:** Netlify (free)
3. **Database:** Supabase (free tier)

### **For Production/Heavy Usage:**
1. **WebRTC Server:** Cheap VPS ($2-5/month)
2. **Frontend:** Netlify (free)
3. **Database:** Supabase (free tier with upgrade option)

---

## 🔍 **Troubleshooting**

### **Render Server Sleeping:**
- **Problem:** Free tier sleeps after 15 minutes
- **Solution:** Use Fly.io or add a keep-alive ping
- **Keep-alive:** Set up a cron job to ping your server every 10 minutes

### **VPS Connection Issues:**
- **Check firewall:** `sudo ufw status`
- **Check process:** `pm2 status`
- **Check logs:** `pm2 logs matcha-webrtc`

### **CORS Errors:**
- **Update FRONTEND_URL** environment variable
- **Restart server** after changing environment variables

---

## 🎉 **Success!**

Your WebRTC server is now running **completely FREE** or **self-hosted**! 

Test it by:
1. ✅ Visiting your WebRTC server URL `/health` endpoint
2. ✅ Creating a study room in your Matcha app
3. ✅ Sending chat messages
4. ✅ Testing video calls

**Your group study features will work perfectly without any monthly costs!** 🚀