import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Handle logout functionality
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  useEffect(() => {
    // Automatically update the token if it's in localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return (
    <Router>
      <nav>
        <Link to="/">Home</Link> |{' '}
        {token ? (
          <>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
          </>
        )}
      </nav>
      <Routes>
        {/* If token is present, redirect to Home, otherwise go to Login */}
        <Route path="/" element={token ? <Home token={token} /> : <Navigate to="/login" />} />
        
        {/* Pass setToken to Login so it can update the token state */}
        <Route path="/login" element={<Login setToken={setToken} />} />
        
        {/* Register route */}
        <Route path="/register" element={<Register />} />
      </Routes>
    </Router>
  );
}

export default App;
