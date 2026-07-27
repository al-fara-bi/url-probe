import { useState, type FormEvent } from 'react';
import { useJobsStore } from '../store/jobsStore';

export function CreateJobForm() {
  const [text, setText] = useState('');
  const submitUrls = useJobsStore((state) => state.submitUrls);
  const isCreating = useJobsStore((state) => state.isCreating);

  const urls = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (urls.length === 0) {
      return;
    }

    await submitUrls(urls);
    setText('');
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Новая проверка</h2>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={'https://example.com\nhttps://example.org'}
        rows={8}
        spellCheck={false}
      />
      <div className="form-footer">
        <span className="muted">Ссылок: {urls.length}</span>
        <button type="submit" disabled={urls.length === 0 || isCreating}>
          {isCreating ? 'Отправка…' : 'Запустить проверку'}
        </button>
      </div>
    </form>
  );
}
