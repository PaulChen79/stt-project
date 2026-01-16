import { useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'stt_history';

const normalizeBase = (value) => value.replace(/\/$/, '');

const defaultBase =
  typeof window !== 'undefined'
    ? normalizeBase(
        window.location.origin === 'null'
          ? 'http://localhost:3000'
          : window.location.origin,
      )
    : 'http://localhost:3000';

const loadHistory = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const App = () => {
  const [apiBase, setApiBase] = useState(defaultBase);
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState(loadHistory);
  const [selectedJobId, setSelectedJobId] = useState('');

  const wsRef = useRef(null);

  const wsBase = useMemo(() => {
    const base = normalizeBase(apiBase);
    return base.replace(/^http/, 'ws');
  }, [apiBase]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const resetOutputs = () => {
    setStatus('');
    setProgress('');
    setTranscript('');
    setSummary('');
    setError('');
  };

  const closeSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const upsertHistory = (update) => {
    setHistory((prev) => {
      const next = [...prev];
      const index = next.findIndex((item) => item.jobId === update.jobId);
      if (index >= 0) {
        next[index] = { ...next[index], ...update };
      } else {
        next.unshift(update);
      }
      return next;
    });
  };

  const applyStateFromHistory = (entry) => {
    if (!entry) {
      return;
    }
    setStatus(entry.status ?? '');
    setProgress(entry.progress ?? '');
    setTranscript(entry.transcript ?? '');
    setSummary(entry.summary ?? '');
    setError(entry.error ?? '');
  };

  const handleSelectHistory = (entry) => {
    setSelectedJobId(entry.jobId);
    setJobId(entry.jobId);
    applyStateFromHistory(entry);
  };

  const subscribe = (id) => {
    closeSocket();

    const ws = new WebSocket(`${wsBase}/ws`);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', job_id: id }));
    });

    ws.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);
      const eventJobId = payload.job_id;
      if (!eventJobId) {
        return;
      }

      if (payload.type === 'status') {
        upsertHistory({ jobId: eventJobId, status: payload.status ?? '' });
        if (eventJobId === selectedJobId) {
          setStatus(payload.status ?? '');
        }
      }
      if (payload.type === 'progress') {
        upsertHistory({
          jobId: eventJobId,
          progress: payload.message ?? '',
        });
        if (eventJobId === selectedJobId) {
          setProgress(payload.message ?? '');
        }
      }
      if (payload.type === 'result') {
        upsertHistory({
          jobId: eventJobId,
          transcript: payload.transcript ?? '',
          summary: payload.summary ?? '',
          status: 'completed',
        });
        if (eventJobId === selectedJobId) {
          setTranscript(payload.transcript ?? '');
          setSummary(payload.summary ?? '');
          setStatus('completed');
        }
      }
      if (payload.type === 'error') {
        upsertHistory({
          jobId: eventJobId,
          error: payload.error ?? '',
          status: 'failed',
        });
        if (eventJobId === selectedJobId) {
          setError(payload.error ?? '');
          setStatus('failed');
        }
      }
    });

    ws.addEventListener('error', () => {
      setError('WebSocket error');
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    resetOutputs();

    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${normalizeBase(apiBase)}/api/jobs`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? 'Upload failed');
      return;
    }

    const data = await response.json();
    setJobId(data.job_id);
    setSelectedJobId(data.job_id);
    setStatus('processing');
    upsertHistory({
      jobId: data.job_id,
      status: 'processing',
      createdAt: data.created_at,
    });
    subscribe(data.job_id);
  };

  const handleFetch = async () => {
    if (!jobId) {
      setError('Job ID is required');
      return;
    }

    resetOutputs();

    const response = await fetch(
      `${normalizeBase(apiBase)}/api/jobs/${jobId}`,
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error?.message ?? 'Fetch failed');
      return;
    }

    const data = await response.json();
    setStatus(data.status ?? '');
    setTranscript(data.transcript ?? '');
    setSummary(data.summary ?? '');
    setError(data.error ?? '');
    setSelectedJobId(jobId);
    upsertHistory({
      jobId,
      status: data.status ?? '',
      transcript: data.transcript ?? '',
      summary: data.summary ?? '',
      error: data.error ?? '',
      createdAt: data.created_at,
    });
  };

  const handleSubscribe = () => {
    if (!jobId) {
      setError('Job ID is required');
      return;
    }
    setSelectedJobId(jobId);
    subscribe(jobId);
  };

  const selectedEntry = history.find((item) => item.jobId === selectedJobId);

  return (
    <div className="page">
      <header className="header">
        <h1>STT Summarization Demo</h1>
        <p>Upload audio, track status, and read the transcript/summary.</p>
      </header>

      <section className="panel">
        <label htmlFor="apiBase">API Base URL</label>
        <input
          id="apiBase"
          type="text"
          value={apiBase}
          onChange={(event) => setApiBase(event.target.value)}
        />
      </section>

      <section className="panel">
        <label htmlFor="fileInput">Upload audio</label>
        <input
          id="fileInput"
          type="file"
          accept="audio/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button type="button" onClick={handleUpload}>
          Upload & Start
        </button>
      </section>

      <section className="panel">
        <label htmlFor="jobId">Job ID</label>
        <input
          id="jobId"
          type="text"
          value={jobId}
          onChange={(event) => setJobId(event.target.value)}
        />
        <div className="row">
          <button type="button" onClick={handleFetch}>
            Fetch Result
          </button>
          <button type="button" onClick={handleSubscribe}>
            Subscribe WS
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>History</h2>
        {history.length === 0 ? (
          <p className="muted">No jobs yet.</p>
        ) : (
          <ul className="history-list">
            {history.map((entry) => (
              <li key={entry.jobId} className="history-item">
                <button
                  type="button"
                  className="history-button"
                  onClick={() => handleSelectHistory(entry)}
                >
                  {entry.jobId}
                </button>
                <div className="history-meta">
                  <span>{entry.status || '-'}</span>
                  <span>{
                    entry.createdAt
                      ? new Date(entry.createdAt).toLocaleString()
                      : '-'
                  }</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Status</h2>
        <div className="status-grid">
          <div>
            <span className="label">Job</span>
            <span>{selectedJobId || jobId || '-'}</span>
          </div>
          <div>
            <span className="label">State</span>
            <span>{selectedEntry?.status || status || '-'}</span>
          </div>
          <div>
            <span className="label">Progress</span>
            <span>{selectedEntry?.progress || progress || '-'}</span>
          </div>
        </div>
        {(selectedEntry?.error || error) && (
          <p className="error">{selectedEntry?.error || error}</p>
        )}
      </section>

      <section className="panel">
        <h2>Transcript</h2>
        <pre className="output">
          {selectedEntry?.transcript || transcript || '-'}
        </pre>
      </section>

      <section className="panel">
        <h2>Summary</h2>
        <pre className="output">
          {selectedEntry?.summary || summary || '-'}
        </pre>
      </section>
    </div>
  );
};

export default App;
