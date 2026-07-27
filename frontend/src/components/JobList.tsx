import { useJobsStore } from '../store/jobsStore';
import { JobListItem } from './JobListItem';

export function JobList() {
  const jobs = useJobsStore((state) => state.jobs);
  const activeJobId = useJobsStore((state) => state.activeJobId);
  const setActiveJob = useJobsStore((state) => state.setActiveJob);

  return (
    <section className="panel">
      <h2>Задания</h2>
      {jobs.length === 0 ? (
        <p className="muted">Пока нет ни одного задания.</p>
      ) : (
        <ul className="job-list">
          {jobs.map((job) => (
            <JobListItem
              key={job.id}
              job={job}
              isActive={job.id === activeJobId}
              onSelect={setActiveJob}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
