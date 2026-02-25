import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    FileText,
    Package,
    BarChart2,
    Users,
    Settings,
    LogOut
} from 'lucide-react';
import { clsx } from 'clsx';

export const Sidebar: FC = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    const getLinks = () => {
        const common = [
            { to: '/', label: 'Overview', icon: LayoutDashboard },
            { to: '/records', label: 'Records', icon: FileText },
            { to: '/resources', label: 'Resources', icon: Package },
            { to: '/analytics', label: 'Analytics', icon: BarChart2 },
            { to: '/staff', label: 'Staff', icon: Users },
            { to: '/settings', label: 'Settings', icon: Settings },
        ];
        return common;
    };

    const links = getLinks();

    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0">
            <div className="h-16 flex items-center px-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                            {user.facilityType === 'hospital' ? 'H' : user.facilityType === 'clinic' ? 'C' : 'L'}
                        </span>
                    </div>
                    <span className="font-bold text-lg tracking-wide">MedDash</span>
                </div>
            </div>

            <nav className="flex-1 py-6 px-3 space-y-1">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => clsx(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                            isActive
                                ? "bg-primary text-white shadow-lg shadow-primary/25"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <link.icon className="w-5 h-5" />
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
};
