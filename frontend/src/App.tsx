import { useEffect } from 'react';
import { CreateJobForm } from './components/CreateJobForm';
import { JobDetail } from './components/JobDetail';
import { JobList } from './components/JobList';
import { useJobPolling } from './hooks/useJobPolling';
import { useJobsStore } from './store/jobsStore';

export function App() {
  const activeJobId = useJobsStore((state) => state.activeJobId);
  const loadJobs = useJobsStore((state) => state.loadJobs);
  const error = useJobsStore((state) => state.error);
  const clearError = useJobsStore((state) => state.clearError);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useJobPolling(activeJobId);

  return (
    <main className="layout">
      <h1>url-probe</h1>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            ×
          </button>
        </div>
      )}

      <div className="columns">
        <div className="column column--side">
          <CreateJobForm />
          <JobList />
        </div>
        <div className="column">
          <JobDetail />
        </div>
      </div>
    </main>
  );
}
