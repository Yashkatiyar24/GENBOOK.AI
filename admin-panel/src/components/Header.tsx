
const Header: React.FC = () => (
  <header className="header bg-transparent border-b border-none px-8 py-6 flex items-center justify-between">
    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
    <button className="bg-cyan-700 hover:bg-cyan-600 text-white font-semibold px-6 py-2 rounded-lg shadow transition-colors">Sign Out</button>
  </header>
);

export default Header;
