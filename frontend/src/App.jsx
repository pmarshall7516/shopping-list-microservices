import { useEffect, useState } from 'react'
import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Lists from './pages/Lists'
import ListDetail from './pages/ListDetail'
import CreateList from './pages/CreateList'
import StatsDashboard from './pages/StatsDashboard'
import { api } from './api'

function Navbar({ token, user, onLogout }) {
  return (
    <div className="navbar">
      <div className="nav-group">
        <Link className="pill secondary" to="/lists">Lists</Link>
        {token && <Link className="pill secondary" to="/lists/create">New List</Link>}
      </div>
      <Link className="nav-logo" to="/lists" aria-label="Return to lists">
        <img src="/logo.png" alt="Shopping lists" />
      </Link>
      <div className="nav-group">
        {user?.admin && <Link className="pill secondary" to="/stats">Stats</Link>}
        {token ? (
          <button className="pill primary" onClick={onLogout}>Logout</button>
        ) : (
          <>
            <Link className="pill secondary" to="/login">Login</Link>
            <Link className="pill secondary" to="/register">Register</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const navigate = useNavigate()

  const handleLogin = async (email, password) => {
    const res = await api.login(email, password)
    localStorage.setItem('token', res.access_token)
    setToken(res.access_token)
    const profile = await api.me(res.access_token)
    localStorage.setItem('user', JSON.stringify(profile))
    setUser(profile)
    setLoadingUser(false)
    navigate('/lists')
  }

  const handleLogout = () => {
    setToken('')
    setUser(null)
    setLoadingUser(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) {
      setLoadingUser(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setToken(stored)
        const profile = await api.me(stored)
        setUser(profile)
        localStorage.setItem('user', JSON.stringify(profile))
      } catch {
        handleLogout()
      } finally {
        setLoadingUser(false)
      }
    }

    fetchProfile()
  }, [])

  return (
    <div>
      <Navbar token={token} user={user} onLogout={handleLogout} />
      <div className="layout">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/lists"
            element={token ? <Lists token={token} user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/lists/create"
            element={token ? <CreateList token={token} user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/lists/:id"
            element={token ? <ListDetail token={token} user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/stats"
            element={
              loadingUser ? (
                <div className="card">Checking permissions...</div>
              ) : token && user?.admin ? (
                <StatsDashboard />
              ) : token ? (
                <Navigate to="/lists" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  )
}
