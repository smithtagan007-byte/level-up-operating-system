'use client'

import { useState } from 'react'

interface ScoreInputProps {
  name: string
  label: string
  defaultValue?: number
  onChange?: (value: number) => void
}

const scoreColour = (n: number, selected: boolean) => {
  if (!selected) return 'bg-gray-100 text-gray-500 hover:bg-gray-200'
  if (n <= 3) return 'bg-red-500 text-white'
  if (n <= 6) return 'bg-yellow-400 text-white'
  if (n <= 8) return 'bg-blue-500 text-white'
  return 'bg-emerald-500 text-white'
}

export function ScoreInput({ name, label, defaultValue, onChange }: ScoreInputProps) {
  const [score, setScore] = useState<number | null>(defaultValue ?? null)

  function select(n: number) {
    setScore(n)
    onChange?.(n)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {score !== null && (
          <span className="text-xs font-semibold text-gray-500">{score}/10</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => select(n)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${scoreColour(n, score === n)}`}
          >
            {n}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={score ?? ''} />
    </div>
  )
}
