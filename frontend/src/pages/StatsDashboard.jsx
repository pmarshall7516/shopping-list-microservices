import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

const methodColors = {
  GET: '#00bfa6',
  POST: '#61caff',
  PUT: '#ffc857',
  PATCH: '#f48fb1',
  DELETE: '#ff6b6b',
}

export default function StatsDashboard() {
  const [metrics, setMetrics] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.statsMethodSummary()
        setMetrics(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const grouped = useMemo(() => {
    const acc = {}
    metrics.forEach((m) => {
      const method = m.method || 'UNKNOWN'
      acc[method] = acc[method] || []
      acc[method].push(m)
    })
    return acc
  }, [metrics])

  const totalRequests = metrics.reduce((sum, m) => sum + (m.request_count || 0), 0)
  const distinctServices = new Set(metrics.map((m) => m.service_name)).size

  if (loading) return <div className="card">Loading stats...</div>

  return (
    <div className="card">
      <h2>Stats by Method</h2>
      {error && <p style={{ color: '#ffb4d1' }}>{error}</p>}
      <p className="muted" style={{ marginTop: -6 }}>
        {distinctServices || 0} services • {totalRequests} total requests
      </p>

      {Object.keys(grouped).sort().map((method) => {
        const entries = grouped[method].sort((a, b) => b.request_count - a.request_count)
        const maxReq = entries.reduce((max, e) => Math.max(max, e.request_count || 0), 1)
        const barColor = methodColors[method] || 'var(--accent)'

        return (
          <div key={method} style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{method}</h3>
              <span className="muted" style={{ fontSize: 13 }}>Requests by service</span>
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {entries.map((entry) => {
                const width = `${Math.max(8, (entry.request_count / maxReq) * 100)}%`
                return (
                  <div
                    key={`${method}-${entry.service_name}`}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', background: 'var(--surface-muted)', borderRadius: 10 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong>{entry.service_name}</strong>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {entry.request_count} req • avg {entry.average_latency_ms.toFixed(1)} ms
                      </span>
                    </div>
                    <div style={{ background: 'var(--stroke)', height: 10, borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        style={{
                          width,
                          height: '100%',
                          background: barColor,
                          transition: 'width 200ms ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
