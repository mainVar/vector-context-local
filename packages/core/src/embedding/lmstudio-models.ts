
import { envManager } from '../utils/env-manager';

export interface LMStudioModel {
    id: string;
    object: string;
    type?: string;
}

/**
 * Fetch all models currently loaded in LM Studio via /v1/models endpoint.
 * Returns empty array if LM Studio is not running or unreachable.
 */
export async function fetchLMStudioModels(baseURL?: string): Promise<LMStudioModel[]> {
    const url = (baseURL || envManager.get('LMSTUDIO_BASE_URL') || 'http://localhost:1234/v1')
        .replace(/\/+$/, '');

    try {
        const response = await fetch(`${url}/models`, {
            headers: { Authorization: 'Bearer lm-studio' },
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            return [];
        }

        const json = await response.json() as { data?: LMStudioModel[] };
        return json.data || [];
    } catch {
        return [];
    }
}

/**
 * Fetch embedding model IDs from LM Studio.
 * Filters models whose id contains "embed" (case-insensitive).
 * Falls back to empty array when LM Studio is not running.
 */
export async function fetchLMStudioEmbeddingModels(baseURL?: string): Promise<string[]> {
    const models = await fetchLMStudioModels(baseURL);
    const embedding = models.filter(m => m.id.toLowerCase().includes('embed'));
    // If no models explicitly contain "embed", return all models so the user can still pick
    return (embedding.length > 0 ? embedding : models).map(m => m.id);
}
