export interface Project {
  title: string
  desc: string
  tags: string[]
  link: string
  github?: string
  color: string
}

export interface ZoneData {
  id: 'about' | 'projects' | 'skills' | 'contact'
  title: string
  subtitle: string
  color: string
  position: [number, number, number]
  radius: number
}

// Map expanded to massive realm size: island radius ~ 68, zones positioned at outposts
export const ZONES: ZoneData[] = [
  {
    id: 'about',
    title: 'Sanctuary of Identity',
    subtitle: 'Muammar Rizal • Bio & Mastery',
    color: '#3b82f6', // blue
    position: [-36, 0, -32],
    radius: 6.5,
  },
  {
    id: 'projects',
    title: 'Hall of Creation',
    subtitle: 'Epic 3D & Fullstack Artifacts',
    color: '#a855f7', // purple
    position: [36, 0, -32],
    radius: 7.0,
  },
  {
    id: 'skills',
    title: 'The Tech Nexus',
    subtitle: 'Arsenal & Core Capabilities',
    color: '#10b981', // emerald
    position: [-36, 0, 36],
    radius: 6.5,
  },
  {
    id: 'contact',
    title: 'The Beacon Summit',
    subtitle: 'Summon & Connect with Me',
    color: '#f59e0b', // amber
    position: [36, 0, 36],
    radius: 6.5,
  },
]

export const PROJECTS: Project[] = [
  {
    title: 'Interactive 3D Portfolio RPG',
    desc: 'An exploratory open-world adventure portfolio built with Three.js, React Three Fiber, and Tailwind. Features real-time lighting, interactive zones, responsive jump physics, and collectibles.',
    tags: ['React', 'Three.js', 'R3F', 'TypeScript', 'Tailwind'],
    link: '#',
    github: 'https://github.com',
    color: '#6366f1',
  },
  {
    title: 'Fullstack SaaS Cloud Platform',
    desc: 'Scalable cloud infrastructure dashboard with real-time telemetry, automated backups, and AI-powered performance analysis.',
    tags: ['Next.js', 'Go', 'Docker', 'PostgreSQL', 'Tailwind'],
    link: '#',
    github: 'https://github.com',
    color: '#3b82f6',
  },
  {
    title: 'AI Automated Workflow Engine',
    desc: 'Autonomous agent orchestrator connecting external toolchains, code generation engines, and background job queues.',
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
export const GEMS: GemData[] = [
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
    category: '3D & Creative Dev',
    skills: ['Three.js', 'React Three Fiber', 'GLSL / Shaders', 'Blender Low-Poly', 'Drei', 'Canvas API'],
  },
  {
    category: 'Frontend Engineering',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Vite', 'State Management (Zustand)'],
  },
  {
    category: 'Backend & Systems',
    skills: ['Node.js', 'Express / Nest', 'Python / FastAPI', 'PostgreSQL / Supabase', 'REST & GraphQL', 'Docker'],
  },
  {
    category: 'Game & Interaction',
    skills: ['Collision Detection', 'Jump Physics', 'Raycasting', 'Camera Controllers', 'Smooth Lerping', 'Game Loops'],
  },
]
