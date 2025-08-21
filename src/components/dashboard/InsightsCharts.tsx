import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Activity, Bot, Zap } from 'lucide-react';
import { fetchDashboardMetrics, type DashboardMetrics } from '../../utils/mockApi';

const COLORS = ['#60A5FA', '#A78BFA', '#34D399', '#F59E0B', '#F472B6'];

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const tooltipStyle: React.CSSProperties = {
  background: 'rgba(17, 24, 39, 0.95)',
  backdropFilter: 'blur(8px)',
  color: '#ffffff',
  border: '1px solid rgba(99, 102, 241, 0.5)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12,
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  zIndex: 1000,
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={tooltipStyle}>
        <p className="font-medium text-white">{payload[0].name}</p>
        <p className="text-cyan-300">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function InsightsCharts() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // initial fetch
    fetchDashboardMetrics().then((d: DashboardMetrics) => {
      if (mounted) {
        setData(d);
        setLoading(false);
      }
    });

    // live updates every 10s (mock)
    const id = setInterval(async () => {
      const next = await fetchDashboardMetrics();
      if (mounted) setData(next);
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div aria-label="AI Insights Charts" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Optimal Times - Bar Chart */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-black/30 border border-indigo-500/20 rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-green-400" />
          <h4 className="text-sm font-semibold text-white">Optimal Times</h4>
        </div>
        <p className="text-xs text-gray-400 mb-3">Highest booking success by hour</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.optimalTimes || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.2)" />
              <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={11} />
              <YAxis stroke="#9CA3AF" fontSize={11} hide />
              <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.15)' }} />
              <Bar dataKey="success" fill="#34D399" radius={[6, 6, 0, 0]} animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Book - Pie/Donut */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.45, delay: 0.1 }}
        className="bg-black/30 border border-purple-500/20 rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h4 className="text-sm font-semibold text-white">Quick Book</h4>
        </div>
        <p className="text-xs text-gray-400 mb-3">Booking channels split</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data?.quickBook || []}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={3}
              >
                {(data?.quickBook || []).map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Smart Suggestions - Line */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-black/30 border border-blue-500/20 rounded-2xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-semibold text-white">Smart Suggestions</h4>
        </div>
        <p className="text-xs text-gray-400 mb-3">Conflicts reduced over time</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.smartSuggestions || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.25)" />
              <XAxis dataKey="week" stroke="#9CA3AF" fontSize={11} />
              <YAxis stroke="#9CA3AF" fontSize={11} hide />
              <ReTooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="conflictsReduced" stroke="#60A5FA" strokeWidth={2} dot={{ r: 2 }} animationDuration={600} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {loading && (
        <div className="col-span-full text-xs text-gray-500">Loading charts...</div>
      )}
    </div>
  );
}
