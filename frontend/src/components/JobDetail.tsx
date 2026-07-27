import { isTerminalJobStatus } from '../api/types';
import { JOB_STATUS_LABELS, formatDateTime } from '../labels';
import { useJobsStore } from '../store/jobsStore';
import { ProgressBar } from './ProgressBar';
import { UrlTable } from './UrlTable';

export function JobDetail() {
  const job = useJobsStore((state) => state.activeJob);
  const activeJobId = useJobsStore((state) => state.activeJobId);
  const isCancelling = useJobsStore((state) => state.isCancelling);
  const cancelActiveJob = useJobsStore((state) => state.cancelActiveJob);

  if (!activeJobId) {
    return (
      <section className="panel">
        <p className="muted">Выберите задание или создайте новое.</p>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="panel">
        <p className="muted">Загрузка задания…</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="job-detail__header">
        <div>
          <h2>Задание {job.id.slice(0, 8)}</h2>
          <p className="muted">{formatDateTime(job.createdAt)}</p>
        </div>
        <span className={`badge badge--${job.status}`}>{JOB_STATUS_LABELS[job.status]}</span>
      </header>

      <p>
        Обработано {job.processed} из {job.total} · успешно {job.succeeded} · с ошибкой {job.failed}
      </p>
      <ProgressBar processed={job.processed} total={job.total} />

      {!isTerminalJobStatus(job.status) && (
        <button
          type="button"
          className="danger"
          onClick={() => void cancelActiveJob()}
          disabled={isCancelling}
        >
          {isCancelling ? 'Отмена…' : 'Отменить задание'}
        </button>
      )}

      <UrlTable urls={job.urls} />
    </section>
  );
}
