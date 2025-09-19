# 🏥 GENBOOK.AI

<div align="center">
  <h1>GENBOOK.AI</h1>
  <p><strong>Intelligent Healthcare Appointment Management System</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react" alt="React">
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript" alt="TypeScript">
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase" alt="Supabase">
    <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite" alt="Vite">
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css" alt="Tailwind CSS">
  </p>

  <p>
    <img src="https://img.shields.io/badge/Status-Production-10B981?style=flat" alt="Status">
    <img src="https://img.shields.io/badge/License-MIT-2563EB?style=flat" alt="License">
    <img src="https://img.shields.io/badge/Version-1.0.0-F59E0B?style=flat" alt="Version">
  </p>
</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#-configuration)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)

## 🌟 Overview

GENBOOK.AI is a comprehensive healthcare appointment management solution designed to streamline the scheduling process for medical practices and patients. Built with modern web technologies, it offers a secure, scalable, and user-friendly platform for managing appointments, patient records, and healthcare provider schedules.

## ✨ Key Features

### 👥 User Management
- **Secure Authentication** - JWT-based authentication with Supabase Auth
- **Role-Based Access Control** - Different permissions for patients, doctors, and admins
- **Profile Management** - Complete user profiles with medical history
- **Family Accounts** - Manage appointments for family members

### 📅 Appointment System
- **Online Booking** - 24/7 appointment scheduling
- **Calendar Integration** - Sync with popular calendar services
- **Automated Reminders** - Email and SMS notifications
- **Waitlist Management** - Automatic scheduling for cancellations

### 🏥 Healthcare Features
- **Electronic Health Records** - Secure patient records
- **Telehealth** - Built-in video consultations
- **Prescription Management** - Digital prescriptions
- **Billing & Insurance** - Integrated payment processing

### 🛠️ Admin Dashboard
- **Analytics** - Practice performance metrics
- **Staff Management** - Schedule and permissions
- **Reporting** - Custom reports and exports
- **Settings** - Customize practice preferences

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18.2
- **Language**: TypeScript 5.0
- **Build Tool**: Vite 4.0
- **Styling**: Tailwind CSS 3.3
- **State Management**: React Query
- **Form Handling**: React Hook Form
- **UI Components**: Headless UI

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL 15
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime

### DevOps
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Monitoring**: Sentry
- **Logging**: Pino

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ or yarn 1.22+
- Supabase account
- PostgreSQL 13+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yashkatiyar24/genbook-ai.git
   cd genbook-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration.

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (for payments)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# App Configuration
VITE_APP_NAME="GENBOOK.AI"
VITE_APP_URL=http://localhost:5173
```

## 🛠 Development

### Available Scripts

- `dev` - Start development server
- `build` - Build for production
- `preview` - Preview production build
- `test` - Run tests
- `lint` - Run ESLint
- `type-check` - Check TypeScript types
- `format` - Format code with Prettier

### Code Style

This project uses:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type checking

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Deployment Options

1. **Vercel** (Recommended)
   - Connect your GitHub repository
   - Set up environment variables
   - Deploy with zero configuration

2. **Docker**
   ```bash
   docker build -t genbook-ai .
   docker run -p 3000:3000 genbook-ai
   ```

## 📚 API Documentation

API documentation is available at `/api-docs` when running the development server.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run end-to-end tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔒 Security

### Reporting Vulnerabilities

Please report any security vulnerabilities to security@genbook.ai

### Security Measures

- Row Level Security (RLS) in PostgreSQL
- JWT authentication
- CSRF protection
- Rate limiting
- Input validation
- Secure headers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Supabase](https://supabase.com) for the amazing backend platform
- [Vite](https://vitejs.dev/) for the fast development experience
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [React](https://reactjs.org/) for the UI library
- [TypeScript](https://www.typescriptlang.org/) for type safety

---

<div align="center">
  <p>Built with ❤️ by the GENBOOK.AI Team</p>
  <p>
    <a href="https://github.com/yashkatiyar24/genbook-ai">GitHub</a> • 
    <a href="https://genbook.ai">Website</a> • 
    <a href="https://twitter.com/genbookai">Twitter</a>
  </p>
</div>
