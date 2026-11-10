import React, { useState } from 'react'
import { CheckCircle2, Circle, Trophy, ChevronRight, ChevronDown } from 'lucide-react'

export interface QuestState {
  visitedAbout: boolean
  visitedProjects: boolean
  visitedSkills: boolean
  visitedContact: boolean
  allGemsCollected: boolean
}

interface QuestTrackerProps {
  quests: QuestState
  gemsCollected: number
  totalGems: number
}

export const QuestTracker: React.FC<QuestTrackerProps> = ({
  quests,
  gemsCollected,
  totalGems,
}) => {
  const [collapsed, setCollapsed] = useState(false)

  const items = [
    { title: 'Discover the Sanctuary of Identity', done: quests.visitedAbout },
    { title: 'Enter the Hall of Creation', done: quests.visitedProjects },
    { title: 'Activate the Tech Nexus', done: quests.visitedSkills },
    { title: 'Reach the Beacon Summit', done: quests.visitedContact },
    {
      title: `Collect All Energy Gems (${gemsCollected}/${totalGems})`,
      done: quests.allGemsCollected,
    },
  ]

  const completedCount = items.filter((i) => i.done).length
  const isMasterComplete = completedCount === items.length

  return (
    <div className="hidden sm:block select-none max-w-xs transition-all duration-200">
      <div className="p-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/70 shadow-lg shadow-slate-900/5 text-xs space-y-2.5">
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between cursor-pointer text-slate-700 hover:text-slate-900"
        >
          <div className="flex items-center gap-1.5 font-bold tracking-wide">
            <Trophy className={`w-4 h-4 ${isMasterComplete ? 'text-amber-500' : 'text-blue-600'}`} />
            <span>QUEST LOG</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              {completedCount}/{items.length}
            </span>
          </div>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>

        {!collapsed && (
          <div className="space-y-1.5 pt-1 border-t border-slate-200">
            {items.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 py-1 px-1.5 rounded-lg transition ${
                  item.done ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {item.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                )}
                <span className={`text-[11px] truncate ${item.done ? 'line-through opacity-80' : ''}`}>
                  {item.title}
                </span>
              </div>
            ))}

            {isMasterComplete && (
              <div className="mt-2 p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 text-[10px] text-center font-bold animate-pulse">
                🏆 Island Master Explorer Unlocked!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
