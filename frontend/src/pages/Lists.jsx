import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const formatDate = (date) => {
  if (!date) return 'Created date not captured'
  const d = new Date(date)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Lists({ token, user }) {
  const [lists, setLists] = useState([])
  const [error, setError] = useState('')

  const loadLists = async () => {
    try {
      const data = await api.fetchLists(token)
      setLists(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    loadLists()
  }, [])

  const remove = async (id) => {
    await api.deleteList(token, id)
    loadLists()
  }

  const toggleChecked = async (listId, listItem) => {
    await api.updateListItem(token, listId, listItem.id, { checked: !listItem.checked })
    loadLists()
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="muted">Lists for {user?.display_name || 'you'}</p>
          <h1 className="page-title">Saved lists</h1>
        </div>
        <Link className="pill primary" to="/lists/create">+ New list</Link>
      </div>
      {error && <p style={{ color: '#ffb4d1' }}>{error}</p>}
      <div className="card-grid">
        {lists.map((l) => (
          <div key={l.id} className="list-card">
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Link to={`/lists/${l.id}`} style={{ fontSize: 18, fontWeight: 700 }}>{l.name}</Link>
                <div className="item-meta">{formatDate(l.created_at)}</div>
              </div>
              <div className="inline-actions">
                <Link className="pill secondary" to={`/lists/${l.id}`}>Open</Link>
                <button className="pill secondary" onClick={() => remove(l.id)}>Delete</button>
              </div>
            </div>
            <div className="list-items">
              {l.items?.length === 0 && <div className="empty">No items yet.</div>}
              {l.items?.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="flex-row" style={{ alignItems: 'center', gap: 10 }}>
                    <button
                      className={`bubble-toggle ${item.checked ? 'checked' : ''}`}
                      onClick={() => toggleChecked(l.id, item)}
                      aria-label={item.checked ? 'Uncheck item' : 'Check item'}
                    >
                      <span />
                    </button>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.item_id}</div>
                      <div className="item-meta">
                        x{item.quantity}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="item-meta">{item.checked ? 'checked' : 'pending'}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
