import { create } from 'zustand';
import { cancelJob, createJob, fetchJobs } from '../api/jobs';
import type { JobDetail, JobSummary } from '../api/types';

interface JobsState {
  jobs: JobSummary[];
  activeJobId: string | null;
  activeJob: JobDetail | null;
  isCreating: boolean;
  isCancelling: boolean;
  error: string | null;

  loadJobs: () => Promise<void>;
  submitUrls: (urls: string[]) => Promise<void>;
  setActiveJob: (id: string) => void;
  applyJobDetail: (detail: JobDetail) => void;
  cancelActiveJob: () => Promise<void>;
  clearError: () => void;
}

const toSummary = ({ urls: _urls, ...summary }: JobDetail): JobSummary => summary;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : 'Неизвестная ошибка';

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  activeJobId: null,
  activeJob: null,
  isCreating: false,
  isCancelling: false,
  error: null,

  loadJobs: async () => {
    try {
      set({ jobs: await fetchJobs() });
    } catch (error) {
      set({ error: messageOf(error) });
    }
  },

  submitUrls: async (urls) => {
    set({ isCreating: true, error: null });

    try {
      const { jobId } = await createJob(urls);
      set({ activeJobId: jobId, activeJob: null });
      await get().loadJobs();
    } catch (error) {
      set({ error: messageOf(error) });
    } finally {
      set({ isCreating: false });
    }
  },

  setActiveJob: (id) => {
    if (id === get().activeJobId) {
      return;
    }

    // Drop the previous job's detail so the UI never shows stale rows while the
    // first poll for the new job is still in flight.
    set({ activeJobId: id, activeJob: null });
  },

  /**
   * The single write path for polled detail. Responses that arrive after the
   * user switched jobs are discarded here, which keeps the guarantee even if an
   * abort loses the race with a resolving fetch.
   */
  applyJobDetail: (detail) => {
    if (detail.id !== get().activeJobId) {
      return;
    }

    set((state) => ({
      activeJob: detail,
      jobs: state.jobs.map((job) => (job.id === detail.id ? toSummary(detail) : job)),
    }));
  },

  cancelActiveJob: async () => {
    const { activeJobId } = get();

    if (!activeJobId) {
      return;
    }

    set({ isCancelling: true });

    try {
      get().applyJobDetail(await cancelJob(activeJobId));
    } catch (error) {
      set({ error: messageOf(error) });
    } finally {
      set({ isCancelling: false });
    }
  },

  clearError: () => set({ error: null }),
}));
