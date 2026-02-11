import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, User } from 'lucide-react';

export const TopBar: FC = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <div className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
            <div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                    {user.facilityType === 'hospital' ? 'Hospital Dashboard' :
                        user.facilityType === 'clinic' ? 'Clinic Dashboard' : 'Lab Dashboard'}
                </h2>
                <p className="text-xs text-gray-500">ID: {user.facilityId}</p>
            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-gray-700">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.facilityType} Admin</p>
                    </div>
                    <div className="bg-primary/10 p-2 rounded-full">
                        <User className="w-5 h-5 text-primary" />
                    </div>

                    <button
                        onClick={logout}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
