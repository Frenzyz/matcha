# UNCC AI Personalized Mentorship Application 🎓

A smart academic assistant designed specifically for UNCC students to help manage their academic journey, track assignments, and discover campus events.

![UNCC Mentor](https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&h=400&q=80)

## 📋 Table of Contents
- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Tech Stack](#-tech-stack)
- [Contributing](#-contributing)
- [Support](#-support)

## ✨ Features

- **Smart Academic Planning** - AI-powered schedule management
- **Assignment Tracking** - Integration with Canvas
- **Event Discovery** - Personalized campus event recommendations
- **Real-time Chat** - AI assistant for immediate help
- **Time Analysis** - Visual insights into time management
- **Dark Mode** - Comfortable viewing experience
- **Customizable Themes** - Personalize your experience

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js & npm**
   - Install Node.js (version 18 or higher)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Git**
   - Install Git for version control
   - Verify installation:
     ```bash
     git --version
     ```

3. **Text Editor**
   - We recommend Visual Studio Code
   - Install recommended extensions:
     - ESLint
     - Prettier
     - Tailwind CSS IntelliSense

4. **Firebase Account**
   - Create a Firebase account at [firebase.google.com](https://firebase.google.com)
   - Create a new Firebase project

## 🚀 Installation Guide

Follow these steps carefully to set up your development environment:

### 1. Clone the Repository
```bash
# Clone the repository
git clone https://github.com/Frenzyz/matcha
# Navigate to project directory
cd matcha
```

### 2. Install Dependencies
```bash
# Install project dependencies
npm install
```

### 3. Firebase Setup

1. **Create Firebase Project**
   - Go to Firebase Console
   - Create a new project
   - Enable Authentication
   - Enable Firestore Database

2. **Configure Authentication**
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication

3. **Set Up Firestore**
   - Go to Firestore Database
   - Create database
   - Start in production mode
   - Choose a location closest to your users

### 4. Environment Configuration

1. Create a `.env` file in the root directory:
```bash
touch .env
```

2. Add your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 5. Start Development Server
```bash
# Start the development server
npm run dev
```

### 6. Build for Production
```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## ⚙️ Configuration

### Firebase Security Rules

1. **Firestore Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Email Domain Restriction

The application is configured to only accept `@charlotte.edu` email addresses. This is enforced both on the client and server side.

## 🎮 Usage

1. **First Launch**
   - Navigate to `http://localhost:5173`
   - Sign up with your charlotte.edu email
   - Complete the onboarding process

2. **Authentication**
   - Use your UNCC email address
   - Create a secure password
   - Complete profile information

3. **Customization**
   - Choose your preferred theme color
   - Toggle dark/light mode
   - Set notification preferences

4. **Features**
   - View and manage assignments
   - Chat with AI assistant
   - Track time usage
   - Discover campus events

## 🛠️ Tech Stack

- **Frontend**
  - React 18
  - TypeScript
  - Tailwind CSS
  - Lucide Icons

- **State Management**
  - Zustand
  - React Context

- **Backend Services**
  - Firebase Authentication
  - Firestore Database
  - Firebase Analytics

- **Development Tools**
  - Vite
  - ESLint
  - Prettier

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. Open a Pull Request

## 👥 Support

- Email: support@unccmentor.com
- Join our Slack channel
- GitHub Issues

## 🙏 Acknowledgments

- UNCC for supporting student innovation
- The open-source community
- All contributors and testers

---

Made with ❤️ for UNCC Students