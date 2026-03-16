/**
 * PatientCheckInModal
 *
 * Displays a QR code that encodes a patient check-in URL.
 * Staff can show this to patients who scan it with the Patient App (or phone camera).
 * Also provides a CSV export of all recent check-in records.
 */

import type { FC } from 'react';
import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, QrCode } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    facilityId: string;
}

export const PatientCheckInModal: FC<Props> = ({ isOpen, onClose, facilityId }) => {
    // Build the check-in URL (works for both local and deployed environments)
    const baseUrl = window.location.origin;
    const checkInUrl = `${baseUrl}/checkin?facility=${encodeURIComponent(facilityId)}`;

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Patient Check-In QR Code"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center gap-6 animate-in">
                {/* Header */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Patient Check-In QR</h2>
                            <p className="text-xs text-gray-400">Facility: {facilityId}</p>
                        </div>
                    </div>
                    <button
                        id="qr-modal-close"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Instruction text */}
                <p className="text-sm text-center text-gray-600 leading-relaxed">
                    Scan this QR using the <span className="font-semibold text-blue-600">Patient App</span> to share patient information.
                </p>

                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
                    <QRCodeSVG
                        value={checkInUrl}
                        size={220}
                        bgColor="#ffffff"
                        fgColor="#1e3a5f"
                        level="H"
                        includeMargin={false}
                    />
                </div>

                {/* URL display */}
                <div className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-center">
                    <p className="text-[11px] text-gray-400 mb-0.5 uppercase tracking-wider font-semibold">Check-In URL</p>
                    <p className="text-xs font-mono text-gray-600 break-all">{checkInUrl}</p>
                </div>
            </div>
        </div>
    );
};
