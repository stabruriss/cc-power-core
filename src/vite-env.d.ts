/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        getSettings: () => Promise<{ apiKey: string; model: string; kingModel?: string; queenModel?: string; jackModel?: string; configPath: string }>;
        saveSettings: (settings: { apiKey: string; model: string; kingModel?: string; queenModel?: string; jackModel?: string; active?: boolean }) => Promise<{ success: boolean; error?: string }>;
        getShellStatus: () => Promise<boolean>;
        getShellConfigValues: () => Promise<{ found: boolean; baseUrl?: string; authToken?: string; opusModel?: string; sonnetModel?: string; haikuModel?: string }>;
        openConfigFolder: () => Promise<boolean>;
        openPath: (path: string) => Promise<boolean>;
    };
}
