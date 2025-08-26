import { jest, describe, it, expect } from '@jest/globals';
import request from 'supertest';

// Mock ESM-only server modules for Jest
jest.mock('../supabase.js', () => require('../__mocks__/supabase.js'));
jest.mock('../swagger.js', () => ({}));
jest.mock('../utils/db-init.js', () => ({ initializeDatabase: async () => {} }));
jest.mock('../utils/rls-setup.js', () => ({ setupRLS: async () => {} }));
jest.mock('../utils/tenant-db.js', () => ({ tenantDB: (_req: any, _res: any, next: any) => next() }));
// Mock route modules to avoid ESM parsing in Jest
jest.mock('../routes/auth.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/appointments.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/team.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/contact.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/email.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/tenants.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/analytics.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/integrations.js', () => require('../__mocks__/noop-route.js'));
jest.mock('../routes/billing.js', () => require('../__mocks__/billing-routes.js'));

import app from '../index';

describe('Health endpoint', () => {
  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
