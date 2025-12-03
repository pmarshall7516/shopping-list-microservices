import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import RecommendationsPanel from '../components/RecommendationsPanel'

export default function ListDetail({ token }) {
  const { id } = useParams()
  const [list, setList] = useState(null)
  const [error, setError] = useState('')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
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
    await api.addListItem(token, id, { item_id: itemId, quantity: Number(quantity), notes })
    setItemId('')
    setQuantity(1)
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
    <div className="grid two">
      <div>
        <div className="card">
          <h2>{list.name}</h2>
          <p>{list.description}</p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {list.items?.map((item) => (
            <div key={item.id} className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{item.item_id}</strong>
                <div style={{ fontSize: 12, color: '#475569' }}>Qty: {item.quantity} {item.notes && `- ${item.notes}`}</div>
              </div>
              <div className="flex-row">
                <button className="secondary" onClick={() => toggleChecked(item)}>
                  {item.checked ? 'Uncheck' : 'Check'}
                </button>
                <button className="secondary" onClick={() => remove(item)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Add Item</h3>
          <form onSubmit={addItem}>
            <label>Item ID or Name</label>
            <input value={itemId} onChange={(e) => setItemId(e.target.value)} required />
            <label>Quantity</label>
            <input type="number" value={quantity} min={1} onChange={(e) => setQuantity(e.target.value)} />
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button type="submit">Add to List</button>
          </form>
        </div>
      </div>
      <RecommendationsPanel token={token} list={list} onApply={(itemId) => setItemId(itemId)} />
    </div>
  )
}
