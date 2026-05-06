import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Topbar({ onMenuClick }) {
  const { darkMode, toggleDarkMode, user } = useAuth();
  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
        <Menu size={20} />
      </button>
      <div className="hidden lg:block">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Welcome back, <span className="font-medium text-gray-900 dark:text-gray-100">{user?.name}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
