import chalk from 'chalk';
import { configManager } from '../config/manager.js';
import { ProjectConfig } from '../config/types.js';

export interface ListCommandOptions {
    all?: boolean;
    enabled?: boolean;
    disabled?: boolean;
}

export function listCommand(options: ListCommandOptions = {}): void {
    const projects = Object.values(configManager.getAllProjects());
    
    if (projects.length === 0) {
        console.log(chalk.yellow('No projects configured.'));
        console.log(chalk.gray('Use "vctx add <path>" to add a project.'));
        return;
    }

    let filtered = projects;
    
    if (options.enabled) {
        filtered = filtered.filter(p => p.enabled);
    } else if (options.disabled) {
        filtered = filtered.filter(p => !p.enabled);
    }

    console.log(chalk.bold(`\nProjects (${filtered.length})\n`));

    filtered.forEach((project, index) => {
        const statusIcon = project.enabled ? chalk.green('●') : chalk.gray('○');
        const enabledText = project.enabled ? chalk.green('enabled') : chalk.gray('disabled');
        
        console.log(`${statusIcon} ${chalk.bold(project.name)} ${chalk.gray(`(${enabledText})`)}`);
        console.log(chalk.gray(`  Path: ${project.path}`));
        
        if (project.preset) {
            console.log(chalk.gray(`  Preset: ${project.preset}`));
        }
        
        if (project.customIgnore.length > 0) {
            console.log(chalk.gray(`  Custom ignores: ${project.customIgnore.length} patterns`));
        }
        
        if (project.customExtensions.length > 0) {
            console.log(chalk.gray(`  Custom extensions: ${project.customExtensions.join(', ')}`));
        }
        
        if (project.lastIndexed) {
            const date = new Date(project.lastIndexed);
            console.log(chalk.gray(`  Last indexed: ${date.toLocaleString()}`));
        }
        
        if (index < filtered.length - 1) {
            console.log('');
        }
    });

    console.log(chalk.gray(`\nConfig file: ${configManager.getConfigPath()}`));
}

export function listProjectsSimple(): ProjectConfig[] {
    return Object.values(configManager.getAllProjects());
}
