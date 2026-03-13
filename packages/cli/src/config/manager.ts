import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectConfig, ProjectsConfigFile, ProjectWithStatus, ProjectStatus } from './types.js';
import { PRESETS } from '../presets/types.js';

const CONFIG_DIR = '.context';
const PROJECTS_FILE = 'projects.json';
const IGNORE_FILE = '.contextignore';

export class ConfigManager {
    private configPath: string;
    private globalIgnorePath: string;
    private config: ProjectsConfigFile;

    constructor() {
        const contextDir = path.join(os.homedir(), CONFIG_DIR);
        this.configPath = path.join(contextDir, PROJECTS_FILE);
        this.globalIgnorePath = path.join(contextDir, IGNORE_FILE);
        this.config = this.loadConfig();
    }

    private getDefaultConfig(): ProjectsConfigFile {
        return {
            version: '1.0',
            projects: {},
        };
    }

    private loadConfig(): ProjectsConfigFile {
        try {
            if (!fs.existsSync(this.configPath)) {
                return this.getDefaultConfig();
            }
            const data = fs.readFileSync(this.configPath, 'utf8');
            const config = JSON.parse(data) as ProjectsConfigFile;
            return config;
        } catch (error) {
            return this.getDefaultConfig();
        }
    }

    private saveConfig(): void {
        const contextDir = path.dirname(this.configPath);
        if (!fs.existsSync(contextDir)) {
            fs.mkdirSync(contextDir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    public getConfigPath(): string {
        return this.configPath;
    }

    public getAllProjects(): Record<string, ProjectConfig> {
        return this.config.projects;
    }

    public getProject(projectPath: string): ProjectConfig | undefined {
        const normalizedPath = path.resolve(projectPath);
        return this.config.projects[normalizedPath];
    }

    public addProject(
        projectPath: string,
        options: {
            name?: string;
            preset?: string;
            customIgnore?: string[];
            customExtensions?: string[];
            enabled?: boolean;
        } = {}
    ): ProjectConfig {
        const normalizedPath = path.resolve(projectPath);
        
        if (!fs.existsSync(normalizedPath)) {
            throw new Error(`Project path does not exist: ${normalizedPath}`);
        }

        const name = options.name || path.basename(normalizedPath);
        const preset = options.preset || this.detectPreset(normalizedPath);

        const projectConfig: ProjectConfig = {
            name,
            path: normalizedPath,
            addedAt: new Date().toISOString(),
            preset,
            customIgnore: options.customIgnore || [],
            customExtensions: options.customExtensions || [],
            enabled: options.enabled !== false,
        };

        this.config.projects[normalizedPath] = projectConfig;
        this.saveConfig();

        return projectConfig;
    }

    public removeProject(projectPath: string): boolean {
        const normalizedPath = path.resolve(projectPath);
        if (this.config.projects[normalizedPath]) {
            delete this.config.projects[normalizedPath];
            this.saveConfig();
            return true;
        }
        return false;
    }

    public updateProject(
        projectPath: string,
        updates: Partial<Omit<ProjectConfig, 'path' | 'addedAt'>>
    ): ProjectConfig | undefined {
        const normalizedPath = path.resolve(projectPath);
        const existing = this.config.projects[normalizedPath];
        
        if (!existing) {
            return undefined;
        }

        const updated: ProjectConfig = {
            ...existing,
            ...updates,
            path: normalizedPath,
        };

        this.config.projects[normalizedPath] = updated;
        this.saveConfig();

        return updated;
    }

    public addIgnorePattern(projectPath: string, pattern: string): boolean {
        const project = this.getProject(projectPath);
        if (!project) return false;

        if (!project.customIgnore.includes(pattern)) {
            project.customIgnore.push(pattern);
            this.updateProject(projectPath, { customIgnore: project.customIgnore });
        }
        return true;
    }

    public removeIgnorePattern(projectPath: string, pattern: string): boolean {
        const project = this.getProject(projectPath);
        if (!project) return false;

        const index = project.customIgnore.indexOf(pattern);
        if (index > -1) {
            project.customIgnore.splice(index, 1);
            this.updateProject(projectPath, { customIgnore: project.customIgnore });
            return true;
        }
        return false;
    }

    public getEffectiveIgnorePatterns(projectPath: string): string[] {
        const project = this.getProject(projectPath);
        const patterns: string[] = [];

        if (project?.preset && PRESETS[project.preset]) {
            patterns.push(...PRESETS[project.preset].ignorePatterns);
        }

        if (project?.customIgnore) {
            patterns.push(...project.customIgnore);
        }

        const globalIgnores = this.loadGlobalIgnore();
        patterns.push(...globalIgnores);

        const gitignorePath = path.join(projectPath, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
            const gitignorePatterns = gitignoreContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
            patterns.push(...gitignorePatterns);
        }

        return [...new Set(patterns)];
    }

    public getEffectiveExtensions(projectPath: string): string[] {
        const project = this.getProject(projectPath);
        const extensions: string[] = [];

        if (project?.preset && PRESETS[project.preset]) {
            const presetExts = PRESETS[project.preset].extensions || [];
            extensions.push(...presetExts);
        }

        if (project?.customExtensions) {
            extensions.push(...project.customExtensions);
        }

        return [...new Set(extensions)];
    }

    private loadGlobalIgnore(): string[] {
        try {
            if (fs.existsSync(this.globalIgnorePath)) {
                const content = fs.readFileSync(this.globalIgnorePath, 'utf8');
                return content
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#'));
            }
        } catch (error) {
            // Ignore errors
        }
        return [];
    }

    private detectPreset(projectPath: string): string {
        const files = fs.readdirSync(projectPath);
        
        if (files.includes('Assets') && files.includes('ProjectSettings')) {
            return 'unity';
        }
        if (files.includes('Cargo.toml')) {
            return 'rust';
        }
        if (files.includes('go.mod')) {
            return 'go';
        }
        if (files.includes('pom.xml') || files.includes('build.gradle') || files.includes('build.gradle.kts')) {
            return 'java';
        }
        if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('setup.py')) {
            return 'python';
        }
        if (files.includes('package.json')) {
            const pkgPath = path.join(projectPath, 'package.json');
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                if (deps['next'] || deps['nuxt'] || deps['vite'] || deps['vue'] || deps['svelte']) {
                    return 'web';
                }
            } catch {
                // Ignore
            }
            return 'node';
        }
        
        return 'minimal';
    }

    public enableProject(projectPath: string): boolean {
        return this.updateProject(projectPath, { enabled: true }) !== undefined;
    }

    public disableProject(projectPath: string): boolean {
        return this.updateProject(projectPath, { enabled: false }) !== undefined;
    }

    public getProjectCount(): number {
        return Object.keys(this.config.projects).length;
    }

    public getEnabledProjects(): ProjectConfig[] {
        return Object.values(this.config.projects).filter(p => p.enabled);
    }
}

export const configManager = new ConfigManager();
