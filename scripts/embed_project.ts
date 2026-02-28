import { LMStudioEmbedding } from './packages/core/src/embedding/lmstudio-embedding';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

// Configuration for LM Studio embedding
const embedding = new LMStudioEmbedding({
    model: 'nomic-embed-text', // default model, adjust if needed
    baseURL: 'http://localhost:1234/v1',
});

// Find all .ts source files in the project (excluding node_modules and test files)
const pattern = ['packages/**/*.ts', '!**/node_modules/**', '!**/*.test.ts'];
const files = fg.sync(pattern, { cwd: path.resolve(__dirname, '..'), absolute: true });

console.log(`🔎 Found ${files.length} TypeScript files to embed.`);

async function embedFiles() {
    const texts: string[] = [];
    const fileMap: Record<number, string> = {};

    files.forEach((filePath, idx) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        texts.push(content);
        fileMap[idx] = filePath;
    });

    try {
        const results = await embedding.embedBatch(texts);
        results.forEach((res: any, idx: number) => {
            const filePath = fileMap[idx];
            console.log(`✅ ${filePath}\n   • Dimension: ${res.dimension}\n   • Vector length: ${res.vector?.length ?? 'N/A'}`);
        });
    } catch (err) {
        console.error('❌ Embedding failed:', err);
    }
}

embedFiles();
