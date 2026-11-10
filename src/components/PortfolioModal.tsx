import React, { useState } from 'react'
import {
  X,
  ExternalLink,
  Code2,
  Mail,
  Send,
  Sparkles,
  Briefcase,
  Layers,
  Award,
  Gamepad2,
  CheckCircle2,
  Globe,
  Terminal,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { PROJECTS, SKILLS_CATEGORIES, type ZoneData } from '../data/portfolio'

interface PortfolioModalProps {
  zone: ZoneData | null
  onClose: () => void
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ zone, onClose }) => {
  const [formSent, setFormSent] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [activeProjectFilter, setActiveProjectFilter] = useState<'all' | '3d' | 'fullstack'>('all')

  if (!zone) return null

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSent(true)
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } })
    setTimeout(() => {
      setFormSent(false)
      setContactName('')
      setContactEmail('')
      setContactMessage('')
      onClose()
    }, 2400)
  }

  const filteredProjects = PROJECTS.filter((p) => {
    if (activeProjectFilter === '3d') return p.tags.includes('Three.js') || p.tags.includes('R3F')
    if (activeProjectFilter === 'fullstack') return p.tags.includes('Next.js') || p.tags.includes('FastAPI')
    return true
  })

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-400 text-sm transition'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 border border-white/70 p-5 sm:p-8 shadow-2xl text-slate-800"
        style={{ boxShadow: `0 20px 60px -20px ${zone.color}70` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-6 border-b border-slate-200 pb-4">
          <div className="w-4 h-10 rounded-full" style={{ backgroundColor: zone.color }} />
          <div>
            <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
              ZONE DISCOVERED
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">{zone.title}</h2>
            <p className="text-xs sm:text-sm text-slate-500">{zone.subtitle}</p>
          </div>
        </div>

        {/* 1. ABOUT */}
        {zone.id === 'about' && (
          <div className="space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-slate-50 to-white border border-blue-200">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0 border border-blue-300">
                MR
              </div>
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-xl font-bold text-slate-900">Muammar Rizal</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">LVL. 99 DEV</span>
                </div>
                <p className="text-blue-600 text-sm font-medium mt-0.5">Creative Technologist & Fullstack 3D Engineer</p>
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-500" /> Jakarta, Indonesia 🇮🇩 • Available for Collaborations
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> Character Bio
              </div>
              <p className="text-sm text-slate-700 italic">
                &ldquo;Gw percaya masa depan web bukan lagi cuma dokumen teks 2D statis. Menggabungkan kemudahan web dengan pengalaman 3D interaktif menciptakan impresi yang tak terlupakan bagi siapa saja yang berkunjung.&rdquo;
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Sparkles className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <div className="font-extrabold text-slate-900 text-base">3+ Years</div>
                <div className="text-xs text-slate-500">Engineering</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Briefcase className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
                <div className="font-extrabold text-slate-900 text-base">20+ Projects</div>
                <div className="text-xs text-slate-500">Shipped to Production</div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Award className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <div className="font-extrabold text-slate-900 text-base">High-FPS</div>
                <div className="text-xs text-slate-500">WebGL Optimized</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PROJECTS */}
        {zone.id === 'projects' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              {(['all', '3d', 'fullstack'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveProjectFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    activeProjectFilter === f ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f === 'all' ? 'All Works' : f === '3d' ? '3D & Creative' : 'Fullstack SaaS'}
                </button>
              ))}
            </div>

            <div className="space-y-3.5">
              {filteredProjects.map((proj, idx) => (
                <div key={idx} className="group p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-400 transition duration-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition">{proj.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600 leading-snug">{proj.desc}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {proj.github && (
                        <a href={proj.github} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition" title="View Repository">
                          <Code2 className="w-4 h-4" />
                        </a>
                      )}
                      <a href={proj.link} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-md" title="Live Demo">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3.5">
                    {proj.tags.map((t, tidx) => (
                      <span key={tidx} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SKILLS */}
        {zone.id === 'skills' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">
              Klasifikasi teknologi, library, dan arsitektur yang dikuasai untuk membangun produk digital berstandar tinggi:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {SKILLS_CATEGORIES.map((cat, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <Layers className="w-4 h-4" />
                    <h4>{cat.category}</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.skills.map((skill, sidx) => (
                      <span key={sidx} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. CONTACT */}
        {zone.id === 'contact' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">
              Punya ide proyek seru, tawaran kolaborasi, atau butuh konsultasi teknis? Kirim pesan langsung di bawah!
            </p>

            {formSent ? (
              <div className="p-8 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-2 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 text-amber-500 mx-auto" />
                <h4 className="text-lg font-bold text-slate-900">Pesan Berhasil Terkirim!</h4>
                <p className="text-sm text-amber-700">Thanks bro! Gw bakal segera respon balik pesan lu.</p>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Anda / Perusahaan</label>
                  <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Doe" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Email Kontak</label>
                  <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="john@example.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Pesan Kolaborasi</label>
                  <textarea rows={3} required value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} placeholder="Halo bro, gw mau ngajak kolab bikin web 3D interactive..." className={`${inputClass} resize-none`} />
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 font-bold text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/25 transition cursor-pointer">
                  <Send className="w-4 h-4" />
                  Kirim Pesan Sekarang
                </button>
              </form>
            )}

            <div className="pt-2 flex flex-wrap gap-4 justify-center border-t border-slate-200 text-xs text-slate-500">
              <a href="mailto:muammarrizal@example.com" className="flex items-center gap-1.5 hover:text-slate-900 transition">
                <Mail className="w-4 h-4 text-amber-500" /> muammarrizal@example.com
              </a>
              <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-slate-900 transition">
                <Code2 className="w-4 h-4 text-amber-500" /> github.com/muammarrizal
              </a>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4" /> Press ESC or click outside to resume exploring
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition underline cursor-pointer">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
