// CommonJS mock for server tests
const supabase = {
  auth: {
    getUser: async (_token) => ({ data: { user: { id: 'test-user' } }, error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { tenant_id: 'test-tenant', role: 'owner' }, error: null }),
      })
    })
  }),
  rpc: async () => ({ data: null, error: null }),
};

module.exports = { supabase };
