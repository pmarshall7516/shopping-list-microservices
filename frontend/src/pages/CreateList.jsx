import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import ItemTypeahead from '../components/ItemTypeahead'
import RecommendationsPanel from '../components/RecommendationsPanel'

export default function CreateList({ token, user }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const addItem = (e) => {
    e.preventDefault()
    if (!itemId.trim()) return
    const draft = {
      item_id: itemId.trim(),
      quantity: Number(quantity) || 1,
      unit: unit.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    setItems((prev) => [...prev, draft])
    setItemId('')
    setQuantity(1)
    setUnit('')
    setNotes('')
  }

  const removeDraft = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await api.createList(token, { name, description })
      if (items.length) {
        for (const item of items) {
          await api.addListItem(token, created.id, item)
        }
      }
      navigate(`/lists/${created.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <p className="muted">List builder</p>
          <h1 className="page-title">Create new list</h1>
        </div>
        <button className="pill secondary" onClick={() => navigate('/lists')}>View all lists</button>
      </div>

      <div className="card-grid two">
        <div className="card">
          <h2>Create list</h2>
          <p className="muted">Name the list and add items.</p>
          {error && <p style={{ color: '#ffb4d1' }}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <label>List name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Weekly groceries" />
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            <hr className="divider" />
            <label>Item</label>
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
            <label>Amount (optional)</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <label>Unit/Postfix (optional)</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="lbs, oz, packs" />
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="brand, flavor, aisle..." />
            <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="secondary" onClick={addItem}>Add item</button>
              <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create list'}</button>
            </div>
          </form>
        </div>

        <div className="stack">
          <div className="card floating-panel">
            <h3>Staged items</h3>
            <p className="muted">Items queued for this list.</p>
            <div className="list-items">
              {!items.length && <div className="empty">No items yet — add one to stage it.</div>}
              {items.map((item, idx) => (
                <div key={`${item.item_id}-${idx}`} className="item-row">
                  <div>
                    <strong>{item.item_id}</strong>
                    <div className="item-meta">x{item.quantity}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}</div>
                  </div>
                  <button className="secondary" onClick={() => removeDraft(idx)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
          <RecommendationsPanel
            list={null}
            user={user}
            itemsOverride={items.map((i) => ({ item_id: i.item_id }))}
            onApply={(itemId) => setItemId(itemId)}
          />
        </div>
      </div>
    </div>
  )
}
