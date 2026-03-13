import * as path from 'path';
import chalk from 'chalk';
import { configManager } from '../config/manager.js';
import { getPresetDescriptions } from '../presets/types.js';

export function presetCommand(projectPath: string, presetName?: string): void {
    const absolutePath = path.resolve(projectPath);
    const project = configManager.getProject(absolutePath);
    
    if (!project) {
        console.log(chalk.yellow(`Project not found: ${absolutePath}`));
        return;
    }
    
    if (!presetName) {
        console.log(chalk.bold(`\nPreset for ${project.name}\n`));
        console.log(chalk.gray(`Current preset: ${project.preset || 'none'}`));
        console.log(chalk.gray('\nAvailable presets:'));
        getPresetDescriptions().forEach(p => {
            const current = p.name === project.preset ? chalk.green(' (current)') : '';
            console.log(chalk.gray(`  - ${p.name}: ${p.description}${current}`));
        });
        return;
    }
    
    const updated = configManager.updateProject(absolutePath, { preset: presetName });
    
    if (updated) {
        console.log(chalk.green(`✓ Preset changed to: ${presetName}`));
        console.log(chalk.gray(`  Project: ${project.name}`));
    } else {
        console.log(chalk.red('Failed to update preset'));
    }
}

export function listPresets(): void {
    console.log(chalk.bold('\nAvailable Presets\n'));
    getPresetDescriptions().forEach(p => {
        console.log(chalk.cyan(`  ${p.name}`));
        console.log(chalk.gray(`    ${p.description}`));
    });
}
