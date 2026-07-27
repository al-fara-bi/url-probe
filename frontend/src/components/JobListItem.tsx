import type { JobSummary } from '../api/types';
import { JOB_STATUS_LABELS, formatDateTime } from '../labels';

interface Props {
  job: JobSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
}

export function JobListItem({ job, isActive, onSelect }: Props) {
  return (
    <li>
      <button
        type="button"
        className={isActive ? 'job-item job-item--active' : 'job-item'}
        onClick={() => onSelect(job.id)}
      >
        <span className="job-item__date">{formatDateTime(job.createdAt)}</span>
        <span className={`badge badge--${job.status}`}>{JOB_STATUS_LABELS[job.status]}</span>
        <span className="muted">
          {job.processed}/{job.total} · успешно {job.succeeded} · с ошибкой {job.failed}
        </span>
        <code className="job-item__id">{job.id.slice(0, 8)}</code>
      </button>
    </li>
  );
}
