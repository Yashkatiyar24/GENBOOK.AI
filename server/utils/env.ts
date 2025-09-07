import { z } from 'zod';

// Define required & optional environment variables.
// Mark Razorpay keys optional so the core app can start without billing (e.g. local dev),
// but warn if absent in production.
const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().regex(/^\d+$/).default('54321'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(20, 'SUPABASE_SERVICE_KEY looks too short'),
  ALLOWED_ORIGINS: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  HOST: z.string().default('localhost')
});

export type AppEnv = z.infer<typeof EnvSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Collect human-friendly messages
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    // Fail fast in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.error('\n❌ Environment validation failed:\n' + issues.map(m => ' - ' + m).join('\n') + '\n');
      throw new Error('Environment validation failed');
    }
  } else {
    cached = parsed.data;
    // Warn if billing keys missing in production
    if (cached.NODE_ENV === 'production' && (!cached.RAZORPAY_KEY_ID || !cached.RAZORPAY_KEY_SECRET)) {
      console.warn('⚠️  Razorpay keys missing in production environment');
    }
  }
  // Fallback minimal object for tests if invalid
  if (!cached) {
    cached = {
      NODE_ENV: process.env.NODE_ENV || 'test',
      PORT: process.env.PORT || '54321',
      SUPABASE_URL: process.env.SUPABASE_URL || 'http://example.test',
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || 'test_service_key_min_len____________',
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      HOST: process.env.HOST || 'localhost'
    } as AppEnv;
  }
  return cached;
}

export function redactEnv(env: AppEnv) {
  return {
    ...env,
    SUPABASE_SERVICE_KEY: mask(env.SUPABASE_SERVICE_KEY),
    RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET ? mask(env.RAZORPAY_KEY_SECRET) : undefined,
  };
}

function mask(value: string) {
  if (!value) return value;
  if (value.length <= 8) return '*'.repeat(value.length);
  return value.slice(0, 4) + '*'.repeat(value.length - 8) + value.slice(-4);
}
