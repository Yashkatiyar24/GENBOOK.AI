
import { useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Dashboard', href: '/' },
  { label: 'Users', href: '/users' },
  { label: 'Roles & Permissions', href: '/roles' },
  { label: 'AI Models', href: '/ai-models' },
  { label: 'Documents', href: '/documents' },
  { label: 'Analytics', href: '/analytics' },
  { label: 'Security', href: '/security' },
  { label: 'Support', href: '/support' },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  return (
    <aside className="sidebar bg-[#151c28] text-white min-h-screen w-64 flex flex-col shadow-lg border-r border-[#232b3e]">
      <div className="sidebar-header flex items-center h-20 px-8 border-b border-[#232b3e]">
        <span className="text-2xl font-extrabold tracking-widest text-cyan-400">GENBOOK.AI</span>
      </div>
      <nav className="flex-1 mt-6">
        <ul className="flex flex-col gap-1">
          {navLinks.map(link => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`block px-8 py-3 rounded-lg font-medium transition-colors text-base ${location.pathname === link.href ? 'bg-[#232b3e] text-white font-semibold' : 'text-gray-300 hover:bg-[#232b3e] hover:text-white'}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
