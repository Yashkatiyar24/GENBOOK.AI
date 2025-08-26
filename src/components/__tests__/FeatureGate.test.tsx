import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FeatureGate } from '../FeatureGate';

// Mock entitlements util used by FeatureGate
jest.mock('../../utils/entitlements', () => ({
  fetchEntitlements: jest.fn(async () => ({
    plan: 'professional',
    status: 'active',
    features: { custom_branding: true, advanced_analytics: false, api_access: false, priority_support: false },
    limits: {},
    usage: {}
  })),
  isEntitled: (ents: any, key: string) => Boolean(ents?.features?.[key])
}));

describe('FeatureGate', () => {
  it('renders children when entitled', async () => {
    render(
      <FeatureGate featureKey="custom_branding">
        <div>visible</div>
      </FeatureGate>
    );

    // loading state
    expect(screen.getByText(/Checking your plan/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('visible')).toBeInTheDocument();
    });
  });

  it('renders fallback when not entitled', async () => {
    render(
      <FeatureGate featureKey="advanced_analytics">
        <div>should-not-see</div>
      </FeatureGate>
    );

    await waitFor(() => {
      expect(screen.getByText(/requires an upgraded plan/i)).toBeInTheDocument();
    });
  });
});
