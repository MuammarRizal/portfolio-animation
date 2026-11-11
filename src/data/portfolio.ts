export interface Project {
  title: string
  desc: string
  tags: string[]
  link: string
  github?: string
  color: string
}

/** Which portfolio panel a zone opens. Zones across different islands can share a kind. */
export type ZoneKind = 'about' | 'projects' | 'skills' | 'contact'

export interface ZoneData {
  id: string
  /** Which panel layout/content this zone opens. */
  kind: ZoneKind
  title: string
  subtitle: string
  color: string
  position: [number, number, number]
  radius: number
  /** Optional extra intro line shown in the panel (island-specific flavour). */
  blurb?: string
}

// Map expanded to massive realm size: island radius ~ 68, zones positioned at outposts
const HIJAU_ZONES: ZoneData[] = [
  {
    id: 'about',
    kind: 'about',
    title: 'Kuil Identitas',
    subtitle: 'Muammar Rizal • Bio & Keahlian',
    color: '#3b82f6', // blue
    position: [-36, 0, -32],
    radius: 6.5,
  },
  {
    id: 'projects',
    kind: 'projects',
    title: 'Aula Kreasi',
    subtitle: 'Karya 3D & Fullstack Epik',
    color: '#a855f7', // purple
    position: [36, 0, -32],
    radius: 7.0,
  },
  {
    id: 'skills',
    kind: 'skills',
    title: 'Nexus Teknologi',
    subtitle: 'Arsenal & Kompetensi Inti',
    color: '#10b981', // emerald
    position: [-36, 0, 36],
    radius: 6.5,
  },
  {
    id: 'contact',
    kind: 'contact',
    title: 'Puncak Mercusuar',
    subtitle: 'Panggil & Terhubung dengan Gw',
    color: '#f59e0b', // amber
    position: [36, 0, 36],
    radius: 6.5,
  },
]

export const PROJECTS: Project[] = [
  {
    title: 'Portfolio RPG 3D Interaktif',
    desc: 'Portfolio petualangan dunia terbuka yang dibangun pakai Three.js, React Three Fiber, dan Tailwind. Dilengkapi pencahayaan real-time, zona interaktif, fisika lompatan yang responsif, dan koleksi kristal.',
    tags: ['React', 'Three.js', 'R3F', 'TypeScript', 'Tailwind'],
    link: '#',
    github: 'https://github.com',
    color: '#6366f1',
  },
  {
    title: 'Platform Cloud SaaS Fullstack',
    desc: 'Dashboard infrastruktur cloud yang skalabel dengan telemetri real-time, backup otomatis, dan analisis performa bertenaga AI.',
    tags: ['Next.js', 'Go', 'Docker', 'PostgreSQL', 'Tailwind'],
    link: '#',
    github: 'https://github.com',
    color: '#3b82f6',
  },
  {
    title: 'Mesin Alur Kerja Otomatis AI',
    desc: 'Orkestrator agen otonom yang menghubungkan toolchain eksternal, mesin generasi kode, dan antrean job di background.',
    tags: ['TypeScript', 'FastAPI', 'Redis', 'Python'],
    link: '#',
    github: 'https://github.com',
    color: '#ec4899',
  },
]

export interface GemData {
  id: number
  x: number
  y: number
  z: number
  color: string
}

// 16 Energy Gems scattered across the massive realm (some require jumping)
const HIJAU_GEMS: GemData[] = [
  { id: 1, x: -12, y: 1.4, z: -8, color: '#38bdf8' },
  { id: 2, x: 12, y: 1.4, z: -8, color: '#c084fc' },
  { id: 3, x: -12, y: 1.4, z: 12, color: '#34d399' },
  { id: 4, x: 12, y: 1.4, z: 12, color: '#fbbf24' },
  { id: 5, x: 0, y: 2.6, z: -22, color: '#f43f5e' },
  { id: 6, x: 0, y: 2.6, z: 22, color: '#f43f5e' },
  { id: 7, x: -24, y: 1.4, z: 0, color: '#38bdf8' },
  { id: 8, x: 24, y: 1.4, z: 0, color: '#fbbf24' },
  { id: 9, x: -46, y: 1.8, z: -14, color: '#34d399' },
  { id: 10, x: 46, y: 1.8, z: -14, color: '#c084fc' },
  { id: 11, x: -46, y: 1.8, z: 18, color: '#38bdf8' },
  { id: 12, x: 46, y: 1.8, z: 18, color: '#fbbf24' },
  { id: 13, x: 0, y: 3.4, z: 0, color: '#f43f5e' },
  { id: 14, x: -30, y: 2.2, z: -44, color: '#34d399' },
  { id: 15, x: 30, y: 2.2, z: -44, color: '#c084fc' },
  { id: 16, x: 0, y: 2.2, z: -58, color: '#38bdf8' },
]

export const SKILLS_CATEGORIES = [
  {
    category: 'Dev 3D & Kreatif',
    skills: ['Three.js', 'React Three Fiber', 'GLSL / Shaders', 'Blender Low-Poly', 'Drei', 'Canvas API'],
  },
  {
    category: 'Rekayasa Frontend',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Vite', 'State Management (Zustand)'],
  },
  {
    category: 'Backend & Sistem',
    skills: ['Node.js', 'Express / Nest', 'Python / FastAPI', 'PostgreSQL / Supabase', 'REST & GraphQL', 'Docker'],
  },
  {
    category: 'Game & Interaksi',
    skills: ['Collision Detection', 'Jump Physics', 'Raycasting', 'Camera Controllers', 'Smooth Lerping', 'Game Loops'],
  },
]

/** One block of content inside a house's mini-zone panel. */
export interface HouseSection {
  icon: string
  heading: string
  body: string
  bullets?: string[]
}

export type HouseRoof = 'gable' | 'hip' | 'tower'
export type HousePalette = 'wood' | 'stone' | 'plaster'

/**
 * A solid village house you cannot enter — walking up to it opens a mini-zone
 * panel instead. Geometry (footprint + height) lives in `game/world.ts`; only
 * placement + content live here, mirroring how ZONES is split from the terrain.
 */
export interface HouseData {
  id: string
  name: string
  subtitle: string
  color: string
  x: number
  z: number
  rot: number
  /** Uniform mesh scale — also scales the generated colliders. */
  scale: number
  roof: HouseRoof
  palette: HousePalette
  kind: 'portfolio' | 'flavor'
  sections: HouseSection[]
}

// The village: 9 houses split across 3 hamlets (north, south, east of the spawn
// plaza). Residential flavour mixed with portfolio doors — knock at each one.
const HIJAU_HOUSES: HouseData[] = [
  // ---- Dusun Utara (0, -38) ----
  {
    id: 'bio',
    name: 'Rumah Bio',
    subtitle: 'Kenalan dulu sama yang bikin pulau ini',
    color: '#3b82f6',
    x: -6.5,
    z: -39,
    rot: 0.6,
    scale: 1.0,
    roof: 'gable',
    palette: 'wood',
    kind: 'portfolio',
    sections: [
      {
        icon: '🧑‍💻',
        heading: 'Siapa Gw?',
        body: 'Muammar Rizal — teknolog kreatif & engineer 3D fullstack dari Jakarta, Indonesia.',
      },
      {
        icon: '🎓',
        heading: 'Fokus Gw',
        body: 'Bangun pengalaman web interaktif yang terasa seperti game: WebGL, React, dan arsitektur frontend yang rapi.',
        bullets: ['3+ tahun rekayasa perangkat lunak', '20+ proyek rilis ke produksi', 'Suka low-poly, shader, dan optimasi FPS'],
      },
    ],
  },
  {
    id: 'workshop',
    name: 'Bengkel Proyek',
    subtitle: 'Tempat karya-karya gw dirakit',
    color: '#a855f7',
    x: 0,
    z: -35.5,
    rot: 0,
    scale: 1.08,
    roof: 'gable',
    palette: 'stone',
    kind: 'portfolio',
    sections: [
      {
        icon: '🧰',
        heading: 'Bengkel Karya',
        body: 'Beberapa proyek yang paling gw banggain:',
        bullets: PROJECTS.map((p) => p.title),
      },
      {
        icon: '⚙️',
        heading: 'Cara Kerja',
        body: 'Tiap proyek mulai dari prototipe kecil, lalu dioptimasi terus sampai enak dipakai di HP.',
      },
    ],
  },
  {
    id: 'library',
    name: 'Perpustakaan Skill',
    subtitle: 'Rak-rak ilmu yang gw kuasai',
    color: '#10b981',
    x: 6.5,
    z: -39,
    rot: -0.6,
    scale: 0.94,
    roof: 'hip',
    palette: 'plaster',
    kind: 'portfolio',
    sections: [
      {
        icon: '📚',
        heading: 'Rak Skill',
        body: 'Kategori utama kemampuan gw:',
        bullets: SKILLS_CATEGORIES.map((c) => c.category),
      },
      {
        icon: '🚀',
        heading: 'Terus Belajar',
        body: 'Sekarang lagi fokus ke WebGPU, TSL, dan animasi karakter real-time.',
      },
    ],
  },

  // ---- Dusun Selatan (0, 38) ----
  {
    id: 'post',
    name: 'Kantor Pos',
    subtitle: 'Kirim pesan, gw balas',
    color: '#f59e0b',
    x: -6.5,
    z: 39,
    rot: -0.6,
    scale: 1.0,
    roof: 'gable',
    palette: 'plaster',
    kind: 'portfolio',
    sections: [
      {
        icon: '✉️',
        heading: 'Kirim Pesan',
        body: 'Punya ide kolaborasi atau butuh engineer 3D fullstack? Gw terbuka banget.',
      },
      {
        icon: '📮',
        heading: 'Kontak',
        body: 'Kurir pos kami siap antar pesan lu:',
        bullets: [
          'GitHub: github.com/MuammarRizal',
          'Repo pulau ini: portfolio-animation',
          'Kontak lengkap ada di Puncak Mercusuar',
        ],
      },
    ],
  },
  {
    id: 'cafe',
    name: 'Warung Kopi',
    subtitle: 'Nongkrong sambil ngobrol soal kode',
    color: '#b45309',
    x: 0,
    z: 35.5,
    rot: Math.PI,
    scale: 1.05,
    roof: 'hip',
    palette: 'wood',
    kind: 'flavor',
    sections: [
      {
        icon: '☕',
        heading: 'Kopi Dulu',
        body: 'Kata warga, kopi di sini bisa naikin FPS 20%. (Nggak terbukti, tapi nikmat.)',
      },
      {
        icon: '💡',
        heading: 'Fakta Dunia',
        body: 'Pulau ini dirender real-time di browser pakai Three.js — nggak ada video, semua dihitung ulang tiap frame.',
      },
    ],
  },
  {
    id: 'attic',
    name: 'Gudang Nostalgia',
    subtitle: 'Kotak-kotak kenangan masa belajar',
    color: '#7c3aed',
    x: 6.5,
    z: 39,
    rot: 0.6,
    scale: 0.96,
    roof: 'gable',
    palette: 'wood',
    kind: 'flavor',
    sections: [
      {
        icon: '📦',
        heading: 'Isi Gudang',
        body: 'Kotak-kotak kenangan dari masa awal belajar ngoding.',
      },
      {
        icon: '🕹️',
        heading: 'Stack Pertama',
        body: 'Perjalanan toolchain gw dari dulu:',
        bullets: ['HTML/CSS → JavaScript', 'React → Next.js', 'Three.js → shader & game loop'],
      },
    ],
  },

  // ---- Dusun Timur (44, 6) ----
  {
    id: 'shaderhut',
    name: 'Saung Shader',
    subtitle: 'Rumus-rumus ajaib yang nggambar ke layar',
    color: '#06b6d4',
    x: 40.5,
    z: 1.5,
    rot: 1.2,
    scale: 0.9,
    roof: 'tower',
    palette: 'plaster',
    kind: 'flavor',
    sections: [
      {
        icon: '🌊',
        heading: 'Rumus Ritual',
        body: 'Shader itu cuma rumus matematika yang menggambar ke layar. Seremnya cuma di nama.',
      },
      {
        icon: '✨',
        heading: 'Tips WebGL',
        body: 'Kalau frame drop, cek tiga hal ini dulu:',
        bullets: ['Kurangi draw call — pakai instancing', 'Batasi pixel ratio (dpr)', 'Matikan bayangan kalau nggak perlu'],
      },
    ],
  },
  {
    id: 'villager',
    name: 'Rumah Warga',
    subtitle: 'Penduduk pulau yang ramah',
    color: '#059669',
    x: 46,
    z: 6,
    rot: Math.PI / 2,
    scale: 1.1,
    roof: 'hip',
    palette: 'wood',
    kind: 'flavor',
    sections: [
      {
        icon: '🧑‍🌾',
        heading: 'Penduduk',
        body: 'Warga di pulau ini NPC prosedural — mereka jalan berkeliling tanpa naskah.',
      },
      {
        icon: '👋',
        heading: 'Sapa Mereka',
        body: 'Coba datangi salah satu warga; kadang mereka ngasih komentar random.',
      },
    ],
  },
  {
    id: 'watchtower',
    name: 'Pos Ronda',
    subtitle: 'Menara pantau seluruh pulau',
    color: '#ef4444',
    x: 40.5,
    z: 10.5,
    rot: 2.2,
    scale: 0.92,
    roof: 'tower',
    palette: 'stone',
    kind: 'flavor',
    sections: [
      {
        icon: '🔭',
        heading: 'Pos Pengawas',
        body: 'Dari sini kelihatan seluruh pulau — kuil, aula, dan mercusuar.',
      },
      {
        icon: '🎁',
        heading: 'Easter Egg',
        body: 'Kalau lu udah kumpulin ke-16 kristal energi, konfeti bakal meledak. Selamat, Master Pulau!',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Island II — "Pulau Salju" (frozen tundra across the sea)
// ---------------------------------------------------------------------------

// Zone layout mirrors Pulau Hijau's outposts, but the content is its own:
// a frozen archive of the same portfolio, framed by the winter island.
const SALJU_ZONES: ZoneData[] = [
  {
    id: 'salju-about',
    kind: 'about',
    title: 'Kuil Kabut Beku',
    subtitle: 'Jejak awal sang pembuat pulau',
    color: '#38bdf8',
    position: [-36, 0, -32],
    radius: 6.5,
    blurb: 'Versi dingin dari cerita yang sama: dari mana gw mulai, dan kenapa gw betah ngulik dunia maya sampai sekarang.',
  },
  {
    id: 'salju-projects',
    kind: 'projects',
    title: 'Galeri Es',
    subtitle: 'Karya yang dibekukan waktu',
    color: '#818cf8',
    position: [36, 0, -32],
    radius: 7.0,
    blurb: 'Arsip karya yang gw simpan di suhu beku — biar nggak lapuk dimakan waktu.',
  },
  {
    id: 'salju-skills',
    kind: 'skills',
    title: 'Arsip Beku',
    subtitle: 'Catatan ilmu dari masa ke masa',
    color: '#2dd4bf',
    position: [-36, 0, 36],
    radius: 6.5,
    blurb: 'Rak-rak ilmu yang gw pelajari sepanjang perjalanan, dibekukan biar tetap awet dan bisa gw buka kapan aja.',
  },
  {
    id: 'salju-contact',
    kind: 'contact',
    title: 'Suar Badai',
    subtitle: 'Kirim sinyal lewat tengah badai',
    color: '#fbbf24',
    position: [36, 0, 36],
    radius: 6.5,
    blurb: 'Kalau badai lagi reda, suar ini bakal nembak pesan lu langsung ke gw.',
  },
]

// 16 frozen energy crystals (ids 17–32), mirroring the sunny island's layout.
const SALJU_GEMS: GemData[] = [
  { id: 17, x: -12, y: 1.4, z: -8, color: '#7dd3fc' },
  { id: 18, x: 12, y: 1.4, z: -8, color: '#c4b5fd' },
  { id: 19, x: -12, y: 1.4, z: 12, color: '#5eead4' },
  { id: 20, x: 12, y: 1.4, z: 12, color: '#fde68a' },
  { id: 21, x: 0, y: 2.6, z: -22, color: '#7dd3fc' },
  { id: 22, x: 0, y: 2.6, z: 22, color: '#c4b5fd' },
  { id: 23, x: -24, y: 1.4, z: 0, color: '#5eead4' },
  { id: 24, x: 24, y: 1.4, z: 0, color: '#fde68a' },
  { id: 25, x: -46, y: 1.8, z: -14, color: '#7dd3fc' },
  { id: 26, x: 46, y: 1.8, z: -14, color: '#c4b5fd' },
  { id: 27, x: -46, y: 1.8, z: 18, color: '#5eead4' },
  { id: 28, x: 46, y: 1.8, z: 18, color: '#fde68a' },
  { id: 29, x: 0, y: 3.4, z: 0, color: '#7dd3fc' },
  { id: 30, x: -30, y: 2.2, z: -44, color: '#c4b5fd' },
  { id: 31, x: 30, y: 2.2, z: -44, color: '#5eead4' },
  { id: 32, x: 0, y: 2.2, z: -58, color: '#fde68a' },
]

const SALJU_HOUSES: HouseData[] = [
  // ---- Dusun Beku Utara (0, -38) ----
  {
    id: 'salju-bio',
    name: 'Pondok Catatan',
    subtitle: 'Buku harian yang membeku di rak utara',
    color: '#38bdf8',
    x: -6.5,
    z: -39,
    rot: 0.6,
    scale: 1.0,
    roof: 'gable',
    palette: 'wood',
    kind: 'portfolio',
    sections: [
      {
        icon: '🧊',
        heading: 'Catatan Beku',
        body: 'Muammar Rizal — teknolog kreatif & engineer 3D fullstack dari Jakarta, Indonesia. Versi arsipnya gw simpan di sini biar awet.',
      },
      {
        icon: '📖',
        heading: 'Isi Buku',
        body: 'Awalnya cuma iseng bikin kubus muter di browser, sekarang jadi pulau penuh.',
        bullets: ['3+ tahun rekayasa perangkat lunak', '20+ proyek rilis ke produksi', 'Hobi: shader, low-poly, dan optimasi FPS'],
      },
    ],
  },
  {
    id: 'salju-workshop',
    name: 'Bengkel Beku',
    subtitle: 'Meja kerja yang nggak pernah debu-an',
    color: '#818cf8',
    x: 0,
    z: -35.5,
    rot: 0,
    scale: 1.08,
    roof: 'gable',
    palette: 'stone',
    kind: 'portfolio',
    sections: [
      {
        icon: '🧰',
        heading: 'Rak Proyek',
        body: 'Proyek yang gw simpan di suhu beku biar nggak lapuk:',
        bullets: PROJECTS.map((p) => p.title),
      },
      {
        icon: '❄️',
        heading: 'Cara Kerja',
        body: 'Tiap proyek mulai dari prototipe kecil, dioptimasi pelan-pelan sampai enteng dipakai di HP.',
      },
    ],
  },
  {
    id: 'salju-library',
    name: 'Rak Ilmu Beku',
    subtitle: 'Buku-buku yang nggak bisa basi',
    color: '#2dd4bf',
    x: 6.5,
    z: -39,
    rot: -0.6,
    scale: 0.94,
    roof: 'hip',
    palette: 'plaster',
    kind: 'portfolio',
    sections: [
      {
        icon: '📚',
        heading: 'Daftar Ilmu',
        body: 'Kategori kemampuan yang gw bekukan di rak ini:',
        bullets: SKILLS_CATEGORIES.map((c) => c.category),
      },
      {
        icon: '🚀',
        heading: 'Terus Dipelajari',
        body: 'Sekarang lagi ngulik WebGPU, TSL, dan animasi karakter real-time.',
      },
    ],
  },

  // ---- Dusun Beku Selatan (0, 38) ----
  {
    id: 'salju-post',
    name: 'Kantor Pos Salju',
    subtitle: 'Kurir sled siap antar pesan lu',
    color: '#fbbf24',
    x: -6.5,
    z: 39,
    rot: -0.6,
    scale: 1.0,
    roof: 'gable',
    palette: 'plaster',
    kind: 'portfolio',
    sections: [
      {
        icon: '✉️',
        heading: 'Kirim Pesan',
        body: 'Punya ide kolaborasi atau butuh engineer 3D fullstack? Kirim aja, badai pun gw tembus.',
      },
      {
        icon: '📮',
        heading: 'Kontak',
        body: 'Kurir pos kami siap antar pesan lu:',
        bullets: [
          'GitHub: github.com/MuammarRizal',
          'Repo pulau ini: portfolio-animation',
          'Kontak lengkap ada di Suar Badai',
        ],
      },
    ],
  },
  {
    id: 'salju-cafe',
    name: 'Warung Sup Panas',
    subtitle: 'Hangat, cocok buat ngobrol lama',
    color: '#b45309',
    x: 0,
    z: 35.5,
    rot: Math.PI,
    scale: 1.05,
    roof: 'hip',
    palette: 'wood',
    kind: 'flavor',
    sections: [
      {
        icon: '🍲',
        heading: 'Hangat Dulu',
        body: 'Kata warga, sup di sini bisa naikin FPS 20%. (Nggak terbukti, tapi nikmat.)',
      },
      {
        icon: '💡',
        heading: 'Fakta Dunia',
        body: 'Pulau ini dirender real-time di browser pakai Three.js — nggak ada video, semua dihitung ulang tiap frame.',
      },
    ],
  },
  {
    id: 'salju-attic',
    name: 'Gudang Es',
    subtitle: 'Kotak-kotak kenangan yang awet beku',
    color: '#7c3aed',
    x: 6.5,
    z: 39,
    rot: 0.6,
    scale: 0.96,
    roof: 'gable',
    palette: 'wood',
    kind: 'flavor',
    sections: [
      {
        icon: '📦',
        heading: 'Isi Gudang',
        body: 'Kotak-kotak kenangan dari masa awal belajar ngoding, dibekukan biar nggak rusak.',
      },
      {
        icon: '🕹️',
        heading: 'Stack Pertama',
        body: 'Perjalanan toolchain gw dari dulu:',
        bullets: ['HTML/CSS → JavaScript', 'React → Next.js', 'Three.js → shader & game loop'],
      },
    ],
  },

  // ---- Dusun Beku Timur (44, 6) ----
  {
    id: 'salju-shaderhut',
    name: 'Saung Pualam',
    subtitle: 'Rumus ajaib yang nggambar ke layar beku',
    color: '#06b6d4',
    x: 40.5,
    z: 1.5,
    rot: 1.2,
    scale: 0.9,
    roof: 'tower',
    palette: 'plaster',
    kind: 'flavor',
    sections: [
      {
        icon: '🌊',
        heading: 'Rumus Ritual',
        body: 'Shader itu cuma rumus matematika yang menggambar ke layar. Seremnya cuma di nama.',
      },
      {
        icon: '✨',
        heading: 'Tips WebGL',
        body: 'Kalau frame drop, cek tiga hal ini dulu:',
        bullets: ['Kurangi draw call — pakai instancing', 'Batasi pixel ratio (dpr)', 'Matikan bayangan kalau nggak perlu'],
      },
    ],
  },
  {
    id: 'salju-villager',
    name: 'Pondok Penduduk',
    subtitle: 'Warga tundra yang ramah',
    color: '#059669',
    x: 46,
    z: 6,
    rot: Math.PI / 2,
    scale: 1.1,
    roof: 'hip',
    palette: 'wood',
    kind: 'flavor',
    sections: [
      {
        icon: '🧊',
        heading: 'Penduduk',
        body: 'Warga di pulau ini NPC prosedural — mereka jalan berkeliling tanpa naskah.',
      },
      {
        icon: '👋',
        heading: 'Sapa Mereka',
        body: 'Coba datangi salah satu warga; kadang mereka ngasih komentar random.',
      },
    ],
  },
  {
    id: 'salju-watchtower',
    name: 'Menara Pantau',
    subtitle: 'Menara pemantau dua pulau',
    color: '#ef4444',
    x: 40.5,
    z: 10.5,
    rot: 2.2,
    scale: 0.92,
    roof: 'tower',
    palette: 'stone',
    kind: 'flavor',
    sections: [
      {
        icon: '🔭',
        heading: 'Pos Pengawas',
        body: 'Dari sini kelihatan Pulau Salju, dan kalau cerah, siluet Pulau Hijau di seberang laut.',
      },
      {
        icon: '🎁',
        heading: 'Easter Egg',
        body: 'Kalau lu udah kumpulin semua kristal di dua pulau, konfeti bakal meledak. Selamat, Master Kepulauan!',
      },
    ],
  },
]

/** All content that lives on one island (positions are island-local). */
export interface IslandContent {
  id: string
  name: string
  subtitle: string
  /** World-space centre of the island; content below is authored relative to it. */
  origin: [number, number]
  zones: ZoneData[]
  gems: GemData[]
  houses: HouseData[]
}

/**
 * Content grouped by island. The renderers and the world factory look a map up
 * here (in island-local coordinates), while the HUD/proximity loops read the
 * flattened aggregates below — already shifted into world space — so progress
 * (gems, quests, visits) is global across every island.
 */
export const ISLANDS: Record<string, IslandContent> = {
  hijau: {
    id: 'hijau',
    name: 'Pulau Hijau',
    subtitle: 'Pulau matahari — tempat petualangan dimulai',
    origin: [0, 0],
    zones: HIJAU_ZONES,
    gems: HIJAU_GEMS,
    houses: HIJAU_HOUSES,
  },
  salju: {
    id: 'salju',
    name: 'Pulau Salju',
    subtitle: 'Tundra beku di seberang laut',
    origin: [-320, 0],
    zones: SALJU_ZONES,
    gems: SALJU_GEMS,
    houses: SALJU_HOUSES,
  },
}

const ISLAND_LIST = Object.values(ISLANDS)

export const ZONES: ZoneData[] = ISLAND_LIST.flatMap((i) =>
  i.zones.map((z) => ({
    ...z,
    position: [z.position[0] + i.origin[0], z.position[1], z.position[2] + i.origin[1]] as [number, number, number],
  }))
)
export const GEMS: GemData[] = ISLAND_LIST.flatMap((i) => i.gems.map((g) => ({ ...g, x: g.x + i.origin[0], z: g.z + i.origin[1] })))
export const HOUSES: HouseData[] = ISLAND_LIST.flatMap((i) =>
  i.houses.map((h) => ({ ...h, x: h.x + i.origin[0], z: h.z + i.origin[1] }))
)
