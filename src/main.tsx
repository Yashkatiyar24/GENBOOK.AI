import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import * as Sentry from '@sentry/react'

const rootEl = document.getElementById('root')!
const root = createRoot(rootEl)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const VITE_SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0'
const APP_ENV = import.meta.env.MODE || 'development'

if (VITE_SENTRY_DSN) {
  try {
    Sentry.init({
      dsn: VITE_SENTRY_DSN,
      release: `genbook-ai@${APP_VERSION}`,
      environment: APP_ENV,
      tracesSampleRate: 0.1,
      integrations: [Sentry.browserTracingIntegration?.()].filter(Boolean) as any,
    })
  } catch (e) {
    // do not block app if Sentry init fails
    console.warn('[Sentry] init failed:', e)
  }
}

function renderEnvError() {
  root.render(
    <div style={{ padding: 20, fontFamily: 'ui-sans-serif, system-ui', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Configuration required</h1>
      <p style={{ opacity: 0.8, marginBottom: 8 }}>Missing Supabase environment variables.</p>
      <pre style={{ background: '#000', padding: 12, borderRadius: 8, overflow: 'auto' }}>{`VITE_SUPABASE_URL=${String(SUPABASE_URL)}
VITE_SUPABASE_ANON_KEY=${String(SUPABASE_ANON_KEY)}`}</pre>
      <p style={{ opacity: 0.8, marginTop: 8 }}>Create a .env file (see README) and restart the dev server.</p>
    </div>
  )
}

async function bootstrap() {
  // Diagnostics for env presence
  try {
    const maskedKey = SUPABASE_ANON_KEY ? `${String(SUPABASE_ANON_KEY).slice(0, 6)}...${String(SUPABASE_ANON_KEY).slice(-4)}` : 'undefined'
    console.log('[ENV]', {
      VITE_SUPABASE_URL_present: Boolean(SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY_present: Boolean(SUPABASE_ANON_KEY),
      VITE_SUPABASE_URL: SUPABASE_URL || 'undefined',
      VITE_SUPABASE_ANON_KEY_masked: maskedKey,
    })
  } catch {}

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    renderEnvError()
    return
  }

  try {
    const App = (await import('./App.tsx')).default
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  } catch (err) {
    console.error('Failed to load App.tsx:', err)
    root.render(
      <div style={{ padding: 20, fontFamily: 'ui-sans-serif, system-ui', color: '#fff', background: '#0f172a', minHeight: '100vh' }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>App failed to load</h1>
        <p style={{ opacity: 0.8, marginBottom: 8 }}>There was an error loading the application module.</p>
        <pre style={{ background: '#000', padding: 12, borderRadius: 8, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{String(err instanceof Error ? err.stack || err.message : err)}</pre>
        <p style={{ opacity: 0.8, marginTop: 8 }}>Check the browser console for details and fix any import/runtime errors.</p>
      </div>
    )
  }
}

bootstrap()
