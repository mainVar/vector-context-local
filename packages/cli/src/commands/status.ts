import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { configManager } from '../config/manager.js';
import { ProjectWithStatus, ProjectStatus } from '../config/types.js';

const SNAPSHOT_FILE = 'mcp-codebase-snapshot.json';

function getSnapshotPath(): string {
    const contextDir = path.join(require('os').homedir(), '.context');
    return path.join(contextDir, SNAPSHOT_FILE);
}

interface SnapshotInfo {
    status: 'indexed' | 'indexing' | 'indexfailed';
    indexedFiles?: number;
    totalChunks?: number;
    indexingPercentage?: number;
    errorMessage?: string;
    lastUpdated?: string;
}

function loadSnapshot(): Record<string, SnapshotInfo> {
    try {
        const snapshotPath = getSnapshotPath();
        if (!fs.existsSync(snapshotPath)) {
            return {};
        }
        const data = fs.readFileSync(snapshotPath, 'utf8');
        const snapshot = JSON.parse(data);
        
        if (snapshot.formatVersion === 'v2' && snapshot.codebases) {
            return snapshot.codebases;
        }
        
        return {};
    } catch {
        return {};
    }
}

export function statusCommand(projectPath?: string): void {
    const snapshot = loadSnapshot();
    
    if (projectPath) {
        const absolutePath = path.resolve(projectPath);
        const project = configManager.getProject(absolutePath);
        
        if (!project) {
            console.log(chalk.yellow(`Project not found in config: ${absolutePath}`));
            return;
        }
        
        showProjectStatus(project, snapshot[absolutePath]);
    } else {
        const projects = Object.values(configManager.getAllProjects());
        
        if (projects.length === 0) {
            console.log(chalk.yellow('No projects configured.'));
            return;
        }
        
        console.log(chalk.bold('\nProject Status\n'));
        
        projects.forEach(project => {
            const info = snapshot[project.path];
            showProjectStatus(project, info, true);
        });
    }
}

function showProjectStatus(project: any, snapshotInfo?: SnapshotInfo, brief: boolean = false): void {
    let status: ProjectStatus = 'not_indexed';
    let progress: number | undefined;
    let indexedFiles: number | undefined;
    let totalChunks: number | undefined;
    let errorMessage: string | undefined;
    
    if (snapshotInfo) {
        status = snapshotInfo.status as ProjectStatus;
        progress = snapshotInfo.indexingPercentage;
        indexedFiles = snapshotInfo.indexedFiles;
        totalChunks = snapshotInfo.totalChunks;
        errorMessage = snapshotInfo.errorMessage;
    }
    
    const statusIcon = getStatusIcon(status);
    const statusText = getStatusText(status);
    
    console.log(`${statusIcon} ${chalk.bold(project.name)}`);
    
    if (brief) {
        console.log(chalk.gray(`  Path: ${project.path}`));
    }
    
    console.log(chalk.gray(`  Status: ${statusText}`));
    
    if (status === 'indexing' && progress !== undefined) {
        const bar = renderProgressBar(progress);
        console.log(chalk.gray(`  Progress: ${bar} ${progress}%`));
    }
    
    if (status === 'indexed') {
        if (indexedFiles !== undefined) {
            console.log(chalk.gray(`  Indexed files: ${indexedFiles}`));
        }
        if (totalChunks !== undefined) {
            console.log(chalk.gray(`  Total chunks: ${totalChunks}`));
        }
    }
    
    if (status === 'indexfailed' && errorMessage) {
        console.log(chalk.red(`  Error: ${errorMessage}`));
    }
    
    if (!project.enabled) {
        console.log(chalk.gray(`  ${chalk.yellow('⚠ Project is disabled')}`));
    }
    
    if (!brief) {
        console.log(chalk.gray(`  Preset: ${project.preset || 'none'}`));
        console.log(chalk.gray(`  Custom ignores: ${project.customIgnore.length}`));
        console.log(chalk.gray(`  Config: ${project.enabled ? 'enabled' : 'disabled'}`));
    }
    
    console.log('');
}

function getStatusIcon(status: ProjectStatus): string {
    switch (status) {
        case 'indexed': return chalk.green('✓');
        case 'indexing': return chalk.blue('◐');
        case 'indexfailed': return chalk.red('✗');
        case 'not_indexed': return chalk.gray('○');
        default: return chalk.gray('?');
    }
}

function getStatusText(status: ProjectStatus): string {
    switch (status) {
        case 'indexed': return chalk.green('indexed');
        case 'indexing': return chalk.blue('indexing');
        case 'indexfailed': return chalk.red('failed');
        case 'not_indexed': return chalk.gray('not indexed');
        default: return chalk.gray('unknown');
    }
}

function renderProgressBar(progress: number, width: number = 20): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

export function getProjectsWithStatus(): ProjectWithStatus[] {
    const snapshot = loadSnapshot();
    const projects = Object.values(configManager.getAllProjects());
    
    return projects.map(project => {
        const info = snapshot[project.path];
        
        const result: ProjectWithStatus = {
            ...project,
            status: info?.status as ProjectStatus || 'not_indexed',
        };
        
        if (info) {
            if (info.indexingPercentage !== undefined) {
                result.indexingProgress = info.indexingPercentage;
            }
            if (info.indexedFiles !== undefined) {
                result.indexedFiles = info.indexedFiles;
            }
            if (info.totalChunks !== undefined) {
                result.totalChunks = info.totalChunks;
            }
            if (info.errorMessage) {
                result.errorMessage = info.errorMessage;
            }
        }
        
        return result;
    });
}
