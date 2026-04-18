import { useMemo } from 'react'
import '../../styles/glass.css'
import './MarkdownCard.css'

interface Props {
  config: { content?: string; title?: string }
}

/** Minimal markdown → HTML (no external deps) */
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML special chars first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Line breaks
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')

  // Wrap consecutive <li> items in <ul>
  html = html.replace(/(<li>.*?<\/li>)+/gs, m => `<ul>${m}</ul>`)

  return `<p>${html}</p>`
}

export default function MarkdownCard({ config }: Props) {
  const content = config.content ?? ''
  const html = useMemo(() => renderMarkdown(content), [content])

  return (
    <div className="glass-card markdown-card">
      {config.title && <div className="card-label">{config.title}</div>}
      <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
