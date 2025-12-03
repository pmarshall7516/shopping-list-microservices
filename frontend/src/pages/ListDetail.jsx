import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import RecommendationsPanel from '../components/RecommendationsPanel'
import ItemTypeahead from '../components/ItemTypeahead'

const formatDate = (date) => {
  if (!date) return 'Created date not captured'
  const d = new Date(date)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ListDetail({ token, user }) {
  const { id } = useParams()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')

  const load = async () => {
    try {
      const data = await api.fetchList(token, id)
      setList(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const addItem = async (e) => {
    e.preventDefault()
    await api.addListItem(token, id, { item_id: itemId, quantity: Number(quantity), unit, notes })
    setItemId('')
    setQuantity(1)
    setUnit('')
    setNotes('')
    load()
  }

  const toggleChecked = async (listItem) => {
    await api.updateListItem(token, id, listItem.id, { checked: !listItem.checked })
    load()
  }

  const remove = async (listItem) => {
    await api.deleteListItem(token, id, listItem.id)
    load()
  }

  if (!list) return <div className="card">Loading list...</div>

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="muted">List detail</p>
          <h1 className="page-title">{list.name}</h1>
          <div className="item-meta">{formatDate(list.created_at)}</div>
        </div>
        <Link className="pill secondary" to="/lists/create">Start new list</Link>
      </div>
      {error && <p style={{ color: '#ffb4d1' }}>{error}</p>}

      <div className="card-grid two">
        <div className="stack">
          <div className="card">
            <p className="muted">{list.description || 'No description yet.'}</p>
            <div className="list-items">
              {list.items?.length === 0 && <div className="empty">Add the first item to this list.</div>}
              {list.items?.map((item) => (
                <div key={item.id} className="item-row">
                  <div className="flex-row" style={{ alignItems: 'center', gap: 10 }}>
                    <button
                      className={`bubble-toggle ${item.checked ? 'checked' : ''}`}
                      onClick={() => toggleChecked(item)}
                      aria-label={item.checked ? 'Uncheck item' : 'Check item'}
                    >
                      <span />
                    </button>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.item_id}</div>
                      <div className="item-meta">
                        x{item.quantity}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="inline-actions">
                    <button className="secondary" onClick={() => remove(item)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Add item</h3>
            <form onSubmit={addItem}>
              <label>Item ID or name</label>
              <ItemTypeahead
                value={itemId}
                onChange={setItemId}
                onSelect={(item) => {
                  setItemId(item.name)
                  if (item.default_unit) setUnit(item.default_unit)
                  if (item.price) setNotes((prev) => (prev ? prev : `Price: ${item.price}`))
                }}
                placeholder="Start typing to search catalog or enter custom"
              />
              <label>Amount</label>
              <input type="number" value={quantity} min={1} onChange={(e) => setQuantity(e.target.value)} />
              <label>Unit/Postfix (optional)</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="lbs, oz, packs" />
              <label>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              <button type="submit">Add to list</button>
            </form>
          </div>
        </div>
        <RecommendationsPanel token={token} list={list} user={user} onApply={(itemId) => setItemId(itemId)} />
      </div>
    </div>
  )
}
