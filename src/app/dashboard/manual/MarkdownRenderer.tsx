import type { ReactNode } from 'react'

function InlineText({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>
        }
        return part
      })}
    </>
  )
}

function renderBlock(block: string, key: number): ReactNode[] {
  const trimmed = block.trim()
  if (!trimmed) return []

  const lines = trimmed.split('\n').filter(l => l !== undefined)

  if (trimmed.startsWith('## ')) {
    return [
      <h2 key={key} className="text-base font-semibold text-gray-900 mt-6 mb-2">
        {trimmed.slice(3)}
      </h2>
    ]
  }
  if (trimmed.startsWith('### ')) {
    return [
      <h3 key={key} className="text-sm font-semibold text-gray-800 mt-5 mb-1.5">
        {trimmed.slice(4)}
      </h3>
    ]
  }
  if (trimmed === '---') {
    return [<hr key={key} className="border-gray-200 my-6" />]
  }

  const bulletLines = lines.filter(l => l.trim())
  const allBullets = bulletLines.length > 0 && bulletLines.every(l => l.startsWith('- '))
  if (allBullets) {
    return [
      <ul key={key} className="list-disc pl-5 space-y-1 text-sm text-gray-700 leading-relaxed">
        {bulletLines.map((l, i) => (
          <li key={i}><InlineText text={l.slice(2)} /></li>
        ))}
      </ul>
    ]
  }

  const numberedLines = lines.filter(l => l.trim())
  const allNumbered = numberedLines.length > 0 && numberedLines.every(l => /^\d+\. /.test(l))
  if (allNumbered) {
    return [
      <ol key={key} className="list-decimal pl-5 space-y-1 text-sm text-gray-700 leading-relaxed">
        {numberedLines.map((l, i) => (
          <li key={i}><InlineText text={l.replace(/^\d+\. /, '')} /></li>
        ))}
      </ol>
    ]
  }

  return lines
    .filter(l => l.trim())
    .map((l, i) => (
      <p key={`${key}-${i}`} className="text-sm text-gray-700 leading-relaxed">
        <InlineText text={l} />
      </p>
    ))
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/)
  return (
    <div className="space-y-3">
      {blocks.flatMap((block, i) => renderBlock(block, i))}
    </div>
  )
}
