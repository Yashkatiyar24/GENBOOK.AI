<div align="center">
  <h1>🏥 GENBOOK.AI</h1>
  <p><strong>Intelligent Healthcare Appointment Management System</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase" alt="Supabase">
    <img src="https://img.shields.io/badge/Vite-Build-purple?style=for-the-badge&logo=vite" alt="Vite">
  </p>

  <p>
    <img src="https://img.shields.io/badge/Status-Active-success?style=flat-square" alt="Status">
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/Version-1.0.0-orange?style=flat-square" alt="Version">
  </p>
</div>

---

## 📋 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🗄️ Database Setup](#️-database-setup)
- [🎨 UI Components](#-ui-components)
- [🔐 Authentication](#-authentication)
- [📱 Screenshots](#-screenshots)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 Overview

**GENBOOK.AI** is a modern, intelligent healthcare appointment management system built with React and TypeScript. It provides a seamless experience for patients to book appointments, manage their profiles, and interact with healthcare providers through an intuitive web interface.

### 🌟 Key Highlights

- **🎨 Modern UI/UX**: Clean, responsive design with dark theme
- **🔒 Secure Authentication**: Powered by Supabase Auth
- **📱 Mobile-First**: Responsive design that works on all devices
- **⚡ Real-time Updates**: Live data synchronization
- **🛡️ Row-Level Security**: Database-level security policies
- **🎯 TypeScript**: Full type safety throughout the application

---

## ✨ Features

### 👤 User Management
- **🔐 Secure Authentication** - Sign up, sign in, and password recovery
- **👤 Profile Management** - Complete user profile with medical information
- **👨‍👩‍👧‍👦 Family Management** - Add and manage family members
- **🔔 Notification Settings** - Customizable email, SMS, and push notifications

### 📅 Appointment System
- **📋 Appointment Booking** - Easy-to-use appointment scheduling
- **📊 Dashboard** - Overview of upcoming and past appointments
- **📱 Contact Management** - Store and manage healthcare provider contacts
- **🕒 History Tracking** - Complete appointment history

### 🎨 User Experience
- **🌙 Dark Theme** - Modern dark UI with cyan accents
- **📱 Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **⚡ Fast Loading** - Optimized performance with Vite
- **🎯 Intuitive Navigation** - Easy-to-use sidebar navigation

---

## 🛠️ Tech Stack

### Frontend
- **⚛️ React 18.2** - Modern React with hooks
- **📘 TypeScript 5.0** - Type-safe development
- **⚡ Vite** - Lightning-fast build tool
- **🎨 Tailwind CSS** - Utility-first CSS framework
- **🎭 Lucide React** - Beautiful SVG icons

### Backend & Database
- **🟢 Supabase** - Backend-as-a-Service
- **🐘 PostgreSQL** - Robust relational database
- **🔐 Supabase Auth** - Authentication and user management
- **🛡️ Row Level Security** - Database-level security

### Development Tools
- **📦 npm** - Package management
- **🔧 ESLint** - Code linting
- **🎯 TypeScript** - Static type checking

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Supabase Account** ([Sign up here](https://supabase.com))

### ⚡ One-Minute Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/genbook-ai.git
cd genbook-ai

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

🎉 **That's it!** Your app will be running at `http://localhost:5174`

---

## 📦 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/genbook-ai.git
cd genbook-ai
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Environment Setup

```bash
# Copy the example environment file
cp .env.example .env
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# App Configuration (Optional)
VITE_APP_NAME=GENBOOK.AI
VITE_APP_VERSION=1.0.0
```

### 🔧 Getting Supabase Credentials

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Fill in project details
   - Wait for setup completion (2-3 minutes)

2. **Get Your Credentials**
   - Navigate to **Settings** → **API**
   - Copy the **Project URL**
   - Copy the **Anon Public Key**

---

## 🗄️ Database Setup

### Automated Setup

Run the provided SQL scripts in your Supabase SQL Editor:

```sql
-- 1. First, run the main database setup
-- Copy and paste contents of: setup-new-database.sql

-- 2. Then, add the settings tables
-- Copy and paste contents of: settings-tables-fix.sql
```

### 📊 Database Schema

#### Core Tables
- **`appointments`** - Appointment bookings
- **`contacts`** - Healthcare provider contacts
- **`user_settings`** - User preferences and notifications
- **`user_profiles`** - Detailed user profiles
- **`family_members`** - Family member information

#### 🛡️ Security Features
- **Row Level Security (RLS)** enabled on all tables
- **User-specific data access** policies
- **Automatic timestamp** triggers
- **Data validation** constraints

## 🎨 UI Components

### 🏠 Dashboard
- **📊 Overview Cards** - Quick stats and metrics
- **📅 Upcoming Appointments** - Next appointments at a glance
- **🔔 Notifications** - Important alerts and reminders

### 👤 Profile Management
- **📝 Personal Information** - Name, contact details, address
- **🏥 Medical Information** - Conditions, allergies, insurance
- **👨‍👩‍👧‍👦 Family Members** - Manage family profiles
- **⚙️ Settings** - Preferences and notifications

### 📅 Appointment System
- **📋 Booking Interface** - Intuitive appointment creation
- **📊 Calendar View** - Visual appointment overview
- **📱 Contact Directory** - Healthcare provider contacts
- **📈 History** - Past appointment records

---

## 🔐 Authentication

### 🚀 Features
- **✅ Email/Password Authentication**
- **🔄 Password Recovery**
- **👤 User Registration**
- **🛡️ Session Management**
- **🔒 Secure Token Handling**

### 🔧 Implementation
```typescript
// Authentication is handled by Supabase
import { supabase } from './supabase';

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

---

## 📱 Screenshots

### 🏠 Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  🏥 GENBOOK.AI                                         │
├─────────────────────────────────────────────────────────┤
│  📊 Dashboard    📅 Schedule    📋 History    ⚙️ Settings │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📈 Overview                    📅 Upcoming             │
│  ┌─────────────┐               ┌─────────────┐         │
│  │ 📊 Stats    │               │ Next Appt   │         │
│  │ 3 Upcoming  │               │ Dr. Smith   │         │
│  │ 12 Total    │               │ 2:00 PM     │         │
│  └─────────────┘               └─────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### ⚙️ Settings Page
```
┌─────────────────────────────────────────────────────────┐
│  Settings - Manage your account and preferences         │
├─────────────────────────────────────────────────────────┤
│  👤 Profile    🔔 Notifications    🔒 Privacy & Security │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Personal Information                                   │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Full Name       │  │ Email           │             │
│  │ [Yash Katiyar]  │  │ [user@email]    │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                         │
│  Medical Information                                    │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Medical Conditions: [Diabetes, Hypertension]       │ │
│  │ Allergies: [Peanuts, Shellfish]                    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│                              [💾 Save Profile]         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Development

### 🛠️ Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Run type checking
npm run type-check
```

### 📁 Project Structure

```
genbook-ai/
├── 📁 public/                 # Static assets
├── 📁 src/
│   ├── 📁 components/         # React components
│   │   ├── AuthModal.tsx      # Authentication modal
│   │   ├── SettingsView.tsx   # Settings management
│   │   └── ...                # Other components
│   ├── 📄 App.tsx             # Main application
│   ├── 📄 main.tsx            # Application entry point
│   ├── 📄 supabase.ts         # Supabase configuration
│   └── 📄 index.css           # Global styles
├── 📄 .env.example            # Environment variables template
├── 📄 package.json            # Dependencies and scripts
├── 📄 README.md               # This file
├── 📄 setup-new-database.sql  # Database setup script
├── 📄 settings-tables-fix.sql # Additional tables script
└── 📄 vite.config.ts          # Vite configuration
```

---

## 🤝 Contributing

### 🎯 How to Contribute

1. **🍴 Fork the repository**
2. **🌿 Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **💻 Make your changes**
4. **✅ Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
5. **🚀 Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **📝 Open a Pull Request**

### 📋 Development Guidelines

- **✅ Follow TypeScript best practices**
- **🎨 Use consistent code formatting**
- **📝 Write meaningful commit messages**
- **🧪 Test your changes thoroughly**
- **📖 Update documentation as needed**

---

## 📄 License

```
MIT License

Copyright (c) 2024 GENBOOK.AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNES FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">
  <h3>🎉 Thank you for using GENBOOK.AI!</h3>
  <p>If you found this project helpful, please consider giving it a ⭐ on GitHub!</p>
  
  <p>
    <strong>Made with ❤️ by the GENBOOK.AI Team</strong>
  </p>
  
  <p>
    <a href="#-overview">Back to Top ⬆️</a>
  </p>
</div>

3. Test the History View:
   - Navigate to the History tab
   - The component should fetch and display appointment history from Supabase

4. Test the Settings View:
   - Navigate to the Settings tab
   - The component should fetch and display user profile, notification settings, and family members from Supabase
   - Try updating your profile information and saving the changes

### Troubleshooting

#### Common Issues:

1. **"Missing Supabase environment variables" error**
   - Make sure your `.env` file exists and has the correct variable names
   - Restart your development server after creating/updating `.env`

2. **"Failed to fetch data" error**
   - Check that the database migration was run successfully
   - Verify your Supabase credentials are correct
   - Check the browser console for detailed error messages

3. **Row Level Security errors**
   - For testing without authentication, you can temporarily disable RLS:
     ```sql
     ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
     ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
     ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
     ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
     ```
   - Remember to re-enable it for production use

### Support

If you encounter any issues:
1. Check the Supabase documentation: https://supabase.com/docs
2. Review the browser console for error messages
3. Check the Supabase dashboard logs for server-side errors