import { useEffect, useState } from 'react'
import './BackgroundGallery.css'

interface BackgroundMeta {
  filename: string
  displayName: string
  category: string
  url: string
}

interface Props {
  selected: string   // current background_image value (url or '')
  onChange: (url: string) => void
}

export default function BackgroundGallery({ selected, onChange }: Props) {
  const [backgrounds, setBackgrounds] = useState<BackgroundMeta[]>([])

  useEffect(() => {
    fetch('/api/backgrounds')
      .then(r => r.json())
      .then(setBackgrounds)
      .catch(() => {})
  }, [])

  // Group by category, preserve order of first appearance; "Paintings" always last
  const categories: string[] = []
  const byCategory: Record<string, BackgroundMeta[]> = {}
  for (const bg of backgrounds) {
    if (!byCategory[bg.category]) {
      categories.push(bg.category)
      byCategory[bg.category] = []
    }
    byCategory[bg.category].push(bg)
  }
  const paintingsIdx = categories.indexOf('Paintings')
  if (paintingsIdx > -1) {
    categories.splice(paintingsIdx, 1)
    categories.push('Paintings')
  }

  return (
    <div className="bg-gallery">
      {/* Default / clear tile */}
      <div className="bg-gallery-category">
        <div className="bg-gallery-cat-label">Default</div>
        <div className="bg-gallery-grid">
          <button
            type="button"
            className={`bg-tile${!selected ? ' bg-tile--selected' : ''}`}
            onClick={() => onChange('')}
          >
            <div className="bg-tile-thumb bg-tile-thumb--default">
              <span className="bg-tile-default-icon">✕</span>
            </div>
            <span className="bg-tile-name">None</span>
          </button>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat} className="bg-gallery-category">
          <div className="bg-gallery-cat-label">{cat}</div>
          <div className="bg-gallery-grid">
            {byCategory[cat].map(bg => (
              <button
                key={bg.filename}
                type="button"
                className={`bg-tile${selected === bg.url ? ' bg-tile--selected' : ''}`}
                onClick={() => onChange(bg.url)}
              >
                <div
                  className="bg-tile-thumb"
                  style={{ backgroundImage: `url(${bg.url})` }}
                />
                <span className="bg-tile-name">{bg.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
