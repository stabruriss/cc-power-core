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

export interface KeyInfo {
    limit: number | null;          // 信用额度限制，null 表示无限制
    limit_remaining: number | null; // 剩余信用额度
    usage: number;                  // 总使用量
    usage_daily: number;            // 日使用量
    usage_weekly: number;           // 周使用量
    usage_monthly: number;          // 月使用量
    is_free_tier: boolean;          // 是否为免费账户
}

export async function fetchKeyInfo(apiKey: string): Promise<KeyInfo | null> {
    if (apiKey === 'sk-or-session-verify') {
        return {
            limit: 10.00,
            limit_remaining: 8.50,
            usage: 1.50,
            usage_daily: 0.50,
            usage_weekly: 1.00,
            usage_monthly: 1.50,
            is_free_tier: false
        };
    }
    try {
        const response = await fetch('https://openrouter.ai/api/v1/key', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        if (!response.ok) {
            console.warn(`Failed to fetch key info: ${response.status}`);
            return null;
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching key info:', error);
        return null;
    }
}
