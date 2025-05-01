import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Home({ token }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API}/api/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setMsg('Enter a search term');
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_API}/api/search`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: query }
      });
      setResults(res.data.results);
      await axios.post(`${process.env.REACT_APP_API}/api/history`, { term: query }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchHistory();
      setMsg('');
    } catch (err) {
      setMsg(err.response?.data?.message || 'Search failed');
    }
  };

  const handleClearHistory = async () => {
    await axios.delete(`${process.env.REACT_APP_API}/api/history`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchHistory();
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div>
      <h2>Image Search</h2>
      {msg && <p>{msg}</p>}
      <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search term" />
      <button onClick={handleSearch}>Search</button>

      <h3>Search History</h3>
      <ul>
        {history.map(h => <li key={h._id}>{h.term} ({new Date(h.timestamp).toLocaleString()})</li>)}
      </ul>
      <button onClick={handleClearHistory}>Clear History</button>

      <h3>Results</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {results.map(img => (
          <div key={img.id} style={{ margin: '10px' }}>
            <img src={img.thumbnail} alt={img.title} style={{ width: '150px' }} />
            <p>{img.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
