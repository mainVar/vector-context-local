import * as path from 'path';
import chalk from 'chalk';
import { configManager } from '../config/manager.js';
import { getPresetNames, getPresetDescriptions } from '../presets/types.js';

export interface AddCommandOptions {
    preset?: string;
    name?: string;
    ignore?: string | string[];
    extensions?: string | string[];
    disabled?: boolean;
}

export function addCommand(projectPath: string, options: AddCommandOptions = {}): void {
    const absolutePath = path.resolve(projectPath);
    
    const existing = configManager.getProject(absolutePath);
    if (existing) {
        console.log(chalk.yellow(`Project already exists: ${existing.name}`));
        console.log(chalk.gray(`  Path: ${absolutePath}`));
        console.log(chalk.gray(`  Use 'vctx remove ${absolutePath}' to remove it first`));
        return;
    }

    let preset = options.preset;
    if (preset && !getPresetNames().includes(preset)) {
        console.log(chalk.red(`Unknown preset: ${preset}`));
        console.log(chalk.gray('Available presets:'));
        getPresetDescriptions().forEach(p => {
            console.log(chalk.gray(`  - ${p.name}: ${p.description}`));
        });
        return;
    }

    const customIgnore = Array.isArray(options.ignore) 
        ? options.ignore 
        : options.ignore 
            ? [options.ignore] 
            : [];

    const customExtensions = Array.isArray(options.extensions)
        ? options.extensions
        : options.extensions
            ? [options.extensions]
            : [];

    try {
        const project = configManager.addProject(absolutePath, {
            name: options.name,
            preset,
            customIgnore,
            customExtensions,
            enabled: !options.disabled,
        });

        console.log(chalk.green(`✓ Project added: ${project.name}`));
        console.log(chalk.gray(`  Path: ${project.path}`));
        console.log(chalk.gray(`  Preset: ${project.preset || 'auto-detected'}`));
        if (customIgnore.length > 0) {
            console.log(chalk.gray(`  Custom ignores: ${customIgnore.length} patterns`));
        }
        if (customExtensions.length > 0) {
            console.log(chalk.gray(`  Custom extensions: ${customExtensions.join(', ')}`));
        }
        console.log(chalk.gray(`  Status: ${project.enabled ? 'enabled' : 'disabled'}`));
    } catch (error: any) {
        console.log(chalk.red(`Error: ${error.message}`));
    }
}
