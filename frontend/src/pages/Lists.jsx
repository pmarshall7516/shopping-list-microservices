import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Lists({ token, user }) {
  const [lists, setLists] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
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

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.createList(token, { name, description })
      setName('')
      setDescription('')
      loadLists()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    await api.deleteList(token, id)
    loadLists()
  }

  return (
    <div className="grid two">
      <div>
        <div className="card">
          <h3>Your Lists {user?.display_name && `for ${user.display_name}`}</h3>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {lists.map((l) => (
            <div key={l.id} className="flex-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Link to={`/lists/${l.id}`}>{l.name}</Link>
              <button className="secondary" onClick={() => remove(l.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="card">
          <h3>Create List</h3>
          <form onSubmit={create}>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            <button type="submit">Create</button>
          </form>
        </div>
      </div>
    </div>
  )
}
