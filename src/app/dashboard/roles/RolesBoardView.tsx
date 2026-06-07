'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { updateRoleStatusAction, updateRoleActivityStatusAction } from './actions'
import { stageAgeInfo } from '@/lib/stageAge'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STAGES = [
  'intake',
  'sourcing',
  'screening',
  'in_review',
  'approved',
  'submitted',
  'interview',
  'offer',
  'started',
  'probation_completed',
] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  intake:              'Intake',
  sourcing:            'Sourcing',
  screening:           'Screening',
  in_review:           'In Review',
  approved:            'Approved',
  submitted:           'Submitted',
  interview:           'Interview',
  offer:               'Offer',
  started:             'Started',
  probation_completed: 'Probation Completed',
}

export interface BoardRole {
  id: string
  title: string
  status: string
  activity_status: string
  intake_completed: boolean | null
  entered_stage_at: string | null
  clientName: string | null
  clientGrade: string | null
  candidateCount: number
}

interface Props {
  roles: BoardRole[]
}

export function RolesBoardView({ roles: initialRoles }: Props) {
  const [roles, setRoles] = useState<BoardRole[]>(initialRoles)
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

  const handleActivityStatusChange = useCallback((roleId: string, newStatus: string) => {
    setRoles(prev =>
      prev.map(r => r.id === roleId ? { ...r, activity_status: newStatus } : r)
    )
    startTransition(async () => {
      try {
        await updateRoleActivityStatusAction(roleId, newStatus)
      } catch {
        setRoles(prev =>
          prev.map(r => r.id === roleId ? { ...r, activity_status: roles.find(x => x.id === roleId)?.activity_status ?? 'active' } : r)
        )
      }
    })
  }, [roles, startTransition])

  function handleDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    if (source.droppableId !== 'intake' || destination.droppableId !== 'sourcing') return

    const roleId = draggableId

    setRoles(prev =>
      prev.map(r =>
        r.id === roleId
          ? { ...r, status: 'sourcing', entered_stage_at: new Date().toISOString() }
          : r
      )
    )
    setErrors(prev => { const next = { ...prev }; delete next[roleId]; return next })

    startTransition(async () => {
      try {
        await updateRoleStatusAction(roleId, 'sourcing')
      } catch (err) {
        setRoles(initialRoles)
        setErrors(prev => ({
          ...prev,
          [roleId]: err instanceof Error ? err.message : 'Update failed',
        }))
      }
    })
  }

  const grouped = STAGES.reduce((acc, stage) => {
    acc[stage] = roles.filter(r => r.status === stage)
    return acc
  }, {} as Record<Stage, BoardRole[]>)

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
          {STAGES.map(stage => {
            const isDropTarget = stage === 'sourcing'

            return (
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
                <Droppable droppableId={stage} isDropDisabled={!isDropTarget}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {grouped[stage].map((role, index) => {
                          const isDraggable = role.status === 'intake'

                          return (
                            <Draggable
                              key={role.id}
                              draggableId={role.id}
                              index={index}
                              isDragDisabled={!isDraggable}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <RoleCard
                                    role={role}
                                    isDragging={snapshot.isDragging}
                                    isDraggable={isDraggable}
                                    error={errors[role.id]}
                                    onActivityStatusChange={handleActivityStatusChange}
                                  />
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
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

const ACTIVITY_STATUSES = [
  { key: 'active', label: 'Active',  pill: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  { key: 'parked', label: 'Parked',  pill: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  { key: 'placed', label: 'Placed',  pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'closed', label: 'Closed',  pill: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
]

const GRADE_BORDER: Record<string, string> = {
  A: 'border-l-emerald-400',
  B: 'border-l-blue-400',
  C: 'border-l-amber-400',
  D: 'border-l-red-400',
}

function RoleCard({
  role,
  isDragging,
  isDraggable,
  error,
  onActivityStatusChange,
}: {
  role: BoardRole
  isDragging: boolean
  isDraggable: boolean
  error?: string
  onActivityStatusChange: (roleId: string, status: string) => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const age = stageAgeInfo(role.status, role.entered_stage_at)
  const current = ACTIVITY_STATUSES.find(s => s.key === role.activity_status) ?? ACTIVITY_STATUSES[0]
  const gradeBorder = role.clientGrade ? (GRADE_BORDER[role.clientGrade] ?? 'border-l-gray-200') : 'border-l-gray-200'

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropdownOpen])

  return (
    <div
      className={`bg-white rounded-lg border border-l-4 p-3 transition-all select-none ${gradeBorder} ${
        isDragging
          ? 'border-gray-200 shadow-lg rotate-1 scale-105 cursor-grabbing'
          : isDraggable
          ? 'border-gray-200 hover:shadow-sm cursor-grab'
          : 'border-gray-200 cursor-default'
      }`}
    >
      {error && <p className="text-xs text-red-600 mb-1.5 font-medium">{error}</p>}

      {/* Title + age */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <Link
          href={`/dashboard/roles/${role.id}`}
          className="text-sm font-semibold text-gray-900 hover:underline leading-snug line-clamp-2"
          onClick={e => e.stopPropagation()}
        >
          {role.title}
        </Link>
        {age && (
          <span className={`shrink-0 text-xs font-bold ${
            age.color === 'red' ? 'text-red-500' :
            age.color === 'amber' ? 'text-amber-500' :
            'text-gray-300'
          }`}>
            {age.label}
          </span>
        )}
      </div>

      {/* Client name */}
      {role.clientName && (
        <p className="text-xs text-gray-400 mb-2.5 truncate">{role.clientName}</p>
      )}

      {/* Status dropdown + candidate count */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setDropdownOpen(o => !o) }}
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${current.dot}`} />
            {current.label}
            <svg width="8" height="8" viewBox="0 0 10 10" className="ml-0.5 opacity-50">
              <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[110px]"
              onClick={e => e.stopPropagation()}
            >
              {ACTIVITY_STATUSES.map(s => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    onActivityStatusChange(role.id, s.key)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
                    s.key === role.activity_status ? 'font-semibold text-gray-900' : 'text-gray-600'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {role.candidateCount > 0 && (
          <span className="text-xs text-gray-400">
            · {role.candidateCount} candidate{role.candidateCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
