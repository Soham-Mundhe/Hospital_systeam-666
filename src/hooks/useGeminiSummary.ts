import { useState } from 'react';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function getSpecialistDoctor(diagnosis?: string) {
    const d = (diagnosis || '').toLowerCase();
    if (d.includes('diabet') || d.includes('sugar') || d.includes('endocrine')) return { name: 'Endocrinologist', status: 'Endocrinology AI evaluating diabetic risks...' };
    if (d.includes('heart') || d.includes('cardio') || d.includes('myocardial')) return { name: 'Cardiologist', status: 'Cardiology AI estimating cardiac risk...' };
    if (d.includes('cancer') || d.includes('tumor') || d.includes('onco')) return { name: 'Oncologist', status: 'Oncology AI assessing tumor pathology...' };
    if (d.includes('lung') || d.includes('asthma') || d.includes('pulmon') || d.includes('pneumonia')) return { name: 'Pulmonologist', status: 'Pulmonology AI reviewing respiratory function...' };
    if (d.includes('kidney') || d.includes('renal') || d.includes('nephro')) return { name: 'Nephrologist', status: 'Nephrology AI analyzing renal function...' };
    if (d.includes('brain') || d.includes('neuro') || d.includes('stroke') || d.includes('seizure')) return { name: 'Neurologist', status: 'Neurology AI evaluating neurological status...' };
    if (d.includes('liver') || d.includes('hepato') || d.includes('cirrhosis')) return { name: 'Hepatologist', status: 'Hepatology AI assessing hepatic function...' };
    if (d.includes('infect') || d.includes('sepsis') || d.includes('virus')) return { name: 'Infectious Disease Specialist', status: 'Infectious Disease AI analyzing sepsis risk...' };
    return { name: 'Internal Medicine Specialist', status: 'Specialist AI synthesizing clinical profile...' };
}

export function useGeminiSummary() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [combinedRiskData, setCombinedRiskData] = useState<{ risk: number, level: string, reasons: {factor: string, impact: number}[] } | null>(null);

    const generateSummary = async (fileUrls: string[], patientContext?: string) => {
        if (!API_KEY) {
            setError('Missing Gemini API Key');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setSummary(null);

        try {
            console.log('--- AI SUMMARIZER: STARTING ANALYSIS (Gemini Multi-Model Fallback) ---');
            
            const imageParts = await Promise.all(
                fileUrls.map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) return null;
                        const blob = await response.blob();
                        
                        return new Promise<{ data: string; mime_type: string }>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({
                                data: (reader.result as string).split(',')[1],
                                mime_type: blob.type || 'image/jpeg'
                            });
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.warn(`Could not process file at ${url}:`, e);
                        return null;
                    }
                })
            );

            const filteredParts = imageParts.filter((p): p is { data: string; mime_type: string } => p !== null);

            const payload = {
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            text:
                                `You are an expert clinical AI assistant.\n\n` +
                                `Goal: Using the provided patient documents, extract and summarize:\n` +
                                `1) Patient current visit details (symptoms/complaints, vitals if present, diagnosis impression if present)\n` +
                                `2) Medical history from the documents (past illnesses, surgeries/procedures, chronic conditions)\n` +
                                `3) Treatments/medications mentioned (including dosage if explicitly stated)\n` +
                                `4) Allergies mentioned\n` +
                                `5) Red flags / critical findings (if present)\n\n` +
                                `Patient Context (from the check-in form):\n${patientContext || 'No additional context provided.'}\n\n` +
                                `Output requirements (Professional Markdown):\n` +
                                `- Use headings: "Patient Details", "Medical History", "Current Visit", "Medications", "Allergies", "Red Flags", "Summary"\n` +
                                `- If something is not found in the documents, write "Not provided in documents".\n` +
                                `- Be concise and avoid speculation beyond the documents.\n`,
                        },
                        ...filteredParts.map(p => ({ inline_data: p }))
                    ]
                }],
                generationConfig: { temperature: 0.1 }
            };

            // Models to try in order of efficiency/cost
            const modelsToTry = [
                'gemini-2.5-flash',
                'gemini-2.5-pro'
            ];

            let lastErrorData = null;
            let finalOutput = null;

            for (const modelName of modelsToTry) {
                try {
                    console.log(`Testing model: ${modelName}...`);
                    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                    
                    const response = await fetch(apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        const parts = data.candidates?.[0]?.content?.parts ?? [];
                        finalOutput = parts
                            .map((p: any) => p?.text)
                            .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
                            .join('\n')
                            .trim();
                        if (finalOutput) {
                            console.log(`--- SUCCESS: Using ${modelName} ---`);
                            break;
                        }
                    } else {
                        console.warn(`Model ${modelName} failed:`, data.error?.message);
                        lastErrorData = data;
                    }
                } catch (e) {
                    console.warn(`Model ${modelName} fetch failed:`, e);
                }
            }

            if (!finalOutput) {
                if (lastErrorData?.error?.message?.includes('404')) {
                    throw new Error("MODEL_NOT_FOUND: Gemini API is NOT enabled for project 283082342102. Please go to AI Studio / Google Cloud and Enable 'Generative Language API'.");
                }
                throw new Error(lastErrorData?.error?.message || "Summarization failed. All search models are currently restricted for this API key.");
            }
            
            setSummary(finalOutput);
        } catch (err: any) {
            console.error('Final Summary Error:', err);
            setError(err.message || 'Summarization failed. Check API project status.');
        } finally {
            setIsGenerating(false);
        }
    };

    const generateCombinedRisk = async (fileUrls: string[], patientContext: string, mlPrediction: any, specialistName: string = 'Clinical') => {
        if (!API_KEY) {
            setError('Missing Gemini API Key');
            return null;
        }

        setIsGenerating(true);
        setError(null);
        setCombinedRiskData(null);

        try {
            console.log('--- AI COMBINED RISK: STARTING ANALYSIS ---');
            
            const imageParts = await Promise.all(
                fileUrls.map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) return null;
                        const blob = await response.blob();
                        
                        return new Promise<{ data: string; mime_type: string }>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve({
                                data: (reader.result as string).split(',')[1],
                                mime_type: blob.type || 'image/jpeg'
                            });
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch (e) {
                        console.warn(`Could not process file at ${url}:`, e);
                        return null;
                    }
                })
            );

            const filteredParts = imageParts.filter((p): p is { data: string; mime_type: string } => p !== null);

            const payload = {
                contents: [{
                    role: 'user',
                    parts: [
                        {
                            text:
                                `You are an expert ${specialistName} AI assistant.\n\n` +
                                `Goal: Combine the patient's stats, the ML text-book risk prediction, and information extracted from medical documents (if any) to generate a final Risk Score (0-100) focused heavily through the lens of a ${specialistName}.\n\n` +
                                `Patient Context:\n${patientContext}\n\n` +
                                `ML Model Initial Prediction (Baseline):\n${JSON.stringify(mlPrediction)}\n\n` +
                                `Look at the attached documents. Do they reveal additional risks (e.g., severe prior conditions not in the basic form, dangerous allergies, critical lab values)? If yes, increase the risk. If they reveal stable history, it might stay same or lower.\n\n` +
                                `Output MUST be valid JSON only, exactly matching this format:\n` +
                                `{\n` +
                                `  "risk": 75,\n` +
                                `  "level": "High", // "Low", "Moderate", "High"\n` +
                                `  "reasons": [\n` +
                                `    {"factor": "Based on document mentioning severe complications", "impact": 40},\n` +
                                `    {"factor": "ML baseline", "impact": 20}\n` +
                                `  ],\n` +
                                `  "clinical_summary": "A highly professional, 2-to-3 sentence executive clinical summary of the patient's current risk state from a specialist perspective. Write like a senior attending physician.",\n` +
                                `  "recommended_actions": [\n` +
                                `    "STAT Endocrinology Consult",\n` +
                                `    "Initiate continuous cardiac monitoring"\n` +
                                `  ]\n` +
                                `}\n` +
                                `Do not include any markdown formatting, just the JSON string.\n`,
                        },
                        ...filteredParts.map(p => ({ inline_data: p }))
                    ]
                }],
                generationConfig: { temperature: 0.2 }
            };

            const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro'];
            let finalOutput = null;
            let lastErrorData = null;

            for (const modelName of modelsToTry) {
                try {
                    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
                    const response = await fetch(apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json();
                    if (response.ok) {
                        const parts = data.candidates?.[0]?.content?.parts ?? [];
                        finalOutput = parts.map((p: any) => p?.text).join('').trim();
                        if (finalOutput) break;
                    } else {
                        lastErrorData = data;
                    }
                } catch (e) {}
            }

            if (!finalOutput) {
                throw new Error("Failed to generate AI Risk.");
            }

            // Clean up possible markdown in JSON block
            const jsonText = finalOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(jsonText);
            setCombinedRiskData(result);
            return result;
        } catch (err: any) {
            console.error('Final Summary Error:', err);
            setError(err.message || 'Summarization failed.');
            return null;
        } finally {
            setIsGenerating(false);
        }
    }

    return { generateSummary, generateCombinedRisk, isGenerating, summary, combinedRiskData, error };
}
