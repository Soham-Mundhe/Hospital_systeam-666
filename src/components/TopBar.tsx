import { useState } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User, QrCode, AlertTriangle, Info, Activity } from 'lucide-react';
import { PatientCheckInModal } from './dashboard/PatientCheckInModal';

export const TopBar: FC = () => {
    const { user } = useAuth();
    const [showQRModal, setShowQRModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Mock notifications for demonstration
    const [notifications, setNotifications] = useState([
        { id: 1, type: 'alert', title: 'High ICU Occupancy', time: '10 min ago', read: false },
        { id: 2, type: 'info', title: 'System Update Completed', time: '1 hour ago', read: false },
        { id: 3, type: 'activity', title: 'New Patient Admitted', time: '2 hours ago', read: true },
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

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
                <div className="flex items-center gap-3">
                    {/* Patient Check-In QR Button */}
                    {user.facilityType === 'hospital' && (
                        <button
                            onClick={() => setShowQRModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                            title="Open Patient Check-In QR"
                        >
                            <QrCode className="w-5 h-5" />
                            <span className="hidden sm:inline">Patient Check-In</span>
                        </button>
                    )}

                    <div className="relative">
                        <button 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2 rounded-full transition-colors ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>

                        {/* Notifications Dropdown */}
                        {showNotifications && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowNotifications(false)}
                                />
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 z-50 overflow-hidden text-left origin-top-right animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                                        <h3 className="font-semibold text-gray-800 text-sm">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button 
                                                onClick={markAllAsRead}
                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            <div className="divide-y divide-gray-50">
                                                {notifications.map(notification => (
                                                    <div key={notification.id} className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/30' : ''}`}>
                                                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                            notification.type === 'alert' ? 'bg-red-100 text-red-600' :
                                                            notification.type === 'info' ? 'bg-blue-100 text-blue-600' :
                                                            'bg-emerald-100 text-emerald-600'
                                                        }`}>
                                                            {notification.type === 'alert' && <AlertTriangle className="w-4 h-4" />}
                                                            {notification.type === 'info' && <Info className="w-4 h-4" />}
                                                            {notification.type === 'activity' && <Activity className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                                {notification.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{notification.time}</p>
                                                        </div>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                                No new notifications
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2 border-t border-gray-50 bg-gray-50/30">
                                        <button 
                                            onClick={() => setShowNotifications(false)}
                                            className="w-full py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium text-gray-700">{user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.facilityType} Admin</p>
                    </div>
                    <div className="bg-primary/10 p-2 rounded-full">
                        <User className="w-5 h-5 text-primary" />
                    </div>

                </div>
            </div>

            {/* Patient Check-In QR Modal */}
            {user.facilityType === 'hospital' && (
                <PatientCheckInModal
                    isOpen={showQRModal}
                    onClose={() => setShowQRModal(false)}
                    facilityId={user.facilityId}
                />
            )}
        </div>
    );
};
