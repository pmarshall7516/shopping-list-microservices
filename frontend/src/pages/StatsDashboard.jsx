import { useEffect, useState } from 'react'
import { api } from '../api'

export default function StatsDashboard() {
  const [metrics, setMetrics] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const data = await api.statsSummary()
      setMetrics(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="card">
      <h2>Stats Summary</h2>
      {error && <p style={{ color: '#ffb4d1' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
        <thead>
          <tr>
            <th align="left">Service</th>
            <th align="left">Endpoint</th>
            <th align="left">Method</th>
            <th align="left">Requests</th>
            <th align="left">Avg Latency (ms)</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={`${m.service_name}-${m.endpoint}-${m.method}`} style={{ borderTop: '1px solid var(--stroke)' }}>
              <td>{m.service_name}</td>
              <td>{m.endpoint}</td>
              <td>{m.method}</td>
              <td>{m.request_count}</td>
              <td>{m.average_latency_ms.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: 12 }}>Plug real charts here later (e.g., Recharts/D3) to visualize trends.</p>
    </div>
  )
}
