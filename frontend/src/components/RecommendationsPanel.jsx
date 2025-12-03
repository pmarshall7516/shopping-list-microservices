import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

export default function RecommendationsPanel({ token, list, user, itemsOverride, onApply }) {
  const [recs, setRecs] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const currentItems = useMemo(() => {
    if (itemsOverride) return itemsOverride.map((i) => i.item_id).filter(Boolean)
    return list?.items?.map((i) => i.item_id) || []
  }, [itemsOverride, list?.items])

  const userId = user?.id || list?.user_id
  const listId = list?.id || null

  const fetchRecs = async () => {
    if (!userId) return
    if (!currentItems || currentItems.length < 2) {
      setRecs([])
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = { user_id: userId, list_id: listId, current_items: currentItems }
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
  }, [userId, listId, JSON.stringify(currentItems)])

  return (
    <div className="card">
      <h3>Recommendations</h3>
      {currentItems.length < 2 && <p className="muted">Add at least 2 items to see recommendations.</p>}
      {loading && <p>Fetching ideas...</p>}
      {error && <p style={{ color: '#ffb4d1' }}>{error}</p>}
      {recs.map((rec) => (
        <div key={rec.item_id} className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{rec.item_id}</strong>
            <div style={{ fontSize: 12, color: '#9aa3c2' }}>{rec.reason}</div>
          </div>
          <button className="secondary" onClick={() => onApply(rec.item_id)}>Use</button>
        </div>
      ))}
      {!loading && recs.length === 0 && currentItems.length >= 2 && <div className="muted">No recommendations yet.</div>}
      <button style={{ marginTop: 8 }} onClick={fetchRecs}>
        Refresh Recommendations
      </button>
    </div>
  )
}
