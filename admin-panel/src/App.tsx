
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Roles from './pages/Roles';
import AIModels from './pages/AIModels';
import Documents from './pages/Documents';
import Analytics from './pages/Analytics';
import Security from './pages/Security';
import Support from './pages/Support';
import './App.css';

const App: React.FC = () => (
  <Router>
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/roles" element={<Roles />} />
        <Route path="/ai-models" element={<AIModels />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/security" element={<Security />} />
        <Route path="/support" element={<Support />} />
      </Routes>
    </MainLayout>
  </Router>
);

export default App;
