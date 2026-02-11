import { useState } from 'react';
import type { FC } from 'react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const hospitalIndices = [
    { name: 'Mon', admissions: 40, discharges: 35 },
    { name: 'Tue', admissions: 55, discharges: 40 },
    { name: 'Wed', admissions: 48, discharges: 45 },
    { name: 'Thu', admissions: 60, discharges: 50 },
    { name: 'Fri', admissions: 75, discharges: 55 },
    { name: 'Sat', admissions: 30, discharges: 20 },
    { name: 'Sun', admissions: 25, discharges: 15 },
];

const clinicIndices = [
    { name: 'Mon', patients: 120 },
    { name: 'Tue', patients: 145 },
    { name: 'Wed', patients: 100 },
    { name: 'Thu', patients: 130 },
    { name: 'Fri', patients: 150 },
    { name: 'Sat', patients: 80 },
];

const labIndices = [
    { name: 'Mon', tests: 200, positive: 15 },
    { name: 'Tue', tests: 250, positive: 20 },
    { name: 'Wed', tests: 220, positive: 18 },
    { name: 'Thu', tests: 280, positive: 25 },
    { name: 'Fri', tests: 300, positive: 30 },
    { name: 'Sat', tests: 150, positive: 10 },
];

export const Analytics: FC = () => {
    const { user } = useAuth();
    const [timeRange, setTimeRange] = useState('Weekly');

    if (!user) return null;

    const renderHospitalChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hospitalIndices}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ stroke: '#ADD8E6', strokeWidth: 2 }}
                />
                <Line type="monotone" dataKey="admissions" stroke="#ADD8E6" strokeWidth={3} dot={{ r: 4, fill: '#ADD8E6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="discharges" stroke="#34D399" strokeWidth={3} dot={{ r: 4, fill: '#34D399', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
        </ResponsiveContainer>
    );

    const renderClinicChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={clinicIndices}>
                <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ADD8E6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ADD8E6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="patients" stroke="#4fa3c7" fillOpacity={1} fill="url(#colorPatients)" />
            </AreaChart>
        </ResponsiveContainer>
    );

    const renderLabChart = () => (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={labIndices}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Line type="monotone" dataKey="tests" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
                <Line type="monotone" dataKey="positive" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} />
            </LineChart>
        </ResponsiveContainer>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics & Trends</h1>
                    <p className="text-gray-500">
                        {user.facilityType === 'hospital' ? 'Patient Flow Analysis' :
                            user.facilityType === 'clinic' ? 'Visitor Trends' : 'Test Volume Analysis'}
                    </p>
                </div>
                <div className="bg-white rounded-lg p-1 border border-gray-200 flex">
                    {['Weekly', 'Monthly'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeRange(t)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${timeRange === t ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    {user.facilityType === 'hospital' ? 'Admissions vs Discharges' :
                        user.facilityType === 'clinic' ? 'Total Patient Visits' : 'Tests Conducted vs Positive Results'}
                </h3>
                {user.facilityType === 'hospital' && renderHospitalChart()}
                {user.facilityType === 'clinic' && renderClinicChart()}
                {user.facilityType === 'lab' && renderLabChart()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Efficiency Score</h4>
                    <div className="text-3xl font-bold text-green-600">94%</div>
                    <p className="text-xs text-gray-500 mt-1">Operational efficiency this week</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Avg. Treatment Time</h4>
                    <div className="text-3xl font-bold text-blue-600">45m</div>
                    <p className="text-xs text-gray-500 mt-1">-5m from last average</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-800 mb-2">Patient Satisfaction</h4>
                    <div className="text-3xl font-bold text-purple-600">4.8/5</div>
                    <p className="text-xs text-gray-500 mt-1">Based on recent feedback</p>
                </div>
            </div>
        </div>
    );
};
