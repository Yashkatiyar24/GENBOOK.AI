import React from 'react';

// Mock Button Component
export const Button = ({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  [key: string]: any;
}) => {
  return (
    <button 
      className={`mock-button mock-button-${variant} mock-button-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Mock Input Component
export const Input = ({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <input className={`mock-input ${className}`} {...props} />;
};

// Mock Avatar Component
export const Avatar = ({
  className = '',
  children,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return (
    <div className={`mock-avatar ${className}`} {...props}>
      {children}
    </div>
  );
};

// Mock DropdownMenu Components
export const DropdownMenu = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-dropdown-menu" {...props}>{children}</div>;
};

export const DropdownMenuTrigger = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-dropdown-trigger" {...props}>{children}</div>;
};

export const DropdownMenuContent = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-dropdown-content" {...props}>{children}</div>;
};

export const DropdownMenuItem = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-dropdown-item" {...props}>{children}</div>;
};

// Mock Card Component
export const Card = ({
  children,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => {
  return (
    <div className={`mock-card ${className}`} {...props}>
      {children}
    </div>
  );
};

// Mock Tabs Components
export const Tabs = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-tabs" {...props}>{children}</div>;
};

export const TabsList = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-tabs-list" {...props}>{children}</div>;
};

export const TabsTrigger = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-tabs-trigger" {...props}>{children}</div>;
};

export const TabsContent = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => {
  return <div className="mock-tabs-content" {...props}>{children}</div>;
};

// Mock Badge Component
export const Badge = ({
  children,
  variant = 'default',
  className = '',
  ...props
}: {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  [key: string]: any;
}) => {
  return (
    <span className={`mock-badge mock-badge-${variant} ${className}`} {...props}>
      {children}
    </span>
  );
};

// Mock useToast hook
export const useToast = () => {
  return {
    toast: (props: any) => {
      console.log('Toast:', props);
    },
  };
};

// Mock cn utility
export const cn = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default {
  Button,
  Input,
  Avatar,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  useToast,
  cn,
};
