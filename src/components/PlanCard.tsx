import React from 'react';
import { Button } from './ui/button';
import { CheckCircle } from 'lucide-react';

interface PlanCardProps {
  name: string;
  price: number;
  description: string;
  features: string[];
  isCurrent: boolean;
  isUpgrading: boolean;
  onSelect: () => void;
  highlight?: boolean;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  name,
  price,
  description,
  features,
  isCurrent,
  isUpgrading,
  onSelect,
  highlight = false
}) => {
  return (
    <div
      className={`p-6 rounded-lg border ${
        highlight ? 'border-primary ring-2 ring-primary' : 'border-gray-200'
      } bg-white dark:bg-gray-800`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">{name}</h3>
        {isCurrent && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Current Plan
          </span>
        )}
      </div>
      
      <div className="mb-6">
        <span className="text-4xl font-bold">₹{price}</span>
        <span className="text-gray-500 dark:text-gray-400">/month</span>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">{description}</p>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button
        onClick={onSelect}
        disabled={isCurrent || isUpgrading}
        className={`w-full ${
          highlight ? 'bg-primary hover:bg-primary/90' : ''
        }`}
      >
        {isCurrent
          ? 'Current Plan'
          : isUpgrading
          ? 'Processing...'
          : 'Select Plan'}
      </Button>
    </div>
  );
};
