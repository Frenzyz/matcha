# Matcha 🍵

An AI-powered academic assistant designed specifically for UNCC students, helping them navigate their academic journey with personalized guidance and support.

![Matcha](https://images.unsplash.com/photo-1542234235-36aae3e5a8c5?auto=format&fit=crop&w=1200&h=400&q=80)

## 🌟 Features

- **AI-Powered Academic Assistant** - Get personalized guidance and support for your academic journey
- **Smart Calendar Integration** - Sync with Google Calendar and manage your schedule efficiently
- **Group Study Spaces** - Create and join virtual study rooms with real-time chat and video calls
- **User Discovery** - Find study partners based on shared interests and courses
- **Friend System** - Add friends, send messages, and organize study sessions
- **Task Management** - Track assignments, deadlines, and events with smart reminders
- **Virtual Parent Mode** - Get caring advice with a touch of dad jokes and puns
- **Time Analysis** - Visualize and optimize your time management
- **Scholarship Tracking** - Find and manage scholarship opportunities
- **Dark Mode** - Comfortable viewing experience day and night

## 🚀 Getting Started

1. **Prerequisites**
   ```bash
   node >= 20.0.0
   npm >= 10.0.0
   ```

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/Frenzyz/matcha.git

   # Install dependencies
   cd matcha
   npm install
   ```

3. **Environment Setup**
   Copy `env.example.txt` to `.env` and fill in your values:
   ```bash
   cp env.example.txt .env
   ```
   
   Required environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   VITE_GROQ_API_KEY=your_groq_api_key
   VITE_WEBRTC_SERVER_URL=http://localhost:3001
   ```

4. **Development**
   ```bash
   # Start frontend only
   npm run dev
   
   # Start both frontend and WebRTC server (for group study features)
   npm run dev:full
   ```

5. **Build**
   ```bash
   npm run build
   ```

## 🚀 Deployment

### Frontend Deployment (Netlify/Vercel/GitHub Pages)

The frontend can be deployed to any static hosting service:

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting service

3. **Set environment variables** in your hosting service dashboard:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key  
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_GROQ_API_KEY=your_groq_api_key
   VITE_WEBRTC_SERVER_URL=https://your-webrtc-server.com
   ```

### WebRTC Server Deployment (Required for Group Study Features)

The WebRTC signaling server must be deployed separately. **Multiple FREE options available!**

#### 🆓 **FREE Options (Recommended):**

1. **Render.com (FREE)** - No credit card required
2. **Fly.io (FREE)** - Better performance, requires credit card but won't charge
3. **Oracle Cloud (FREE)** - Always free tier with generous limits
4. **Self-hosted Docker** - Complete control, any VPS or local server

#### 💰 **Cheap Self-Hosted ($2-5/month):**

1. **Contabo, Hetzner, DigitalOcean** - Ultra-cheap VPS providers
2. **Docker deployment** on any server

#### 📖 **Complete Setup Guide:**

See **[FREE-DEPLOYMENT-GUIDE.md](FREE-DEPLOYMENT-GUIDE.md)** for detailed step-by-step instructions for all free and self-hosted options.

### Complete Deployment Checklist

- [ ] Deploy WebRTC server using **FREE option** (Render.com/Fly.io/Docker/VPS)
- [ ] Get WebRTC server URL (e.g., `https://matcha-webrtc.onrender.com`)
- [ ] Set `VITE_WEBRTC_SERVER_URL` in Netlify environment variables
- [ ] Deploy frontend to Netlify with all environment variables
- [ ] Test group study features in production
- [ ] Verify real-time chat and video calls work across different devices

## 🛠️ Technology Stack

- **Frontend**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Vite
  - Lucide Icons

- **Backend & Database**
  - Supabase
  - PostgreSQL
  - Socket.io (Real-time messaging)
  - Express.js (WebRTC signaling server)

- **Real-time Communication**
  - PeerJS (WebRTC for video calls)
  - Socket.io (Real-time chat)
  - WebRTC (Peer-to-peer communication)

- **AI/ML**
  - Groq API
  - Google Calendar API

- **Authentication**
  - Supabase Auth
  - Google OAuth

## 📱 Key Features

- **Smart Calendar**
  - Google Calendar integration
  - Event management
  - Task tracking
  - Time analysis

- **AI Assistant**
  - Academic guidance
  - Virtual parent mode
  - Personalized recommendations
  - Study tips

- **Group Study Framework**
  - Virtual study rooms with video calls
  - Real-time chat with message persistence
  - User discovery and friend system
  - Profile visibility settings
  - Smart study partner matching

- **Scholarship Management**
  - Scholarship discovery
  - Application tracking
  - Deadline management
  - Requirements tracking

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- UNCC for supporting student innovation
- The open-source community
- All contributors and testers

---

Made with 💚 for UNCC Students
