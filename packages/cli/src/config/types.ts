export interface ProjectConfig {
    name: string;
    path: string;
    addedAt: string;
    preset?: string;
    customIgnore: string[];
    customExtensions: string[];
    enabled: boolean;
    lastIndexed?: string;
}

export interface ProjectsConfigFile {
    version: string;
    projects: Record<string, ProjectConfig>;
}

export interface Preset {
    name: string;
    description: string;
    ignorePatterns: string[];
    extensions?: string[];
}

export type ProjectStatus = 'indexed' | 'indexing' | 'indexfailed' | 'waiting' | 'not_indexed';

export interface ProjectWithStatus extends ProjectConfig {
    status: ProjectStatus;
    indexingProgress?: number;
    indexedFiles?: number;
    totalChunks?: number;
    errorMessage?: string;
}
