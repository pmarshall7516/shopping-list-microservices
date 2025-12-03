import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api'

export default function ItemTypeahead({ value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounced = useDebounce(value, 200)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const run = async () => {
      if (!debounced || debounced.length < 1) {
        setSuggestions([])
        setOpen(false)
        return
      }
      setLoading(true)
      try {
        const results = await api.searchInventory(debounced)
        setSuggestions(results || [])
        setOpen(true)
      } catch (err) {
        setSuggestions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [debounced])

  const handleSelect = (item) => {
    onSelect(item)
    setOpen(false)
  }

  return (
    <div className="typeahead" ref={containerRef}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        placeholder={placeholder}
        onFocus={() => value && value.length >= 1 && suggestions.length && setOpen(true)}
        onBlur={(e) => {
          if (!containerRef.current?.contains(e.relatedTarget)) {
            setOpen(false)
          }
        }}
      />
      {open && (
        <div className="typeahead-list" onMouseLeave={() => setOpen(false)}>
          {!loading && value && (
            <button
              type="button"
              className="typeahead-item"
              onClick={() => {
                onSelect({ name: value })
              }}
            >
              <div className="typeahead-title">{value}</div>
              <div className="typeahead-meta">Use custom item</div>
            </button>
          )}
          {loading && <div className="typeahead-item">Loading...</div>}
          {!loading && suggestions.length === 0 && <div className="typeahead-item">No matches</div>}
          {!loading &&
            suggestions.map((item) => (
              <button type="button" key={item.id || item.name} className="typeahead-item" onClick={() => handleSelect(item)}>
                <div className="typeahead-title">{item.name}</div>
                <div className="typeahead-meta">
                  {item.size || item.default_unit || 'unit'} · {item.price || 'price unknown'}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
