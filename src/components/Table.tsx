import type { FC, ReactNode } from 'react';
import { clsx } from 'clsx';

interface TableProps {
    headers: string[];
    children: ReactNode;
    className?: string;
}

export const Table: FC<TableProps> = ({ headers, children, className }) => {
    return (
        <div className={clsx("overflow-x-auto rounded-lg border border-gray-200", className)}>
            <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-semibold uppercase tracking-wider text-xs border-b border-gray-200">
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} className="px-6 py-4">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {children}
                </tbody>
            </table>
        </div>
    );
};

export const TableRow = ({ children }: { children: ReactNode }) => (
    <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
);

export const TableCell = ({ children, className }: { children: ReactNode; className?: string }) => (
    <td className={clsx("px-6 py-4 whitespace-nowrap", className)}>{children}</td>
);
