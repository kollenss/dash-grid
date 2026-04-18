import { useState, useEffect, useRef } from 'react'
import './StopAreaSearch.css'

interface StopArea {
  gid: string
  name: string
}

interface Props {
  value: string       // currently selected gid
  label: string       // currently selected name (for display)
  onSelect: (gid: string, name: string) => void
}

export default function StopAreaSearch({ value, label, onSelect }: Props) {
  const [query, setQuery]         = useState(label)
  const [results, setResults]     = useState<StopArea[]>([])
  const [open, setOpen]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef                = useRef<HTMLDivElement>(null)

  // Keep input in sync when label changes from outside
  useEffect(() => { setQuery(label) }, [label])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    setOpen(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.trim().length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/vasttrafik/locations/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults((data.results ?? []).filter((r: any) => r.gid))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(stop: StopArea) {
    setQuery(stop.name)
    setResults([])
    setOpen(false)
    onSelect(stop.gid, stop.name)
  }

  return (
    <div className="stop-search" ref={wrapperRef}>
      <input
        className="modal-input"
        type="text"
        value={query}
        onChange={handleInput}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Search stop…"
        autoComplete="off"
      />
      {value && <div className="stop-search-gid">{value}</div>}
      {open && (results.length > 0 || loading) && (
        <ul className="stop-search-dropdown">
          {loading && <li className="stop-search-loading">Searching…</li>}
          {results.map(stop => (
            <li
              key={stop.gid}
              className={`stop-search-item ${stop.gid === value ? 'stop-search-item--selected' : ''}`}
              onMouseDown={() => handleSelect(stop)}
            >
              {stop.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
