import React, { useEffect, useMemo, useState } from 'react'
import { ChevronRight, MessageSquare, X } from 'lucide-react'
import type { VillagerDef } from '../game/npcs'
import { getDialogue, END } from '../game/dialogue'
import { sfx } from '../game/audio'

interface DialoguePanelProps {
  npc: VillagerDef | null
  onClose: () => void
}

/** Portrait glyph per rigged model — keeps the panel readable without art. */
const MODEL_EMOJI: Record<string, string> = {
  knight: '🛡️',
  mage: '🔮',
  rogue: '🗡️',
  rogueHooded: '🏹',
  barbarian: '🔥',
}

const TYPE_MS = 18

/** Bottom-anchored RPG dialogue box with a typewriter reveal and topic choices. */
export const DialoguePanel: React.FC<DialoguePanelProps> = ({ npc, onClose }) => {
  const [nodeId, setNodeId] = useState('hub')
  const [typed, setTyped] = useState(0)

  // Reset to the conversation start whenever a different NPC is talked to.
  useEffect(() => {
    if (npc) setNodeId(getDialogue(npc.id).start)
  }, [npc])

  const tree = useMemo(() => (npc ? getDialogue(npc.id) : null), [npc])
  const node = tree ? (tree.nodes[nodeId] ?? tree.nodes[tree.start]) : null
  const text = node?.text ?? ''
  const done = typed >= text.length

  // Typewriter reveal.
  useEffect(() => {
    setTyped(0)
  }, [nodeId, npc])

  useEffect(() => {
    if (done) return
    const id = window.setInterval(() => {
      setTyped((n) => {
        if (n >= text.length) {
          window.clearInterval(id)
          return n
        }
        return n + 1
      })
    }, TYPE_MS)
    return () => window.clearInterval(id)
  }, [text, done])

  if (!npc || !tree || !node) return null

  const advance = (next: string) => {
    if (next === END) {
      sfx.uiClose()
      onClose()
      return
    }
    if (!tree.nodes[next]) return
    sfx.uiOpen()
    setNodeId(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:p-6 pointer-events-none">
      {/* Click-catcher: tap anywhere outside the box to dismiss. */}
      <div className="absolute inset-0 pointer-events-auto" onPointerDown={onClose} />

      <div
        className="relative pointer-events-auto w-full max-w-2xl rounded-3xl bg-white/95 backdrop-blur-md border-2 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4"
        style={{ borderColor: npc.accent }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 sm:px-5 py-3"
          style={{ background: `linear-gradient(135deg, ${npc.accent}26, transparent)` }}
        >
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-xl shadow-sm shrink-0"
            style={{ backgroundColor: npc.accent }}
          >
            {MODEL_EMOJI[npc.model] ?? '🙂'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-slate-900 truncate">{npc.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{npc.role}</div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-5 py-4 space-y-3">
          <p
            className="text-sm text-slate-700 leading-relaxed min-h-[3.5rem] cursor-pointer"
            onClick={() => setTyped(text.length)}
            title={done ? undefined : 'Klik untuk percepat'}
          >
            {text.slice(0, typed)}
            {!done && <span className="inline-block w-1.5 h-4 ml-0.5 bg-slate-400 animate-pulse align-middle" />}
          </p>

          {done && node.choices && node.choices.length > 0 && (
            <div className="grid gap-1.5 pt-1">
              {node.choices.map((c, i) => (
                <button
                  key={i}
                  onClick={() => advance(c.next)}
                  className="group flex items-center gap-2 text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: npc.accent }} />
                  <span className="text-xs font-medium text-slate-700 flex-1">{c.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          )}

          {done && !node.choices && (
            <button
              onClick={() => advance(node.next ?? END)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Lanjut
            </button>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 sm:px-5 pb-3 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Ngobrol dengan {npc.name}</span>
          <span>
            Tekan <b className="text-slate-600">ESC</b> buat berhenti ngobrol
          </span>
        </div>
      </div>
    </div>
  )
}
