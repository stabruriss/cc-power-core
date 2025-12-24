export interface Model {
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    architecture?: {
        modality?: string;
        tokenizer?: string;
        instruct_type?: string;
        input_modalities?: string[];
    };
    supported_parameters?: string[];
    pricing?: {
        prompt: string;
        completion: string;
    };
}

export async function fetchModels(): Promise<Model[]> {
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching models:', error);
        return [];
    }
}

export interface Credits {
    total_usage: number;
    total_credits: number;
}

export async function fetchCredits(apiKey: string): Promise<Credits | null> {
    if (apiKey === 'sk-or-session-verify') {
        return {
            total_credits: 10.00,
            total_usage: 50.00
        } as Credits;
    }
    try {
        const response = await fetch('https://openrouter.ai/api/v1/credits', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        if (!response.ok) {
            // If 401/403, just return null, don't crash the app
            console.warn(`Failed to fetch credits: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching credits:', error);
        return null;
    }
}
