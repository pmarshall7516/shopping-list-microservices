import { useEffect, useState } from 'react'
import { api } from '../api'

export default function RecommendationsPanel({ token, list, onApply }) {
  const [recs, setRecs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchRecs = async () => {
    if (!list) return
    setLoading(true)
    setError('')
    try {
      const body = { user_id: list.user_id, list_id: list.id, current_items: list.items?.map((i) => i.item_id) }
      const data = await api.getRecommendations(body)
      setRecs(data.recommendations || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecs()
  }, [list?.id])

  return (
    <div className="card">
      <h3>Recommendations</h3>
      {loading && <p>Fetching ideas...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {recs.map((rec) => (
        <div key={rec.item_id} className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{rec.item_id}</strong>
            <div style={{ fontSize: 12, color: '#475569' }}>{rec.reason}</div>
          </div>
          <button className="secondary" onClick={() => onApply(rec.item_id)}>Use</button>
        </div>
      ))}
      <button style={{ marginTop: 8 }} onClick={fetchRecs}>
        Refresh Recommendations
      </button>
    </div>
  )
}
