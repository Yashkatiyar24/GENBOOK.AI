// Mock UI components for TeamView to resolve TypeScript errors
import React, { useState, ReactNode } from 'react';

type TeamMemberRole = 'admin' | 'member' | 'viewer';

// Mock Button component
export const Button = ({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  [key: string]: any;
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${
        variant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Mock Input component
export const Input = ({
  className = '',
  type = 'text',
  ...props
}: {
  className?: string;
  type?: string;
  [key: string]: any;
}) => (
  <input
    type={type}
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    {...props}
  />
);

// Mock Avatar components
export const Avatar = ({ 
  className = '',
  children,
  ...props 
}: { 
  className?: string;
  children: ReactNode;
  [key: string]: any;
}) => (
  <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`} {...props}>
    {children}
  </div>
);

Avatar.Fallback = function AvatarFallback({ 
  children,
  className = ''
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full w-full items-center justify-center rounded-full bg-muted ${className}`}>
      {children}
    </div>
  );
};

Avatar.Image = function AvatarImage({ 
  src, 
  alt,
  className = ''
}: { 
  src?: string; 
  alt?: string;
  className?: string;
}) {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`aspect-square h-full w-full ${className}`}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
};

// Mock DropdownMenu components
export const DropdownMenu = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      {React.Children.map(children, (child: any) => {
        if (child?.type === DropdownMenu.Trigger) {
          return React.cloneElement(child, { isOpen, onOpenChange: setIsOpen });
        }
        if ((child?.type === DropdownMenu.Content) && isOpen) {
          return child;
        }
        return null;
      })}
    </div>
  );
};

DropdownMenu.Trigger = function DropdownMenuTrigger({ 
  children, 
  isOpen, 
  onOpenChange,
  className = ''
}: { 
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  return (
    <button
      className={`outline-none ${className}`}
      onClick={() => onOpenChange(!isOpen)}
    >
      {children}
    </button>
  );
};

DropdownMenu.Content = function DropdownMenuContent({ 
  children, 
  className = ''
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}>
      {children}
    </div>
  );
};

DropdownMenu.Item = function DropdownMenuItem({ 
  children, 
  className = '',
  onSelect,
  ...props 
}: { 
  children: ReactNode;
  className?: string;
  onSelect?: (event: Event) => void;
  [key: string]: any;
}) {
  return (
    <div 
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(e as unknown as Event);
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Mock Tabs components
export const Tabs = ({ defaultValue, children }: { defaultValue: string; children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  return (
    <div className="space-y-4">
      <div className="border-b">
        <div className="-mb-px flex space-x-8">
          {React.Children.map(children, (child: any) => {
            if (child?.type === Tabs.List) {
              return React.cloneElement(child, { activeTab, setActiveTab });
            }
            return null;
          })}
        </div>
      </div>
      <div>
        {React.Children.map(children, (child: any) => {
          if (child?.type === Tabs.Content && child.props.value === activeTab) {
            return child;
          }
          return null;
        })}
      </div>
    </div>
  );
};

Tabs.List = function TabsList({ children, activeTab, setActiveTab }: { 
  children: ReactNode; 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
}) {
  return (
    <div className="flex space-x-8">
      {React.Children.map(children, (child: any) => {
        if (child?.type === Tabs.Trigger) {
          return React.cloneElement(child, { 
            isActive: activeTab === child.props.value,
            onClick: () => setActiveTab(child.props.value)
          });
        }
        return child;
      })}
    </div>
  );
};

Tabs.Trigger = function TabsTrigger({ 
  value, 
  children, 
  isActive, 
  onClick 
}: { 
  value: string; 
  children: ReactNode; 
  isActive?: boolean; 
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center whitespace-nowrap py-4 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive 
          ? 'border-b-2 border-primary text-primary' 
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
};

Tabs.Content = function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  return (
    <div data-value={value} className="mt-4">
      {children}
    </div>
  );
};

// Mock Card components
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className || ''}`}>
    {children}
  </div>
);

Card.Header = function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className || ''}`}>{children}</div>;
};

Card.Title = function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className || ''}`}>{children}</h3>;
};

Card.Description = function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground ${className || ''}`}>{children}</p>;
};

Card.Content = function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 pt-0 ${className || ''}`}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-center p-6 pt-0 ${className || ''}`}>{children}</div>;
};

// Mock Badge component
export const Badge = ({ 
  variant = 'default', 
  children,
  className 
}: { 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
  children: ReactNode;
  className?: string;
}) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  
  return (
    <span 
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant]} ${className || ''}`}
    >
      {children}
    </span>
  );
};

// Mock useToast hook
export const useToast = () => {
  return {
    toast: (options: any) => {
      console.log('Toast:', options);
    },
  };
};

// Mock utility function
export const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
