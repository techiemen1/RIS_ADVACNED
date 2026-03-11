// src/components/AIAssistantPanel.tsx
import React, { useState } from 'react';
import axiosInstance from '../services/axiosInstance';

export default function AIAssistantPanel({ onInsert }: { onInsert?: (text: string) => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [term, setTerm] = useState('');

  const doSuggest = async () => {
    setLoading(true);
    try {
      const r = await axiosInstance.post('/api/ai/suggest', { prompt: query });
      setResult(r.data.data || '');
    } catch (err) {
      setResult('AI suggestion failed. Check server configuration or OPENAI_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  const lookup = async () => {
    if (!term) return;
    setLoading(true);
    try {
      const r = await axiosInstance.get('/api/ai/define', { params: { q: term } });
      setResult(JSON.stringify(r.data.data, null, 2));
    } catch (err) {
      setResult('Definition lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 border-l h-full flex flex-col">
      <h4 className="font-semibold mb-2">AI Assistant</h4>

      <div className="mb-2">
        <textarea value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask the assistant (e.g., generate impression from findings)" className="w-full border rounded px-2 py-1 h-24" />
        <div className="flex gap-2 mt-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={doSuggest} disabled={loading}>Suggest</button>
          <button className="px-3 py-1 border rounded" onClick={() => { setResult(''); setQuery(''); }}>Clear</button>
        </div>
      </div>

      <hr />

      <div className="mt-2">
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Lookup term" className="w-full border rounded px-2 py-1" />
        <div className="flex gap-2 mt-2">
          <button className="px-3 py-1 border rounded" onClick={lookup} disabled={loading}>Define</button>
          <button className="px-3 py-1 border rounded" onClick={() => { if (onInsert) onInsert(result || ''); }}>Insert</button>
        </div>
      </div>

      <pre className="mt-3 overflow-auto text-xs bg-gray-50 p-2 rounded" style={{ flex: 1 }}>{loading ? 'Loading...' : result}</pre>
    </div>
  );
}
