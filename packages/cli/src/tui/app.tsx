import React, { useState, useEffect, useRef } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import chalk from 'chalk';
import { configManager } from '../config/manager.js';
import { getProjectsWithStatus } from '../commands/status.js';
import { listPresets } from '../commands/preset.js';
import { ProjectWithStatus } from '../config/types.js';
import { getPresetDescriptions } from '../presets/types.js';
import { indexCommand } from '../commands/index.js';
import { addCommand } from '../commands/add.js';
import { removeCommand } from '../commands/remove.js';
import { watchCommand } from '../commands/watch.js';

type Screen = 'main' | 'add' | 'edit' | 'presets' | 'indexing';

interface TUIState {
    projects: ProjectWithStatus[];
    selected: number;
    selectedPreset: number;
    screen: Screen;
    input: string;
    message: string | null;
    messageType: 'success' | 'error' | 'info';
}

function App() {
    const { exit } = useApp();
    const [state, setState] = useState<TUIState>({
        projects: [],
        selected: 0,
        selectedPreset: 0,
        screen: 'main',
        input: '',
        message: null,
        messageType: 'info',
    });

    const refreshProjects = () => {
        const projects = getProjectsWithStatus();
        setState(prev => ({
            ...prev,
            projects,
            selected: Math.min(prev.selected, Math.max(0, projects.length - 1)),
        }));
    };

    useEffect(() => {
        refreshProjects();
    }, []);

    useEffect(() => {
        if (state.message) {
            const timer = setTimeout(() => {
                setState(prev => ({ ...prev, message: null }));
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [state.message]);

    const showMessage = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setState(prev => ({ ...prev, message, messageType: type }));
    };

    const stateRef = useRef(state);
    stateRef.current = state;

    const { projects, selected, selectedPreset, screen, input, message, messageType } = state;
    const selectedProject = projects[selected];

    useInput((inputKey, key) => {
        const currentState = stateRef.current;
        if (currentState.screen === 'main') {
            if (key.upArrow) {
                setState(prev => ({
                    ...prev,
                    selected: Math.max(0, prev.selected - 1),
                }));
            } else if (key.downArrow) {
                setState(prev => ({
                    ...prev,
                    selected: Math.min(prev.projects.length - 1, prev.selected + 1),
                }));
            } else if (inputKey === 'a') {
                setState(prev => ({ ...prev, screen: 'add', input: '' }));
            } else if (inputKey === 'r' && currentState.projects[currentState.selected]) {
                const project = currentState.projects[currentState.selected];
                configManager.removeProject(project.path);
                showMessage(`Removed: ${project.name}`, 'success');
                refreshProjects();
            } else if (inputKey === 'i' && currentState.projects[currentState.selected]) {
                const project = currentState.projects[currentState.selected];
                setState(prev => ({ ...prev, screen: 'indexing' }));
                indexCommand(project.path, { verbose: false })
                    .then(() => {
                        showMessage(`Indexed: ${project.name}`, 'success');
                        refreshProjects();
                        setState(prev => ({ ...prev, screen: 'main' }));
                    })
                    .catch(err => {
                        showMessage(`Error: ${err.message}`, 'error');
                        setState(prev => ({ ...prev, screen: 'main' }));
                    });
            } else if (inputKey === 'e' && currentState.projects[currentState.selected]) {
                setState(prev => ({ ...prev, screen: 'edit' }));
            } else if (inputKey === 'p' && currentState.projects[currentState.selected]) {
                setState(prev => ({ ...prev, screen: 'presets', selectedPreset: 0 }));
            } else if (inputKey === 'l') {
                refreshProjects();
                showMessage('Projects refreshed', 'info');
            } else if (inputKey === 'w') {
                (async () => {
                    exit();
                    await new Promise(r => setTimeout(r, 100));
                    await watchCommand();
                })();
            } else if (key.escape || inputKey === 'q') {
                exit();
            }
        } else if (currentState.screen === 'presets') {
            const presets = getPresetDescriptions();
            if (key.escape) {
                setState(prev => ({ ...prev, screen: 'main' }));
            } else if (key.upArrow) {
                setState(prev => ({
                    ...prev,
                    selectedPreset: Math.max(0, prev.selectedPreset - 1),
                }));
            } else if (key.downArrow) {
                setState(prev => ({
                    ...prev,
                    selectedPreset: Math.min(presets.length - 1, prev.selectedPreset + 1),
                }));
            } else if (key.return && currentState.projects[currentState.selected]) {
                const preset = presets[currentState.selectedPreset];
                const project = currentState.projects[currentState.selected];
                configManager.updateProject(project.path, { preset: preset.name });
                showMessage(`Preset changed to: ${preset.name}`, 'success');
                refreshProjects();
                setState(prev => ({ ...prev, screen: 'main' }));
            }
        } else {
            if (key.escape) {
                setState(prev => ({ ...prev, screen: 'main', input: '' }));
            } else if (key.return) {
                if (currentState.screen === 'add' && currentState.input.trim()) {
                    try {
                        addCommand(currentState.input.trim(), {});
                        showMessage(`Added: ${currentState.input.trim()}`, 'success');
                        refreshProjects();
                    } catch (err: any) {
                        showMessage(`Error: ${err.message}`, 'error');
                    }
                    setState(prev => ({ ...prev, screen: 'main', input: '' }));
                }
            } else if (key.backspace || key.delete) {
                setState(prev => ({
                    ...prev,
                    input: prev.input.slice(0, -1),
                }));
            } else if (inputKey && !key.ctrl && !key.meta) {
                setState(prev => ({
                    ...prev,
                    input: prev.input + inputKey,
                }));
            }
        }
    });

    if (screen === 'indexing') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text color="cyan">Indexing project...</Text>
                <Text dimColor>Please wait...</Text>
            </Box>
        );
    }

    if (screen === 'add') {
        return (
            <Box flexDirection="column" padding={1}>
                <Text bold color="cyan">Add New Project</Text>
                <Box marginTop={1}>
                    <Text>Path: </Text>
                    <Text color="green">{input}</Text>
                    <Text dimColor>_</Text>
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Press Enter to add, Escape to cancel</Text>
                </Box>
            </Box>
        );
    }

    if (screen === 'presets') {
        const presets = getPresetDescriptions();
        return (
            <Box flexDirection="column" padding={1}>
                <Text bold color="cyan">Select Preset for: {selectedProject?.name}</Text>
                <Text dimColor>Current: {selectedProject?.preset || 'none'}</Text>
                <Box flexDirection="column" marginTop={1}>
                    {presets.map((preset, index) => {
                        const isSelected = index === state.selectedPreset;
                        const isCurrent = preset.name === selectedProject?.preset;
                        return (
                            <Box key={preset.name}>
                                <Text color={isSelected ? 'cyan' : undefined}>
                                    {isSelected ? '> ' : '  '}
                                    {isCurrent ? '* ' : '  '}
                                    <Text color="yellow">{preset.name.padEnd(10)}</Text>
                                    <Text dimColor>{preset.description}</Text>
                                </Text>
                            </Box>
                        );
                    })}
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>↑↓ Navigate | Enter Apply | Esc Cancel</Text>
                </Box>
            </Box>
        );
    }

    if (screen === 'edit' && selectedProject) {
        return (
            <Box flexDirection="column" padding={1}>
                <Text bold color="cyan">Edit Project: {selectedProject.name}</Text>
                <Box marginTop={1} flexDirection="column">
                    <Text>Path: <Text dimColor>{selectedProject.path}</Text></Text>
                    <Text>Preset: <Text color="yellow">{selectedProject.preset || 'none'}</Text></Text>
                    <Text>Custom Ignores: <Text color="yellow">{selectedProject.customIgnore.length}</Text></Text>
                    <Text>Enabled: <Text color={selectedProject.enabled ? 'green' : 'red'}>{selectedProject.enabled ? 'yes' : 'no'}</Text></Text>
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Press Escape to go back</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1}>
            <Box marginBottom={1}>
                <Text bold color="cyan">Vector Context CLI - Project Manager</Text>
            </Box>

            {message && (
                <Box marginBottom={1}>
                    <Text color={messageType === 'error' ? 'red' : messageType === 'success' ? 'green' : 'yellow'}>
                        {message}
                    </Text>
                </Box>
            )}

            <Box flexDirection="column" marginBottom={1}>
                <Text bold>Projects ({projects.length})</Text>
                {projects.length === 0 ? (
                    <Box marginTop={1}>
                        <Text dimColor>No projects configured. Press 'a' to add one.</Text>
                    </Box>
                ) : (
                    projects.map((project, index) => {
                        const isSelected = index === selected;
                        const statusIcon = getStatusIcon(project.status);
                        const statusText = getStatusText(project.status);
                        
                        return (
                            <Box key={project.path}>
                                <Text color={isSelected ? 'cyan' : undefined}>
                                    {isSelected ? '> ' : '  '}
                                    {statusIcon} {project.name}
                                </Text>
                                <Text dimColor>
                                    {' '}
                                    {statusText}
                                    {project.indexedFiles !== undefined && ` (${project.indexedFiles} files)`}
                                </Text>
                            </Box>
                        );
                    })
                )}
            </Box>

            {selectedProject && (
                <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
                    <Text bold>{selectedProject.name}</Text>
                    <Text dimColor>Path: {selectedProject.path}</Text>
                    <Text dimColor>Preset: {selectedProject.preset || 'none'}</Text>
                    {selectedProject.indexingProgress !== undefined && (
                        <Text dimColor>Progress: {selectedProject.indexingProgress}%</Text>
                    )}
                </Box>
            )}

            <Box marginTop={1}>
                <Text dimColor>
                    [a] Add [r] Remove [i] Index [e] Edit [p] Presets [l] Refresh [w] Watch [q] Quit
                </Text>
            </Box>
        </Box>
    );
}

function getStatusIcon(status: string): string {
    switch (status) {
        case 'indexed': return '✓';
        case 'indexing': return '◐';
        case 'indexfailed': return '✗';
        default: return '○';
    }
}

function getStatusText(status: string): string {
    switch (status) {
        case 'indexed': return 'indexed';
        case 'indexing': return 'indexing';
        case 'indexfailed': return 'failed';
        default: return 'waiting';
    }
}

export async function runTUI(): Promise<void> {
    const { waitUntilExit } = render(<App />);
    await waitUntilExit();
}
