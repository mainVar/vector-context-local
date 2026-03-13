import * as path from 'path';
import chalk from 'chalk';
import { configManager } from '../config/manager.js';

export function ignoreCommand(
    projectPath: string,
    action: 'add' | 'remove' | 'list',
    pattern?: string
): void {
    const absolutePath = path.resolve(projectPath);
    const project = configManager.getProject(absolutePath);
    
    if (!project) {
        console.log(chalk.yellow(`Project not found: ${absolutePath}`));
        return;
    }
    
    switch (action) {
        case 'add':
            if (!pattern) {
                console.log(chalk.red('Pattern is required for add action'));
                return;
            }
            if (configManager.addIgnorePattern(absolutePath, pattern)) {
                console.log(chalk.green(`✓ Added ignore pattern: ${pattern}`));
            } else {
                console.log(chalk.yellow(`Pattern already exists: ${pattern}`));
            }
            break;
            
        case 'remove':
            if (!pattern) {
                console.log(chalk.red('Pattern is required for remove action'));
                return;
            }
            if (configManager.removeIgnorePattern(absolutePath, pattern)) {
                console.log(chalk.green(`✓ Removed ignore pattern: ${pattern}`));
            } else {
                console.log(chalk.yellow(`Pattern not found: ${pattern}`));
            }
            break;
            
        case 'list':
            console.log(chalk.bold(`\nIgnore patterns for ${project.name}\n`));
            
            console.log(chalk.cyan('Custom patterns:'));
            if (project.customIgnore.length === 0) {
                console.log(chalk.gray('  (none)'));
            } else {
                project.customIgnore.forEach(p => console.log(chalk.gray(`  - ${p}`)));
            }
            
            const effective = configManager.getEffectiveIgnorePatterns(absolutePath);
            console.log(chalk.cyan(`\nEffective patterns (${effective.length}):`));
            if (options?.showAll) {
                effective.forEach(p => console.log(chalk.gray(`  - ${p}`)));
            } else {
                console.log(chalk.gray(`  Use --all to show all ${effective.length} patterns`));
            }
            break;
    }
}

interface IgnoreOptions {
    showAll?: boolean;
}

let options: IgnoreOptions | undefined;

export function setIgnoreOptions(opts: IgnoreOptions): void {
    options = opts;
}
