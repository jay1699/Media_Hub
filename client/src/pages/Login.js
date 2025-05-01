import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true); // Set loading state to true when starting the request
    setMsg(''); // Clear previous error message

    try {
      // Making the API call
      const res = await axios.post(`${process.env.REACT_APP_API}/api/login`, { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      navigate('/'); // Redirect to Home after successful login
    } catch (err) {
      setMsg(err.response?.data?.message || 'Login failed. Please try again.'); // Error message handling
    } finally {
      setIsLoading(false); // Reset loading state after the request
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {msg && <p style={{ color: 'red' }}>{msg}</p>} {/* Display error message */}
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <button type="submit" disabled={isLoading}> {/* Disable button while loading */}
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;
