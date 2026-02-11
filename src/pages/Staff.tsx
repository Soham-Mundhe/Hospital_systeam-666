import { useState } from 'react';
import type { FC } from 'react';
import { staffList } from '../mockData';
import { Table, TableCell, TableRow } from '../components/Table';
import { clsx } from 'clsx';
import { AddStaffModal } from '../components/dashboard/AddStaffModal';
import type { Staff as StaffType } from '../types';

export const Staff: FC = () => {
    const [staff, setStaff] = useState<StaffType[]>(staffList);
    const [filterRole, setFilterRole] = useState<string>('All');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const roles = ['All', ...new Set(staff.map(s => s.role))];

    const filteredStaff = filterRole === 'All'
        ? staff
        : staff.filter(s => s.role === filterRole);

    const handleAddStaff = (newStaffData: Omit<StaffType, 'id'>) => {
        const newStaff: StaffType = {
            id: `S-${Math.floor(Math.random() * 10000)}`,
            ...newStaffData
        };
        setStaff([...staff, newStaff]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
                    <p className="text-gray-500">View roster and shift timings.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
                >
                    Add Staff
                </button>
            </div>

            {/* Role Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {roles.map(role => (
                    <button
                        key={role}
                        onClick={() => setFilterRole(role)}
                        className={clsx(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                            filterRole === role
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
                        )}
                    >
                        {role}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table headers={['ID', 'Name', 'Role', 'Department', 'Shift', 'Status']}>
                    {filteredStaff.map((staffMember) => (
                        <TableRow key={staffMember.id}>
                            <TableCell className="font-medium text-gray-900">{staffMember.id}</TableCell>
                            <TableCell>{staffMember.name}</TableCell>
                            <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {staffMember.role}
                                </span>
                            </TableCell>
                            <TableCell>{staffMember.department}</TableCell>
                            <TableCell>{staffMember.shift}</TableCell>
                            <TableCell>
                                <div className="flex items-center">
                                    <span className={clsx(
                                        "h-2 w-2 rounded-full mr-2",
                                        staffMember.status === 'Active' ? "bg-green-500" : "bg-yellow-500"
                                    )}></span>
                                    <span className="text-sm text-gray-700">{staffMember.status}</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </Table>
            </div>

            <AddStaffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddStaff}
            />
        </div>
    );
};
