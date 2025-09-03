import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

const AppLoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading (replace with your actual loading logic)
  useEffect(() => {
    // Add your actual loading logic here (e.g., checking auth status, loading data)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 seconds for demonstration

    return () => clearTimeout(timer);
  }, []);

  const handleLoadingComplete = () => {
    // Optional: Add any cleanup or state updates after loading completes
  };

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return <>{children}</>;
};

export default AppLoadingWrapper;
