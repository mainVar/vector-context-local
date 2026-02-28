
import { createMcpConfig } from '../mcp/src/config';
import { getDefaultModelForProvider } from '../mcp/src/config';

console.log("🔍 Config Resolution Debug");
console.log("--------------------------------");

// 1. Check Default Model for LMStudio
const defaultModel = getDefaultModelForProvider('LMStudio');
console.log(`Default Model for LMStudio: "${defaultModel}"`);

// 2. Check Full Config Resolution
process.env.EMBEDDING_PROVIDER = 'LMStudio';
// Ensure explicit override is NOT set for this test (unless it's in system env)
// process.env.EMBEDDING_MODEL = ... 

const config = createMcpConfig();
console.log("\nResolved Config:");
console.log(`Provider: ${config.embeddingProvider}`);
console.log(`Model: "${config.embeddingModel}"`);

if (config.embeddingModel === 'text-embedding-nomic-embed-text-v1.5') {
    console.log("\n✅ SUCCESS: Correct model resolved.");
} else {
    console.log("\n❌ FAILURE: Incorrect model resolved.");
    console.log("Potential Causes:");
    console.log("1. EMBEDDING_MODEL env var is set.");
    console.log("2. config.ts was not compiled correctly.");
}
