import * as path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { configManager } from '../config/manager.js';
import { 
    Context, 
    ContextConfig, 
    QdrantVectorDB, 
    MilvusVectorDatabase,
    OpenAIEmbedding,
    VoyageAIEmbedding,
    GeminiEmbedding,
    OllamaEmbedding,
    LMStudioEmbedding,
    envManager,
    logger
} from '@vector-context/core';

function createEmbedding() {
    const provider = envManager.get('EMBEDDING_PROVIDER') || 'LMStudio';
    const model = envManager.get('EMBEDDING_MODEL');
    
    switch (provider) {
        case 'OpenAI':
            return new OpenAIEmbedding({
                apiKey: envManager.get('OPENAI_API_KEY') || '',
                model: model || 'text-embedding-3-small',
                ...(envManager.get('OPENAI_BASE_URL') && { baseURL: envManager.get('OPENAI_BASE_URL') }),
            });
        case 'VoyageAI':
            return new VoyageAIEmbedding({
                apiKey: envManager.get('VOYAGEAI_API_KEY') || '',
                model: model || 'voyage-code-3',
            });
        case 'Gemini':
            return new GeminiEmbedding({
                apiKey: envManager.get('GEMINI_API_KEY') || '',
                model: model || 'gemini-embedding-001',
                ...(envManager.get('GEMINI_BASE_URL') && { baseURL: envManager.get('GEMINI_BASE_URL') }),
            });
        case 'Ollama':
            return new OllamaEmbedding({
                model: model || envManager.get('OLLAMA_MODEL') || 'nomic-embed-text',
                host: envManager.get('OLLAMA_HOST') || 'http://127.0.0.1:11434',
            });
        case 'LMStudio':
        default:
            return new LMStudioEmbedding({
                model: model || 'text-embedding-nomic-embed-text-v1.5',
                baseURL: envManager.get('LMSTUDIO_BASE_URL') || 'http://localhost:1234/v1',
            });
    }
}

function createVectorDatabase() {
    const provider = envManager.get('VECTOR_STORE_PROVIDER') || 'Qdrant';
    
    if (provider === 'Qdrant') {
        return new QdrantVectorDB(envManager.get('QDRANT_ADDRESS') || 'http://localhost:6333');
    } else {
        return new MilvusVectorDatabase({
            address: envManager.get('MILVUS_ADDRESS'),
            ...(envManager.get('MILVUS_TOKEN') && { token: envManager.get('MILVUS_TOKEN') }),
        });
    }
}

interface ProjectWatcher {
    projectPath: string;
    projectName: string;
    context: Context;
    watcher: ReturnType<typeof chokidar.watch> | null;
}

const DEBOUNCE_MS = 2000;

export async function watchCommand(): Promise<void> {
    const projects = configManager.getEnabledProjects();
    
    if (projects.length === 0) {
        console.log(chalk.yellow('No enabled projects to watch.'));
        console.log(chalk.gray('Use "vctx add <path>" to add projects first.'));
        return;
    }
    
    console.log(chalk.bold.cyan('\n👀 Vector Context Watch Mode\n'));
    console.log(chalk.gray(`Watching ${projects.length} project(s) for changes...\n`));
    
    const watchers: ProjectWatcher[] = [];
    
    for (const project of projects) {
        const ignorePatterns = configManager.getEffectiveIgnorePatterns(project.path);
        const customExtensions = configManager.getEffectiveExtensions(project.path);
        
        const contextConfig: ContextConfig = {
            ignorePatterns,
            customExtensions,
            customIgnorePatterns: project.customIgnore,
        };
        
        const embedding = createEmbedding();
        const vectorDatabase = createVectorDatabase();
        
        const context = new Context({
            ...contextConfig,
            embedding,
            vectorDatabase,
        });
        
        watchers.push({
            projectPath: project.path,
            projectName: project.name,
            context,
            watcher: null,
        });
    }
    
    for (const pw of watchers) {
        const extensions = pw.context.getSupportedExtensions();
        const ignorePatterns = pw.context.getIgnorePatterns();
        
        const globPattern = `**/*{${extensions.map(e => e.replace('.', '')).join(',')}}`;
        
        const ignoredPatterns = ignorePatterns.map(p => {
            if (p.endsWith('/**')) {
                return p.replace('/**', '');
            }
            return p;
        });
        
        console.log(chalk.gray(`  Watching: ${pw.projectName}`));
        console.log(chalk.gray(`    Path: ${pw.projectPath}`));
        console.log(chalk.gray(`    Extensions: ${extensions.length}`));
        
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let pendingChanges = new Set<string>();
        
        const watcher = chokidar.watch(pw.projectPath, {
            ignored: ignoredPatterns,
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
            }
        });
        
        const handleChange = async (eventType: string, filePath: string) => {
            const ext = path.extname(filePath);
            if (!extensions.includes(ext)) {
                return;
            }
            
            const relativePath = path.relative(pw.projectPath, filePath);
            pendingChanges.add(relativePath);
            
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
            
            debounceTimer = setTimeout(async () => {
                const changes = [...pendingChanges];
                pendingChanges.clear();
                
                console.log(chalk.cyan(`\n📝 [${pw.projectName}] ${eventType}: ${changes.length} file(s)`));
                changes.forEach(f => console.log(chalk.gray(`    ${f}`)));
                
                try {
                    const result = await pw.context.reindexByChange(pw.projectPath, (progress) => {
                        process.stdout.write(`\r    ${chalk.gray(progress.phase)}...`);
                    });
                    
                    console.log();
                    if (result.added > 0 || result.modified > 0 || result.removed > 0) {
                        console.log(chalk.green(`    ✓ Indexed: ${result.added} added, ${result.modified} modified, ${result.removed} removed`));
                    } else {
                        console.log(chalk.gray('    No index changes needed'));
                    }
                    
                    configManager.updateProject(pw.projectPath, {
                        lastIndexed: new Date().toISOString(),
                    });
                } catch (error: any) {
                    console.log();
                    console.log(chalk.red(`    ✗ Error: ${error.message}`));
                }
            }, DEBOUNCE_MS);
        };
        
        watcher
            .on('add', (filePath: string) => handleChange('Added', filePath))
            .on('change', (filePath: string) => handleChange('Modified', filePath))
            .on('unlink', (filePath: string) => handleChange('Deleted', filePath))
            .on('error', (error: unknown) => {
                console.log(chalk.red(`\n    ✗ Watcher error: ${error}`));
            });
        
        pw.watcher = watcher;
    }
    
    console.log(chalk.gray('\n  Press Ctrl+C to stop watching...\n'));
    console.log(chalk.gray('─'.repeat(50)));
    
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n\n👋 Stopping watchers...'));
        
        for (const pw of watchers) {
            if (pw.watcher) {
                await pw.watcher.close();
            }
        }
        
        console.log(chalk.green('✓ All watchers stopped.'));
        process.exit(0);
    });
    
    await new Promise(() => {});
}
