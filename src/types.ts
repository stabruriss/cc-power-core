export interface EnvState {
    [key: string]: string;
}

export enum GroupType {
    CONNECTION = 'CONNECTION',
    MODELS = 'MODELS',
}

export interface EnvVarDefinition {
    key: string;
    label: string;
    group: GroupType;
    isSecret?: boolean;
}

export const ENV_DEFS: EnvVarDefinition[] = [
    { key: 'ANTHROPIC_BASE_URL', label: 'ANTHROPIC_BASE_URL', group: GroupType.CONNECTION },
    { key: 'ANTHROPIC_AUTH_TOKEN', label: 'ANTHROPIC_AUTH_TOKEN', group: GroupType.CONNECTION, isSecret: true },
    { key: 'ANTHROPIC_API_KEY', label: 'ANTHROPIC_API_KEY', group: GroupType.CONNECTION, isSecret: true },
    { key: 'ANTHROPIC_DEFAULT_SONNET_MODEL', label: 'ANTHROPIC_DEFAULT_SONNET_MODEL', group: GroupType.MODELS },
    { key: 'ANTHROPIC_DEFAULT_OPUS_MODEL', label: 'ANTHROPIC_DEFAULT_OPUS_MODEL', group: GroupType.MODELS },
    { key: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', label: 'ANTHROPIC_DEFAULT_HAIKU_MODEL', group: GroupType.MODELS },
];
