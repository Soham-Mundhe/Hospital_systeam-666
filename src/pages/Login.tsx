import { useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Activity } from 'lucide-react';

export const Login: FC = () => {
    const [email, setEmail] = useState('');
    const [facilityId, setFacilityId] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Basic validation
        if (!facilityId.match(/^[HCL]-\d{3,5}$/i)) {
            setError('Invalid Facility ID format. Use H-xxxx, C-xxxx, or L-xxxx');
            return;
        }

        const success = await login(email, facilityId);
        if (success) {
            navigate('/');
        } else {
            setError('Invalid credentials or facility ID.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Facility Login</h1>
                    <p className="text-gray-500 mt-2">Enter your credentials to access the dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                            placeholder="admin@facility.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Facility ID</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                required
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all uppercase"
                                placeholder="H-1234"
                                value={facilityId}
                                onChange={(e) => setFacilityId(e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-1">Format: H-xxxx (Hospital), C-xxxx (Clinic), L-xxxx (Lab)</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-sky-700 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-md shadow-primary/20"
                    >
                        Access Dashboard
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    <p>Protected Government Health System System</p>
                    <p>© 2024 Ministry of Health</p>
                </div>
            </div>
        </div>
    );
};
