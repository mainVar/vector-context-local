import * as vscode from 'vscode';
import { SemanticSearchViewProvider } from './webview/semanticSearchProvider';

import { SearchCommand } from './commands/searchCommand';
import { IndexCommand } from './commands/indexCommand';
import { SyncCommand } from './commands/syncCommand';
import { ConfigManager } from './config/configManager';
import { Context, MilvusRestfulVectorDatabase, AstCodeSplitter, LangChainCodeSplitter, SplitterType } from '@vector-context/core';
import { envManager } from '@vector-context/core';
import { logger } from './utils/logger';

let semanticSearchProvider: SemanticSearchViewProvider;
let searchCommand: SearchCommand;
let indexCommand: IndexCommand;
let syncCommand: SyncCommand;
let configManager: ConfigManager;
let codeContext: Context;
let autoSyncDisposable: vscode.Disposable | null = null;

export async function activate(context: vscode.ExtensionContext) {
    logger.info('EXTENSION', 'Context extension is now active!');

    // Initialize config manager
    configManager = new ConfigManager(context);

    // Initialize shared context instance with embedding configuration
    codeContext = createContextWithConfig(configManager);

    // Initialize providers and commands
    searchCommand = new SearchCommand(codeContext);
    indexCommand = new IndexCommand(codeContext);
    syncCommand = new SyncCommand(codeContext);
    semanticSearchProvider = new SemanticSearchViewProvider(context.extensionUri, searchCommand, indexCommand, syncCommand, configManager);

    // Register command handlers
    const disposables = [
        // Register webview providers
        vscode.window.registerWebviewViewProvider(SemanticSearchViewProvider.viewType, semanticSearchProvider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }),

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('semanticCodeSearch.embeddingProvider') ||
                event.affectsConfiguration('semanticCodeSearch.milvus') ||
                event.affectsConfiguration('semanticCodeSearch.splitter') ||
                event.affectsConfiguration('semanticCodeSearch.autoSync')) {
                logger.info('EXTENSION', 'Context configuration changed, reloading...');
                reloadContextConfiguration();
            }
        }),

        // Register commands
        vscode.commands.registerCommand('semanticCodeSearch.semanticSearch', () => {
            // Get selected text from active editor
            const editor = vscode.window.activeTextEditor;
            const selectedText = editor?.document.getText(editor.selection);
            return searchCommand.execute(selectedText);
        }),
        vscode.commands.registerCommand('semanticCodeSearch.indexCodebase', () => indexCommand.execute()),
        vscode.commands.registerCommand('semanticCodeSearch.clearIndex', () => indexCommand.clearIndex()),
        vscode.commands.registerCommand('semanticCodeSearch.reloadConfiguration', () => reloadContextConfiguration())
    ];

    context.subscriptions.push(...disposables);

    // Initialize auto-sync if enabled
    setupAutoSync();

    // Run initial sync on startup
    runInitialSync();

    // Show status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(search) Context`;
    statusBarItem.tooltip = 'Click to open semantic search';
    statusBarItem.command = 'semanticCodeSearch.semanticSearch';
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);
}

async function runInitialSync() {
    try {
        logger.info('STARTUP', 'Running initial sync...');
        await syncCommand.executeSilent();
        logger.info('STARTUP', 'Initial sync completed');
    } catch (error) {
        logger.error('STARTUP', 'Initial sync failed:', error);
    }
}

function setupAutoSync() {
    const config = vscode.workspace.getConfiguration('semanticCodeSearch');
    const autoSyncEnabled = config.get<boolean>('autoSync.enabled', true);
    const autoSyncInterval = config.get<number>('autoSync.intervalMinutes', 5);

    // Stop existing auto-sync if running
    if (autoSyncDisposable) {
        autoSyncDisposable.dispose();
        autoSyncDisposable = null;
    }

    if (autoSyncEnabled) {
        logger.info('AUTO-SYNC', `Setting up auto-sync with ${autoSyncInterval} minute interval`);

        // Start periodic auto-sync
        syncCommand.startAutoSync(autoSyncInterval).then(disposable => {
            autoSyncDisposable = disposable;
        }).catch(error => {
            logger.error('AUTO-SYNC', 'Failed to start auto-sync:', error);
            vscode.window.showErrorMessage(`Failed to start auto-sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    } else {
        logger.info('AUTO-SYNC', 'Auto-sync disabled');
    }
}

function createContextWithConfig(configManager: ConfigManager): Context {
    const embeddingConfig = configManager.getEmbeddingProviderConfig();
    const milvusConfig = configManager.getMilvusFullConfig();
    const splitterConfig = configManager.getSplitterConfig();

    try {
        let embedding;
        let vectorDatabase;

        const contextConfig: any = {};

        // Create embedding instance
        if (embeddingConfig) {
            embedding = ConfigManager.createEmbeddingInstance(embeddingConfig.provider, embeddingConfig.config);
            logger.info('CONTEXT', `Embedding initialized with ${embeddingConfig.provider} (model: ${embeddingConfig.config.model})`);
            contextConfig.embedding = embedding;
        } else {
            logger.info('CONTEXT', 'No embedding configuration found');
        }

        // Create vector database instance
        if (milvusConfig) {
            vectorDatabase = new MilvusRestfulVectorDatabase(milvusConfig);
            logger.info('CONTEXT', `Vector database initialized with Milvus REST API (address: ${milvusConfig.address})`);
            contextConfig.vectorDatabase = vectorDatabase;
        } else {
            vectorDatabase = new MilvusRestfulVectorDatabase({
                address: envManager.get('MILVUS_ADDRESS') || 'http://localhost:19530',
                token: envManager.get('MILVUS_TOKEN') || ''
            });
            logger.info('CONTEXT', 'No Milvus configuration found, using default REST API configuration');
            contextConfig.vectorDatabase = vectorDatabase;
        }

        // Create splitter instance
        let codeSplitter;
        if (splitterConfig) {
            if (splitterConfig.type === SplitterType.LANGCHAIN) {
                codeSplitter = new LangChainCodeSplitter(
                    splitterConfig.chunkSize ?? 1000,
                    splitterConfig.chunkOverlap ?? 200
                );
            } else { // Default to AST splitter
                codeSplitter = new AstCodeSplitter(
                    splitterConfig.chunkSize ?? 2500,
                    splitterConfig.chunkOverlap ?? 300
                );
            }
            contextConfig.codeSplitter = codeSplitter;
            logger.info('CONTEXT', `Splitter configured: ${splitterConfig.type} (chunkSize: ${splitterConfig.chunkSize}, overlap: ${splitterConfig.chunkOverlap})`);
        } else {
            codeSplitter = new AstCodeSplitter(2500, 300);
            contextConfig.codeSplitter = codeSplitter;
            logger.info('CONTEXT', 'No splitter configuration found, using default AST splitter (chunkSize: 2500, overlap: 300)');
        }
        return new Context(contextConfig);
    } catch (error) {
        logger.error('CONTEXT', 'Failed to create Context with user config:', error);
        vscode.window.showErrorMessage(`Failed to initialize Context: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}

function reloadContextConfiguration() {
    logger.info('CONTEXT', 'Reloading Context configuration...');

    const embeddingConfig = configManager.getEmbeddingProviderConfig();
    const milvusConfig = configManager.getMilvusFullConfig();
    const splitterConfig = configManager.getSplitterConfig();

    try {
        // Update embedding if configuration exists
        if (embeddingConfig) {
            const embedding = ConfigManager.createEmbeddingInstance(embeddingConfig.provider, embeddingConfig.config);
            codeContext.updateEmbedding(embedding);
            logger.info('CONTEXT', `Embedding updated with ${embeddingConfig.provider} (model: ${embeddingConfig.config.model})`);
        }

        // Update vector database if configuration exists
        if (milvusConfig) {
            const vectorDatabase = new MilvusRestfulVectorDatabase(milvusConfig);
            codeContext.updateVectorDatabase(vectorDatabase);
            logger.info('CONTEXT', `Vector database updated with Milvus REST API (address: ${milvusConfig.address})`);
        }

        // Update splitter if configuration exists
        if (splitterConfig) {
            let newSplitter;
            if (splitterConfig.type === SplitterType.LANGCHAIN) {
                newSplitter = new LangChainCodeSplitter(
                    splitterConfig.chunkSize ?? 1000,
                    splitterConfig.chunkOverlap ?? 200
                );
            } else {
                newSplitter = new AstCodeSplitter(
                    splitterConfig.chunkSize ?? 2500,
                    splitterConfig.chunkOverlap ?? 300
                );
            }
            codeContext.updateSplitter(newSplitter);
            logger.info('CONTEXT', `Splitter updated: ${splitterConfig.type} (chunkSize: ${splitterConfig.chunkSize}, overlap: ${splitterConfig.chunkOverlap})`);
        } else {
            const defaultSplitter = new AstCodeSplitter(2500, 300);
            codeContext.updateSplitter(defaultSplitter);
            logger.info('CONTEXT', 'No splitter configuration found, using default AST splitter (chunkSize: 2500, overlap: 300)');
        }

        // Update command instances with new context
        searchCommand.updateContext(codeContext);
        indexCommand.updateContext(codeContext);
        syncCommand.updateContext(codeContext);

        // Restart auto-sync if it was enabled
        setupAutoSync();

        logger.info('CONTEXT', 'Context configuration reloaded successfully');
        vscode.window.showInformationMessage('Configuration reloaded successfully!');
    } catch (error) {
        logger.error('CONTEXT', 'Failed to reload Context configuration:', error);
        vscode.window.showErrorMessage(`Failed to reload configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate() {
    logger.info('EXTENSION', 'Context extension is now deactivated');

    // Stop auto-sync if running
    if (autoSyncDisposable) {
        autoSyncDisposable.dispose();
        autoSyncDisposable = null;
    }

    logger.dispose();
}