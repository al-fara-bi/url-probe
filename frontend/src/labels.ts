import type { JobStatus, UrlStatus } from './api/types';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'В очереди',
  in_progress: 'Выполняется',
  completed: 'Завершено',
  cancelled: 'Отменено',
  failed: 'Ошибка',
};

export const URL_STATUS_LABELS: Record<UrlStatus, string> = {
  pending: 'В очереди',
  in_progress: 'Проверяется',
  success: 'Доступен',
  error: 'Ошибка',
  cancelled: 'Отменён',
};

export const formatDuration = (ms?: number): string =>
  ms === undefined ? '—' : `${(ms / 1000).toFixed(1)} с`;

export const formatDateTime = (iso: string): string => new Date(iso).toLocaleString('ru-RU');
