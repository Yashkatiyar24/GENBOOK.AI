import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="main-layout flex min-h-screen bg-background">
    <Sidebar />
    <div className="main-content flex-1 flex flex-col min-h-screen">
      <Header />
      <div className="content-area flex-1 p-8 bg-background">{children}</div>
    </div>
  </div>
);

export default MainLayout;
