interface Props {
  processed: number;
  total: number;
}

export function ProgressBar({ processed, total }: Props) {
  const percent = total === 0 ? 0 : Math.round((processed / total) * 100);

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={processed}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
