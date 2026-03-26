import { useState } from 'react';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export function useGeminiSummary() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                'gemini-1.5-flash',
                'gemini-1.5-pro'
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

    return { generateSummary, isGenerating, summary, error };
}
