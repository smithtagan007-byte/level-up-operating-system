'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useState, useTransition, useRef, useEffect } from 'react'
import { updateCandidatePipelineStageAction } from '@/app/dashboard/candidates/actions'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const CANDIDATE_STAGES = [
  'unprocessed',
  'screening',
  'in_review',
  'approved',
  'submitted',
  'interview',
  'offer',
  'started',
  'probation_completed',
] as const
export type CandidateStage = typeof CANDIDATE_STAGES[number]

export const STAGE_LABELS: Record<CandidateStage, string> = {
  unprocessed:         'Unprocessed',
  screening:           'Screening',
  in_review:           'In Review',
  approved:            'Approved',
  submitted:           'Submitted',
  interview:           'Interview',
  offer:               'Offer',
  started:             'Started',
  probation_completed: 'Probation Completed',
}

export interface BoardCandidate {
  id: string
  full_name: string
  email: string | null
  current_title: string | null
  current_company: string | null
  tier: string | null
  risk_level: string | null
  pipeline_stage: string
  submitted_to_client: boolean
  hasReview: boolean
  hasScreening: boolean
  internalStatus: string | null
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-orange-500', 'bg-teal-500', 'bg-rose-500',
]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

interface Props {
  candidates: BoardCandidate[]
  roleId: string
}

export function CandidatesBoardView({ candidates: initial, roleId }: Props) {
  const [candidates, setCandidates] = useState<BoardCandidate[]>(initial)
  const [, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  // wrapperRef measures where the board starts on screen
  const wrapperRef = useRef<HTMLDivElement>(null)
  // scrollRef is the actual horizontal scroll container
  const scrollRef = useRef<HTMLDivElement>(null)
  // boardHeight fills exactly the remaining viewport below the board's top position
  const [boardHeight, setBoardHeight] = useState(400)

  useEffect(() => {
    // Lock page scroll while board is mounted
    document.body.style.overflow = 'hidden'

    function measure() {
      if (!wrapperRef.current) return
      const top = wrapperRef.current.getBoundingClientRect().top
      // Fill from board top to bottom of viewport minus arrow row (56px)
      const h = window.innerHeight - top - 56
      setBoardHeight(Math.max(h, 250))
    }
    measure()
    window.addEventListener('resize', measure)

    return () => {
      // Restore page scroll when navigating away
      document.body.style.overflow = ''
      window.removeEventListener('resize', measure)
    }
  }, [])

  function scrollBoard(dir: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft += dir === 'right' ? 280 : -280
  }

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const newStage = destination.droppableId as CandidateStage
    const candidateId = draggableId

    setCandidates(prev =>
      prev.map(c => c.id === candidateId ? { ...c, pipeline_stage: newStage } : c)
    )
    setErrors(prev => { const next = { ...prev }; delete next[candidateId]; return next })

    startTransition(async () => {
      try {
        await updateCandidatePipelineStageAction(candidateId, newStage, roleId)
      } catch (err) {
        setCandidates(initial)
        setErrors(prev => ({
          ...prev,
          [candidateId]: err instanceof Error ? err.message : 'Update failed',
        }))
      }
    })
  }

  const grouped = CANDIDATE_STAGES.reduce((acc, stage) => {
    acc[stage] = candidates.filter(c => c.pipeline_stage === stage)
    return acc
  }, {} as Record<CandidateStage, BoardCandidate[]>)

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* wrapperRef measures the top of this element to compute exact board height */}
      <div ref={wrapperRef}>

        {/* Board: exact height to fill remaining viewport — page cannot scroll */}
        <div
          ref={scrollRef}
          className="board-scroll"
          style={{
            display: 'flex',
            gap: '12px',
            height: `${boardHeight}px`,
            overflowX: 'auto',
            overflowY: 'hidden',
            /* hide scrollbar in all browsers */
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {CANDIDATE_STAGES.map(stage => (
            <div
              key={stage}
              style={{
                flexShrink: 0,
                width: '224px',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Column header — never moves */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 4px',
                marginBottom: '10px',
              }}>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {STAGE_LABELS[stage]}
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
                  {grouped[stage].length}
                </span>
              </div>

              {/* Cards area — scrolls independently per column, thin scrollbar on right */}
              <Droppable droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="column-scroll"
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      borderRadius: '12px',
                      padding: '6px',
                      backgroundColor: snapshot.isDraggingOver ? '#f3f4f6' : 'rgba(249,250,251,0.6)',
                      transition: 'background-color 150ms',
                    }}
                  >
                    {grouped[stage].length === 0 && !snapshot.isDraggingOver && (
                      <div className="h-16 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-300">Drop here</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {grouped[stage].map((candidate, index) => (
                        <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <CandidateCard
                                candidate={candidate}
                                isDragging={snapshot.isDragging}
                                error={errors[candidate.id]}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>

        {/* Arrow row — sits directly below the board */}
        <div style={{ position: 'relative', height: '48px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => scrollBoard('left')}
            style={{ position: 'absolute', left: 0, top: '4px' }}
            className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors shadow-md"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollBoard('right')}
            style={{ position: 'absolute', right: 0, top: '4px' }}
            className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 transition-colors shadow-md"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>

      </div>
    </DragDropContext>
  )
}

function CandidateCard({
  candidate,
  isDragging,
  error,
}: {
  candidate: BoardCandidate
  isDragging: boolean
  error?: string
}) {
  const color = avatarColor(candidate.full_name)
  const initials = getInitials(candidate.full_name)

  return (
    <div
      className={`bg-white rounded-lg border p-3 transition-all select-none ${
        isDragging
          ? 'border-gray-300 shadow-lg rotate-1 scale-105 cursor-grabbing'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-grab'
      }`}
    >
      {error && <p className="text-xs text-red-600 mb-1.5 font-medium">{error}</p>}

      <div className="flex items-start gap-2.5 mb-2">
        <div className={`shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold`}>
          {initials}
        </div>
        <div className="min-w-0">
          <Link
            href={`/dashboard/candidates/${candidate.id}`}
            className="text-sm font-semibold text-gray-900 hover:underline leading-snug line-clamp-2 block"
            onClick={e => e.stopPropagation()}
          >
            {candidate.full_name}
          </Link>
          {(candidate.current_title || candidate.current_company) && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {candidate.current_title}
              {candidate.current_company && <span> @ {candidate.current_company}</span>}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {candidate.tier && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {candidate.tier}
          </span>
        )}
        {candidate.hasScreening && (
          <span className="text-xs text-emerald-600 font-medium">✓ Screened</span>
        )}
        {candidate.internalStatus === 'approved_for_formatting' && (
          <span className="text-xs text-teal-600 font-medium">Approved</span>
        )}
        {candidate.submitted_to_client && (
          <span className="text-xs text-purple-600 font-medium">Submitted</span>
        )}
      </div>
    </div>
  )
}
