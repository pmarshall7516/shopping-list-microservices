import { useState } from 'react'
import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Lists from './pages/Lists'
import ListDetail from './pages/ListDetail'
import StatsDashboard from './pages/StatsDashboard'
import { api } from './api'

function Navbar({ token, onLogout }) {
  return (
    <div className="navbar">
      <div>Smart Shopping List</div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Link to="/lists">Lists</Link>
        <Link to="/stats">Stats</Link>
        {token ? (
          <button className="secondary" onClick={onLogout}>Logout</button>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (email, password) => {
    const res = await api.login(email, password)
    setToken(res.access_token)
    const profile = await api.me(res.access_token)
    setUser(profile)
    navigate('/lists')
  }

  const handleLogout = () => {
    setToken('')
    setUser(null)
    navigate('/login')
  }

  return (
    <div>
      <Navbar token={token} onLogout={handleLogout} />
      <div className="layout">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/lists"
            element={token ? <Lists token={token} user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/lists/:id"
            element={token ? <ListDetail token={token} user={user} /> : <Navigate to="/login" />}
          />
          <Route path="/stats" element={<StatsDashboard />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  )
}
