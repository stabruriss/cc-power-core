/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        getSettings: () => Promise<{ apiKey: string; model: string; configPath: string }>;
        saveSettings: (settings: { apiKey: string; model: string }) => Promise<{ success: boolean; error?: string }>;
        openConfigFolder: () => Promise<boolean>;
    };
}
