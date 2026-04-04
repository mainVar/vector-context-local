
export type IndexingSpeed = 'low' | 'medium' | 'max';

export interface IndexingSpeedConfig {
    /** Batch size inside LMStudioEmbedding.embedBatch */
    lmBatchSize: number;
    /** Delay in ms between LM Studio sub-batches */
    lmDelayMs: number;
    /** Number of code chunks buffered before sending to the embedding provider */
    embeddingBatchSize: number;
}

export const INDEXING_SPEED_PRESETS: Record<IndexingSpeed, IndexingSpeedConfig> = {
    low: {
        lmBatchSize: 3,
        lmDelayMs: 200,
        embeddingBatchSize: 50,
    },
    medium: {
        lmBatchSize: 7,
        lmDelayMs: 50,
        embeddingBatchSize: 100,
    },
    max: {
        lmBatchSize: 15,
        lmDelayMs: 0,
        embeddingBatchSize: 200,
    },
};

/**
 * Returns the IndexingSpeedConfig for the given preset name.
 * Defaults to 'medium' for unknown/undefined values.
 */
export function getIndexingSpeedConfig(speed?: string): IndexingSpeedConfig {
    return INDEXING_SPEED_PRESETS[(speed as IndexingSpeed)] ?? INDEXING_SPEED_PRESETS.medium;
}

export const INDEXING_SPEED_DESCRIPTIONS: Record<IndexingSpeed, string> = {
    low: 'Low load — small batches, pauses between requests. Best when working alongside indexing.',
    medium: 'Balanced — default behaviour, moderate GPU/CPU usage.',
    max: 'Max load — large batches, no delays. Fastest indexing, full hardware utilisation.',
};
