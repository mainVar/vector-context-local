import * as path from 'path';
import chalk from 'chalk';
import { configManager } from '../config/manager.js';

export function removeCommand(projectPath: string): void {
    const absolutePath = path.resolve(projectPath);
    
    const project = configManager.getProject(absolutePath);
    if (!project) {
        console.log(chalk.yellow(`Project not found: ${absolutePath}`));
        console.log(chalk.gray('Use "vctx list" to see all projects'));
        return;
    }

    const removed = configManager.removeProject(absolutePath);
    if (removed) {
        console.log(chalk.green(`✓ Project removed: ${project.name}`));
        console.log(chalk.gray(`  Path: ${absolutePath}`));
    } else {
        console.log(chalk.red(`Failed to remove project`));
    }
}
