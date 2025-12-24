export const DEFAULT_VALUES = {
    ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
    ANTHROPIC_AUTH_TOKEN: '',
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-3-5-sonnet-20240620',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'claude-3-opus-20240229',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'claude-3-haiku-20240307',
};

export const OPENROUTER_PRESETS = {
    ANTHROPIC_BASE_URL: 'https://openrouter.ai/api/v1',
};

// Mock API response for model list
export const AVAILABLE_MODELS = [
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-haiku-20240307',
    'claude-3-5-sonnet-latest',
    'claude-3-opus-latest',
    'claude-2.1',
    'claude-2.0',
];
