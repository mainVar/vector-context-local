
import { spawn } from 'child_process';
import * as path from 'path';
import * as readline from 'readline';

const projectRoot = 'd:\\Projects\\vector-context-local';
const mcpScript = path.join(projectRoot, 'packages', 'mcp', 'src', 'index.ts');

console.log(`Starting MCP server at: ${mcpScript}`);

const isWindows = process.platform === 'win32';
// Use the local tsx found in packages/mcp/node_modules/.bin
const tsxPath = path.join(projectRoot, 'packages', 'mcp', 'node_modules', '.bin', isWindows ? 'tsx.CMD' : 'tsx');

const server = spawn(tsxPath, [mcpScript], {
    cwd: projectRoot,
    shell: true, // Required for .CMD files on Windows
    env: {
        ...process.env,
        PATH: process.env.PATH,
        VECTOR_STORE_PROVIDER: 'Qdrant',
        EMBEDDING_PROVIDER: 'LMStudio'
    },
    stdio: ['pipe', 'pipe', 'inherit']
});

const reader = readline.createInterface({ input: server.stdout });

let step = 0;
let nextId = 1;

function send(method: string, params?: any) {
    const msg = {
        jsonrpc: '2.0',
        id: nextId++,
        method,
        params
    };
    const str = JSON.stringify(msg);
    // console.log('Sending:', str);
    server.stdin.write(str + '\n');
}

reader.on('line', (line) => {
    // console.log('Received:', line);
    try {
        const msg = JSON.parse(line);
        handleMessage(msg);
    } catch (e) {
        console.error('Failed to parse JSON:', line);
    }
});

function handleMessage(msg: any) {
    if (msg.result) {
        if (msg.id === 1) {
            console.log('✅ Initialized');
            // Call index_codebase
            step = 1;
            console.log('🚀 Requesting index_codebase for packages/core...');
            send('tools/call', {
                name: 'index_codebase',
                arguments: {
                    path: path.join(projectRoot, 'packages', 'core'),
                    force: true
                }
            });
        } else if (msg.id === 2 && step === 1) {
            console.log('✅ Indexing started:', msg.result);
            step = 2;
            // Now polling status
            checkStatus();
        } else if (msg.id > 2 && step === 2) {
            // Status result
            const content = msg.result.content?.[0]?.text;
            console.log('📊 Status update:', content);
            if (content && content.includes('fully indexed')) {
                console.log('🎉 Indexing Complete!');
                cleanup();
            } else if (content && content.includes('failed')) {
                console.log('❌ Indexing Failed!');
                cleanup();
            } else {
                setTimeout(checkStatus, 2000);
            }
        }
    } else if (msg.error) {
        console.error('❌ Error response:', msg.error);
        cleanup();
    }
}

function checkStatus() {
    send('tools/call', {
        name: 'get_indexing_status',
        arguments: {
            path: path.join(projectRoot, 'packages', 'core')
        }
    });
}

function cleanup() {
    server.kill();
    process.exit(0);
}

// Initial handshake
send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'debugger', version: '1.0' }
});

// Also handle notifications if any (MCP sends notifications?)
