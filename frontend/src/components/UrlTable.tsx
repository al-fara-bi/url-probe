import type { UrlCheck } from '../api/types';
import { URL_STATUS_LABELS, formatDuration } from '../labels';

interface Props {
  urls: UrlCheck[];
}

export function UrlTable({ urls }: Props) {
  return (
    <table className="url-table">
      <thead>
        <tr>
          <th>URL</th>
          <th>Статус</th>
          <th>HTTP</th>
          <th>Длительность</th>
          <th>Сообщение</th>
        </tr>
      </thead>
      <tbody>
        {urls.map((check, index) => (
          <tr key={`${check.url}-${index}`}>
            <td className="url-table__url" title={check.url}>
              {check.url}
            </td>
            <td>
              <span className={`badge badge--${check.status}`}>
                {URL_STATUS_LABELS[check.status]}
              </span>
            </td>
            <td>{check.httpStatus ?? '—'}</td>
            <td>{formatDuration(check.durationMs)}</td>
            <td className="muted">{check.error ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
