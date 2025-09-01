import { jest, describe, test, expect } from '@jest/globals';
import request from 'supertest';

// Mocks for ESM-only and heavy modules
jest.mock('../supabase.js', () => require('../__mocks__/supabase.js'));
jest.mock('../swagger.js', () => ({}));
jest.mock('../utils/db-init.js', () => ({ initializeDatabase: async () => {} }));
jest.mock('../utils/rls-setup.js', () => ({ setupRLS: async () => {} }));
jest.mock('../utils/tenant-db.js', () => ({ tenantDB: (_req: any, _res: any, next: any) => next() }));

// Mock all other route modules to no-op so app can boot
jest.mock('../routes/auth.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/team.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/contact.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/email.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/tenants.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/analytics.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/integrations.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/billing.js', () => require('../__mocks__/billing-routes.js'));

// For this test, we want the real appointments routes
jest.unmock('../routes/appointments.js');

// Mock role and subscription middlewares to allow access and set tenant/user
jest.mock('../middleware/tenant.middleware.js', () => ({
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  tenantMiddleware: (_req: any, _res: any, next: any) => { ( _req as any).tenantId = 'test-tenant'; ( _req as any).userId = 'test-user'; next(); },
}));

jest.mock('../middleware/subscription.middleware.js', () => ({
  requireSubscription: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock feature gating utils to control allowed/limit/used
jest.mock('../utils/feature-gating.js', () => ({
  canCreateAppointment: async (tenantId: string) => ({ allowed: true, plan: 'pro', limit: 100, used: 5, tenantId }),
  incrementUsage: async () => {}
}));

import app from '../index';

// Helper to swap canCreateAppointment return for specific tests
const setCanCreate = (impl: any) => {
  const fg = require('../utils/feature-gating.js');
  fg.canCreateAppointment = impl;
};

// Mock supabase insert/select behavior
const supabaseMock = require('../__mocks__/supabase.js');

// Enhance supabase mock to support insert/select chains used in route
supabaseMock.supabase.from = (table: string) => ({
  insert: (rows: any[]) => ({
    select: () => ({
      single: async () => ({ data: { id: 'apt-1', ...rows[0] }, error: null })
    })
  })
});

describe('POST /api/appointments', () => {
  test('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ title: 'Only title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.issues)).toBe(true);
    const paths = res.body.issues.map((i: any) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['start_time', 'end_time']));
  });

  test('returns 402 when plan limit exceeded', async () => {
    setCanCreate(async () => ({ allowed: false, plan: 'basic', limit: 10, used: 10 }));

    const res = await request(app)
      .post('/api/appointments')
      .send({ title: 'Test', start_time: '2025-01-01T10:00:00Z', end_time: '2025-01-01T11:00:00Z' });

    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/limit reached/i);
    expect(res.body.plan).toBe('basic');
  });

  test('creates appointment and returns 201', async () => {
    setCanCreate(async () => ({ allowed: true, plan: 'pro', limit: 100, used: 5 }));

    const payload = { title: 'Consult', start_time: '2025-01-01T10:00:00Z', end_time: '2025-01-01T11:00:00Z' };
    const res = await request(app)
      .post('/api/appointments')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('apt-1');
    expect(res.body.title).toBe('Consult');
    expect(res.body.tenant_id).toBe('test-tenant');
    expect(res.body.created_by).toBe('test-user');
  });
});
