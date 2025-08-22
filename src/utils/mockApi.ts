export type OptimalTime = { hour: string; success: number };
export type QuickBook = { name: string; value: number };
export type SmartSuggestions = { week: string; conflictsReduced: number };

export type DashboardMetrics = {
  optimalTimes: OptimalTime[];
  quickBook: QuickBook[];
  smartSuggestions: SmartSuggestions[];
};

// Simple mock with light randomization to simulate "live" updates
export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  await sleep(200); // simulate latency

  const base: DashboardMetrics = {
    optimalTimes: [
      { hour: '9 AM', success: 82 },
      { hour: '10 AM', success: 90 },
      { hour: '11 AM', success: 76 },
      { hour: '2 PM', success: 88 },
      { hour: '3 PM', success: 92 },
      { hour: '4 PM', success: 79 },
    ],
    quickBook: [
      { name: 'Voice', value: 45 },
      { name: 'Manual', value: 25 },
      { name: 'AI Auto', value: 30 },
    ],
    smartSuggestions: [
      { week: 'W1', conflictsReduced: 10 },
      { week: 'W2', conflictsReduced: 18 },
      { week: 'W3', conflictsReduced: 26 },
      { week: 'W4', conflictsReduced: 33 },
      { week: 'W5', conflictsReduced: 41 },
    ],
  };

  // introduce small variation
  const jitter = (n: number, range = 4) => Math.max(0, n + Math.round((Math.random() - 0.5) * range));

  return {
    optimalTimes: base.optimalTimes.map((d) => ({ ...d, success: jitter(d.success) })),
    quickBook: spreadToHundred(base.quickBook.map((d) => ({ ...d, value: jitter(d.value, 8) }))),
    smartSuggestions: base.smartSuggestions.map((d, i) => ({ ...d, conflictsReduced: jitter(d.conflictsReduced + i * 2, 5) })),
  };
}

function spreadToHundred(data: QuickBook[]): QuickBook[] {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return data.map((d) => ({ ...d, value: Math.round((d.value / total) * 100) }));
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
