export interface CheckInRecord {
    id: string;
    patient_id: string;
    name: string;
    age: number;
    gender: string;
    disease: string;
    visit_date: string;
    blood_pressure?: string;
    glucose_level?: string;
    height?: string;
    weight?: string;
    bmi?: string;
    smoking_status?: string;
    alcohol_consumption?: string;
    medications?: string;
    previous_admissions?: number;
    documents?: { url: string; name: string; size?: string }[];
    photos?: string[];
    createdAt?: any;
    [key: string]: any;
}

/**
 * Escapes a string for CSV, ensuring that embedded commas, quotes, or newlines
 * are properly wrapped in quotes.
 */
const escapeCSV = (field: string | number | undefined | null) => {
    if (field === undefined || field === null) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('\"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const exportCheckInsToCSV = (records: CheckInRecord[]) => {
    const headers = [
        'Record ID',
        'Patient ID',
        'Name',
        'Age',
        'Gender',
        'Disease / Complaint',
        'Visit Date',
        'Blood Pressure',
        'Glucose Level',
        'Height (cm)',
        'Weight (kg)',
        'BMI',
        'Smoking Status',
        'Alcohol Consumption',
        'Medications',
        'Previous Admissions',
        'Submitted At',
        'Document Links (Google Drive)',
        'Photo Links'
    ];

    const rows = records.map(record => {
        // Format URLs specifically for Excel using =HYPERLINK
        const formatLinks = (links: string[], patientId: string) => {
            if (!links || links.length === 0) return '';
            
            // Generate a clean label like "Link - P-152"
            const cleanLabel = `Link - ${patientId}`;
            
            // Excel natively supports one HYPERLINK per cell.
            if (links.length === 1) {
                return `=HYPERLINK("${links[0]}", "${cleanLabel}")`;
            }
            
            // If multiple links exist, we can only safely formula-wrap the first one
            // or concatenate them gracefully. Concatenating multiple HYPERLINKs doesn't array well,
            // so we'll just return the first one as clickable and indicate there are more.
            return `=HYPERLINK("${links[0]}", "${cleanLabel} (+${links.length - 1} more)")`;
        };

        const documentLinks = record.documents && Array.isArray(record.documents)
            ? formatLinks(record.documents.map(d => typeof d === 'string' ? d : ((d as any)?.url || '')), record.patient_id || 'Unknown')
            : '';
            
        const photoLinks = record.photos && Array.isArray(record.photos)
            ? formatLinks(record.photos.map(p => typeof p === 'string' ? p : ((p as any)?.url || '')), record.patient_id || 'Unknown')
            : '';

        let submissionTime = 'Unknown';
        if (record.createdAt) {
            try {
                const date = record.createdAt.toDate ? record.createdAt.toDate() : new Date(record.createdAt);
                if (!isNaN(date.getTime())) {
                    submissionTime = date.toLocaleString();
                }
            } catch (e) {
                // Ignore
            }
        }

        return [
            record.id,
            record.patient_id,
            record.name,
            record.age,
            record.gender,
            record.disease,
            record.visit_date,
            record.blood_pressure || '',
            record.glucose_level || '',
            record.height || '',
            record.weight || '',
            record.bmi || '',
            record.smoking_status || '',
            record.alcohol_consumption || '',
            record.medications || '',
            record.previous_admissions || 0,
            submissionTime,
            documentLinks,
            photoLinks
        ].map(escapeCSV).join(',');
    });

    const csvContent = '\uFEFF' + [
        headers.map(escapeCSV).join(','),
        ...rows
    ].join('\n');

    // Create Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Patient_Checkins_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
