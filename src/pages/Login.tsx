import { useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Activity, Eye, EyeOff } from 'lucide-react';

export const Login: FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [facilityId, setFacilityId] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const success = await login(email, password, facilityId);
        if (success) {
            navigate('/');
        } else {
            setError('Invalid credentials or facility ID. Check your email, password, and Facility ID format (H-xxxx / C-xxxx / L-xxxx).');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 border border-gray-100">
                {/* Icon */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-sky-100 w-16 h-16 rounded-full flex items-center justify-center mb-5">
                        <Activity className="w-8 h-8 text-sky-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Facility Login</h1>
                    <p className="text-gray-400 mt-1 text-sm">Enter your credentials to access the dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Email Address */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400/50 focus:border-sky-500 outline-none transition-all text-gray-700 placeholder-gray-400"
                            placeholder="admin@health.gov"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400/50 focus:border-sky-500 outline-none transition-all text-gray-700 placeholder-gray-400"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Facility ID */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Facility ID</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400/50 focus:border-sky-500 outline-none transition-all uppercase text-gray-700 placeholder-gray-400"
                                placeholder="H-101 / C-201 / L-301"
                                value={facilityId}
                                onChange={(e) => setFacilityId(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-1">Format: H-xxxx (Hospital), C-xxxx (Clinic), L-xxxx (Lab)</p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold py-3 rounded-lg transition-colors shadow-md shadow-sky-200 mt-2"
                    >
                        Access Dashboard
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-gray-400 space-y-0.5">
                    <p>Protected Government Health System</p>
                    <p>© 2026 Ministry of Health</p>
                </div>
            </div>
        </div>
    );
};
