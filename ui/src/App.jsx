import React, { useMemo, useRef, useState } from 'react';

const normalizeBase = (value) => value.replace(/\/$/, '');

const defaultBase = typeof window !== 'undefined'
  ? normalizeBase(window.location.origin === 'null'
    ? 'http://localhost:3000'
    : window.location.origin)
  : 'http://localhost:3000';

const App = () => {
  const [apiBase, setApiBase] = useState(defaultBase);
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const wsRef = useRef(null);

  const wsBase = useMemo(() => {
    const base = normalizeBase(apiBase);
    return base.replace(/^http/, 'ws');
  }, [apiBase]);

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

  const subscribe = (id) => {
    closeSocket();

    const ws = new WebSocket(`${wsBase}/ws`);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', job_id: id }));
    });

    ws.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'status') {
        setStatus(payload.status ?? '');
      }
      if (payload.type === 'progress') {
        setProgress(payload.message ?? '');
      }
      if (payload.type === 'result') {
        setTranscript(payload.transcript ?? '');
        setSummary(payload.summary ?? '');
      }
      if (payload.type === 'error') {
        setError(payload.error ?? '');
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
    setStatus(data.status ?? '');
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
  };

  const handleSubscribe = () => {
    if (!jobId) {
      setError('Job ID is required');
      return;
    }
    subscribe(jobId);
  };

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
        <h2>Status</h2>
        <div className="status-grid">
          <div>
            <span className="label">Job</span>
            <span>{jobId || '-'}</span>
          </div>
          <div>
            <span className="label">State</span>
            <span>{status || '-'}</span>
          </div>
          <div>
            <span className="label">Progress</span>
            <span>{progress || '-'}</span>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>Transcript</h2>
        <pre className="output">{transcript || '-'}</pre>
      </section>

      <section className="panel">
        <h2>Summary</h2>
        <pre className="output">{summary || '-'}</pre>
      </section>
    </div>
  );
};

export default App;
