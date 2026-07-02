// Status of the photo → menu AI analysis, per restaurant. The signup wizard
// kicks the job off in the background; the dashboard Menu page polls this.

export type GenerationStatus = "idle" | "running" | "done" | "failed" | "skipped";

export interface GenerationJob {
  status: GenerationStatus;
  /** Human-readable detail (error message, skip reason, or item count). */
  message?: string;
  itemCount?: number;
  updatedAt: string;
}

interface GenerationStore {
  jobs: Map<string, GenerationJob>;
}

const globalForGeneration = globalThis as unknown as {
  __tabloGenerationStore?: GenerationStore;
};

function getStore(): GenerationStore {
  if (!globalForGeneration.__tabloGenerationStore) {
    globalForGeneration.__tabloGenerationStore = { jobs: new Map() };
  }
  return globalForGeneration.__tabloGenerationStore;
}

export function getGenerationJob(restaurantId: string): GenerationJob {
  return (
    getStore().jobs.get(restaurantId) ?? {
      status: "idle",
      updatedAt: new Date(0).toISOString(),
    }
  );
}

export function setGenerationJob(
  restaurantId: string,
  job: Omit<GenerationJob, "updatedAt">,
): GenerationJob {
  const value: GenerationJob = { ...job, updatedAt: new Date().toISOString() };
  getStore().jobs.set(restaurantId, value);
  return value;
}
