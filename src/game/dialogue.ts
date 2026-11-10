// Dialogue trees for the wandering villagers.
//
// Each NPC exposes a small branching conversation: a hub node with a few topics
// (each topic can lead to another node, then back to the hub). Content is written
// in the villagers' own voice — half world lore, half portfolio, half nonsense.
import { VILLAGERS } from './npcs'

export interface DialogueChoice {
  /** Button label shown to the player. */
  label: string
  /** Node to jump to. Use END to close the conversation. */
  next: string
}

export interface DialogueNode {
  id: string
  text: string
  choices?: DialogueChoice[]
  /** Auto-advance target when the node has no explicit choices. */
  next?: string
}

export interface DialogueTree {
  /** Node the conversation opens on. */
  start: string
  nodes: Record<string, DialogueNode>
}

/** Sentinel: a choice that closes the dialogue panel. */
export const END = '__end__'

const bye: DialogueChoice = { label: '👋 Dadah, makasih!', next: END }
const back: DialogueChoice = { label: '↩️ Ada lagi?', next: 'hub' }

export const DIALOGUES: Record<string, DialogueTree> = {
  // ---- Pak Bijak: guardian of the plaza, sets the tone ----
  'npc-bijak': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Selamat datang di pulau ini, penjelajah. Gw Pak Bijak, yang jaga alun-alun. Mau mampir ngobrol apa?',
        choices: [
          { label: 'Pulau ini apa sih?', next: 'island' },
          { label: 'Gw harus ngapain?', next: 'quests' },
          { label: 'Ada rahasia?', next: 'secret' },
          bye,
        ],
      },
      island: {
        id: 'island',
        text: 'Ini pulau kecil yang dirender real-time di browser lu. Empat penjuru punya ceritanya sendiri: kuil, aula, nexus, dan mercusuar. Nggak ada video — semua dihitung ulang tiap frame.',
        choices: [back, bye],
      },
      quests: {
        id: 'quests',
        text: 'Kumpulin 16 kristal energi buat jadi Master Pulau. Mau cepet? Ikutin jalan batu yang nyambungin tiap penjuru — di sana banyak yang bisa lu intip.',
        choices: [back, bye],
      },
      secret: {
        id: 'secret',
        text: 'Ssst. Kalau lu tekan [F] deket hewan, lu bisa berburu — tapi jangan bilang siapa-siapa ya. Anak Rimba lebih tau soal itu.',
        choices: [back, bye],
      },
    },
  },

  // ---- Bu Dharma: gentle tutorial guide ----
  'npc-dharma': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Halo sayang! Gw Bu Dharma, pemandu pemula. Bingung nggak? Tanya aja, nggak usah malu.',
        choices: [
          { label: 'Caranya gerak gimana?', next: 'controls' },
          { label: 'Kristal itu apa?', next: 'gems' },
          { label: 'Ada tutorial lain?', next: 'tips' },
          bye,
        ],
      },
      controls: {
        id: 'controls',
        text: 'Gampang! WASD buat jalan, SPASI buat lompat, SHIFT buat lari. Di HP pakai joystick kiri. Kalau mau lihat pemandangan, drag layar buat putar kamera.',
        choices: [back, bye],
      },
      gems: {
        id: 'gems',
        text: 'Kristal energi — 16 biji nyebar di seluruh pulau. Warnanya beda-beda, dan beberapa butuh lompatan biar kena. Kumpulin semua, lu dapet gelar Master Pulau.',
        choices: [back, bye],
      },
      tips: {
        id: 'tips',
        text: 'Deketin kuil, aula, nexus, atau mercusuar, terus tekan [E]. Tiap tempat nyimpen cerita beda soal yang bikin pulau ini.',
        choices: [back, bye],
      },
    },
  },

  // ---- Sang Arca: the mystical identity keeper ----
  'npc-arca': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Aku Sang Arca, penjaga bahasa kuno di kuil ini. Di sini tersimpan identitas sang pembuat pulau. Ingin kau mendengarnya?',
        choices: [
          { label: 'Siapa pembuat pulau ini?', next: 'who' },
          { label: 'Kenapa semua ini ada?', next: 'why' },
          { label: 'Apa kekuatannya?', next: 'skills' },
          bye,
        ],
      },
      who: {
        id: 'who',
        text: 'Muammar Rizal — teknolog kreatif dari Jakarta. Ia membangun dunia ini dari Three.js, React, dan sedikit kesabaran. Tiga tahun merakit, dua puluh karya mengalir.',
        choices: [back, bye],
      },
      why: {
        id: 'why',
        text: 'Sebuah portfolio, kata orang. Namun aku melihatnya sebagai kuil: tempat karya disembah, bukan sekadar dipajang.',
        choices: [back, bye],
      },
      skills: {
        id: 'skills',
        text: 'Ia menguasai WebGL, shader, dan seni front-end yang rapi. Namun kekuatan sejatinya adalah kesabaran saat frame drop di tengah malam.',
        choices: [back, bye],
      },
    },
  },

  // ---- Teknisi Ava: the engineer at the workshop ----
  'npc-ava': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Eh, tamu! Gw Ava, yang ngoprek mesin di aula ini. Mau lihat-lihat isi bengkel?',
        choices: [
          { label: 'Proyek apa yang paling keren?', next: 'projects' },
          { label: 'Pakai teknologi apa?', next: 'stack' },
          { label: 'Mesinnya bising banget...', next: 'humor' },
          bye,
        ],
      },
      projects: {
        id: 'projects',
        text: 'Ada portfolio 3D ini sendiri, platform cloud SaaS, sama mesin alur kerja AI. Tiga-tiganya mulai dari prototipe kecil, terus digenjot sampai produksi.',
        choices: [back, bye],
      },
      stack: {
        id: 'stack',
        text: 'React, Next.js, TypeScript, Tailwind buat depan. Go, Python, Postgres, Docker buat belakang. Buat 3D-nya ya Three.js plus React Three Fiber.',
        choices: [back, bye],
      },
      humor: {
        id: 'humor',
        text: 'Bising? Itu suara draw call-nya semangat, bro. Asal di-instance, 4000 rumput pun bisa jalan satu tarikan napas.',
        choices: [back, bye],
      },
    },
  },

  // ---- Kurir Biner: comic relief on the data packets ----
  'npc-biner': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Eh eh eh, ada paket nih! Gw Kurir Biner, pengantar data keliling pulau. Lu mau terima titipan?',
        choices: [
          { label: 'Paket apa tuh?', next: 'packet' },
          { label: 'Ngapain keliling terus?', next: 'run' },
          { label: 'Gimana cara kontak yang bikin pulau?', next: 'contact' },
          bye,
        ],
      },
      packet: {
        id: 'packet',
        text: 'Isinya 200 OK dan satu field yang katanya "opsional". Nggak pernah gw anter karena alamatnya kosong. Klasik.',
        choices: [back, bye],
      },
      run: {
        id: 'run',
        text: 'Latensi nol katanya, tapi tiap kejauhan gini gw masih jogging. Kalau lu lompat entah kenapa ikut cepet — fisika pulau ini aneh tapi gw suka.',
        choices: [back, bye],
      },
      contact: {
        id: 'contact',
        text: 'Yang bikin pulau bisa dihubungi lewat Puncak Mercusuar sana. Atau lihat repo-nya di GitHub: MuammarRizal. Kirim pesan, biasanya dibales kalau nggak lagi ngoding.',
        choices: [back, bye],
      },
    },
  },

  // ---- Nexus Sage: the knowledge keeper ----
  'npc-sage': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Nexus menyambutmu. Aku penjaga pengetahuan. Ajukan pertanyaan, dan aku akan menjawab sejauh arsipku mengizinkan.',
        choices: [
          { label: 'Skill apa yang paling penting?', next: 'skill' },
          { label: 'Gimana cara belajar 3D web?', next: 'learn' },
          { label: 'Roadmap ke depannya?', next: 'roadmap' },
          bye,
        ],
      },
      skill: {
        id: 'skill',
        text: 'Empat pilar: pengembangan 3D kreatif, rekayasa front-end, sistem back-end, dan interaksi game. Kuasai satu, pelajari sisanya, dan dunia web akan patuh.',
        choices: [back, bye],
      },
      learn: {
        id: 'learn',
        text: 'Mulai dari satu kubus. Putar ia. Warnai ia. Lalu jumlahkan seribu kubus dan beri angin. Itulah Three.js — sisanya hanya kesabaran.',
        choices: [back, bye],
      },
      roadmap: {
        id: 'roadmap',
        text: 'WebGPU dan TSL adalah masa depan yang sedang kucatat. Animasi karakter real-time juga. Arsipku selalu terbuka bagi yang bertanya.',
        choices: [back, bye],
      },
    },
  },

  // ---- Penjaga Api: suggests working together ----
  'npc-api': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'HAH! Berani datang ke mercusuar! Gw Penjaga Api. Api gw panas, tapi hati gw... ya lumayan hangat. Mau ngapain?',
        choices: [
          { label: 'Gw butuh bantuan buat proyek', next: 'hire' },
          { label: 'Kenapa lu di sini?', next: 'why' },
          { label: 'Ada tips berkelahi?', next: 'fight' },
          bye,
        ],
      },
      hire: {
        id: 'hire',
        text: 'Bagus! Yang bikin pulau ini terbuka buat kolaborasi. Entah bikin web 3D, dashboard, atau sesuatu yang belum ada—lempar idenya ke Puncak Mercusuar. Kalau cocok, api kita gabung.',
        choices: [back, bye],
      },
      why: {
        id: 'why',
        text: 'Mercusuar ini mercusuar terakhir yang dilihat pengunjung sebelum pergi. Jadi gw harus bikin kesan terakhir yang membara. Literally.',
        choices: [back, bye],
      },
      fight: {
        id: 'fight',
        text: 'Hewan di pulau ini kalau dideketin malah kabur, jadi lu tinggal kejar dan ayun pedang. Jangan lama-lama—mereka cepet, dan lu bakal capai.',
        choices: [back, bye],
      },
    },
  },

  // ---- Anak Rimba: kid explorer, easter eggs ----
  'npc-rimba': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Wih, ketemu orang baru! Gw Anak Rimba, paling jago jalan-jalan di pulau ini. Mau gw kasih bocoran?',
        choices: [
          { label: 'Bocoran apa? Bocoran apa?', next: 'bocoran' },
          { label: 'Ada tempat seru?', next: 'spots' },
          { label: 'Lu pernah lihat sesuatu aneh?', next: 'weird' },
          bye,
        ],
      },
      bocoran: {
        id: 'bocoran',
        text: 'Kalau ke-16 kristal udah kekumpul, ada LEDAKAN konfeti! Gw udah lihat sekali. Serius, bang!',
        choices: [back, bye],
      },
      spots: {
        id: 'spots',
        text: 'Di kampung timur itu ada Pos Ronda. Dari situ keliatan seluruh pulau — kuil, aula, mercusuar, semua. Perlu agak naik sih, tapi worth it.',
        choices: [back, bye],
      },
      weird: {
        id: 'weird',
        text: 'Pernah! Gw lihat rumah yang Nggak bisa dimasukin, tapi kalau dideketin malah ngeluarin tulisan. Ajaib tapi bikin kesel.',
        choices: [back, bye],
      },
    },
  },
}

/** Fallback line if an NPC somehow has no authored tree. */
const FALLBACK: DialogueTree = {
  start: 'hub',
  nodes: {
    hub: {
      id: 'hub',
      text: 'Halo! Gw lagi sibuk, tapi senang ketemu lu.',
      choices: [{ label: '👋 Oke, dadah!', next: END }],
    },
  },
}

/** Every villager gets a tree — authored where possible, fallback otherwise. */
export const NPCS_WITH_DIALOGUE = VILLAGERS.map((v) => ({
  def: v,
  tree: DIALOGUES[v.id] ?? FALLBACK,
}))

export function getDialogue(npcId: string): DialogueTree {
  return DIALOGUES[npcId] ?? FALLBACK
}
