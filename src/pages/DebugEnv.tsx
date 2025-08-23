import { useEffect, useState } from 'react';

export default function DebugEnv() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Collect all VITE_ prefixed environment variables
    const viteVars = Object.entries(import.meta.env)
      .filter(([key]) => key.startsWith('VITE_'))
      .reduce((acc, [key, value]) => ({
        ...acc,
        [key]: key.includes('KEY') || key.includes('SECRET') ? '*****' : value
      }), {});

    setEnvVars(viteVars);
    setLoading(false);
  }, []);

  if (loading) return <div>Loading environment variables...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Environment Variables</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Variable</th>
            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(envVars).map(([key, value]) => (
            <tr key={key} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{key}</td>
              <td style={{ padding: '8px' }}>{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
