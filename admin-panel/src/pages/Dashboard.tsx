const stats = [
  { label: 'Total Users', value: '1,234' },
  { label: 'Active Appointments', value: '98' },
  { label: 'Support Tickets', value: '12' },
];


const Dashboard: React.FC = () => (
  <div className="max-w-6xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl bg-[#232b3e] p-8 shadow flex flex-col min-h-[120px]">
          <span className="text-lg text-gray-300 mb-2">{stat.label}</span>
          <span className="text-4xl font-bold text-cyan-200">{stat.value}</span>
        </div>
      ))}
    </div>
    <div className="rounded-2xl bg-[#232b3e] p-8 shadow mt-4">
      <h2 className="text-2xl font-bold mb-2 text-white">Support Ticket Management</h2>
      <p className="text-gray-300">View and manage support tickets.</p>
    </div>
  </div>
);

export default Dashboard;
