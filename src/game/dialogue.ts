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

  // ---- Pak Beku: guardian of the frozen plaza ----
  'npc-beku': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Hoho, ada yang berani nyebrang laut ke pulau beku ini. Gw Pak Beku, penjaga alun-alun es. Mau ngobrol apa?',
        choices: [
          { label: 'Pulau ini pulau apa?', next: 'island' },
          { label: 'Kenapa dingin banget?', next: 'cold' },
          { label: 'Ada yang beda dari pulau seberang?', next: 'diff' },
          bye,
        ],
      },
      island: {
        id: 'island',
        text: 'Ini Pulau Salju — arsip kedua dari portfolio yang sama. Empat penjurunya: kuil kabut, galeri es, arsip beku, dan suar badai.',
        choices: [back, bye],
      },
      cold: {
        id: 'cold',
        text: 'Dingin itu bonus, bro. Salju nutupin bug di tekstur, dan pengunjung jadi pengen cepet balik. Efisien!',
        choices: [back, bye],
      },
      diff: {
        id: 'diff',
        text: 'Yang bikin pulau ini ada: kapal. Di dermaga ada perahu kayuh yang bisa lu setir sendiri. Nggak ada auto-pilot, semua manual.',
        choices: [back, bye],
      },
    },
  },

  // ---- Bu Sani: winter guide ----
  'npc-sania': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Adik manis! Gw Bu Sani, pemandu musim dingin. Baru turun dari kapal ya? Tanya aja kalau bingung.',
        choices: [
          { label: 'Gimana cara balik ke pulau lama?', next: 'boat' },
          { label: 'Kristal di sini di mana aja?', next: 'gems' },
          { label: 'Ada tips jalan di salju?', next: 'tips' },
          bye,
        ],
      },
      boat: {
        id: 'boat',
        text: 'Ke dermaga, deketin kapalnya, tekan [E] buat naik. Terus setir pakai WASD sampai ketemu pantai pulau seberang, tekan [E] lagi buat turun.',
        choices: [back, bye],
      },
      gems: {
        id: 'gems',
        text: 'Ada 16 kristal beku di pulau ini — totalnya 32 se-kepulauan. Warnanya biru, ungu, toska, dan kuning gading. Beberapa nyempil di tebing.',
        choices: [back, bye],
      },
      tips: {
        id: 'tips',
        text: 'Salju licin di mata, tapi tanahnya nggak. Yang perlu lu hati-hati cuma pinggir tebing — di luar batas batu berdiri, dasar laut nunggu.',
        choices: [back, bye],
      },
    },
  },

  // ---- Arca Beku: keeper of the identity hut ----
  'npc-arca-es': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Kabut menyambutmu, pengembara. Aku Arca Beku, penjaga catatan identitas di kuil ini. Dengarkan, atau pergi?',
        choices: [
          { label: 'Siapa yang bikin semua ini?', next: 'who' },
          { label: 'Kenapa ada dua pulau?', next: 'two' },
          { label: 'Kenapa identitas harus dibekukan?', next: 'freeze' },
          bye,
        ],
      },
      who: {
        id: 'who',
        text: 'Muammar Rizal — teknolog kreatif dari Jakarta. Ia merakit dunia ini dari Three.js dan React, dan membiarkannya hidup di browser tanpa server.',
        choices: [back, bye],
      },
      two: {
        id: 'two',
        text: 'Satu pulau terlalu kecil untuk seluruh ceritanya. Maka ia membelah diri: pulau matahari untuk awal, pulau salju untuk arsip yang ingin awet.',
        choices: [back, bye],
      },
      freeze: {
        id: 'freeze',
        text: 'Supaya nggak lapuk dimakan waktu. Skill yang ia kunci di sini dulu pernah ia lupakan; sekarang disimpan beku biar bisa dibuka lagi kapan pun.',
        choices: [back, bye],
      },
    },
  },

  // ---- Teknisi Ine: frozen workshop engineer ----
  'npc-ava-es': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Eh tamu! Gw Ine, teknisi di galeri es ini. Semua mesin di sini dijalanin pakai sarung tangan wol. Mau lihat?',
        choices: [
          { label: 'Proyek apa yang disimpan di sini?', next: 'projects' },
          { label: 'Bedanya bengkel ini sama yang di pulau lama?', next: 'diff' },
          { label: 'Mesinnya nggak beku?', next: 'humor' },
          bye,
        ],
      },
      projects: {
        id: 'projects',
        text: 'Sama kayak arsipnya: portfolio 3D ini, platform cloud SaaS, dan mesin alur kerja AI. Semuanya dicadangkan di sini, jaga-jaga.',
        choices: [back, bye],
      },
      diff: {
        id: 'diff',
        text: 'Kalau bengkel seberang penuh perkakas, di sini penuh kabel penghangat. Sisanya sama: mulai prototipe kecil, genjot sampai produksi.',
        choices: [back, bye],
      },
      humor: {
        id: 'humor',
        text: 'Beku itu fitur, bro. Frame drop aja gw bekukan, jadi nggak ada yang drop sama sekali.',
        choices: [back, bye],
      },
    },
  },

  // ---- Kurir Sled: data packets on ice ----
  'npc-biner-es': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Wus! Hampir keserempet lu. Gw Kurir Sled, pengantar paket data lintas pulau. Ada titipan nggak?',
        choices: [
          { label: 'Nggak ada titipan, santai aja', next: 'ok' },
          { label: 'Lu antar paket dari pulau mana?', next: 'route' },
          { label: 'Kontaknya yang bikin pulau gimana?', next: 'contact' },
          bye,
        ],
      },
      ok: {
        id: 'ok',
        text: 'Ya udah, gw lanjut kayuh. Kalau lu butuh, ke dermaga aja — di situ ada perahu yang bisa lu pakai, lebih cepet dari sled gw.',
        choices: [back, bye],
      },
      route: {
        id: 'route',
        text: 'Dari Pulau Hijau tiap pagi, nyebrang laut, mendarat di dermaga salju. Paket paling berat isinya cuma satu field "opsional". Klasik.',
        choices: [back, bye],
      },
      contact: {
        id: 'contact',
        text: 'Yang bikin pulau ada di GitHub: MuammarRizal. Atau ke Suar Badai di penjuru tenggara, kirim pesan dari situ, badai pun nyampe.',
        choices: [back, bye],
      },
    },
  },

  // ---- Nexus Beku: keeper of the archive ----
  'npc-sage-es': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Arsip beku menyambutmu. Aku penjaga catatan. Bertanya, dan aku akan membuka rak yang tepat.',
        choices: [
          { label: 'Ilmu apa yang paling awet?', next: 'skill' },
          { label: 'Kenapa disimpan beku?', next: 'why' },
          { label: 'Rencana selanjutnya?', next: 'roadmap' },
          bye,
        ],
      },
      skill: {
        id: 'skill',
        text: 'Dasar-dasarnya: struktur data, algoritma, dan rasa penasaran. Teknologi boleh berganti tiap tahun, tapi tiga hal itu nggak pernah basi.',
        choices: [back, bye],
      },
      why: {
        id: 'why',
        text: 'Karena memori manusia bocor. Yang ditulis bisa dilupakan; yang dibekukan bisa dibuka lagi kapan pun kita butuh.',
        choices: [back, bye],
      },
      roadmap: {
        id: 'roadmap',
        text: 'WebGPU dan TSL sudah kucatat di rak depan. Animasi karakter real-time menyusul. Arsipku selalu bertambah, tak pernah cair.',
        choices: [back, bye],
      },
    },
  },

  // ---- Penjaga Suar: beacon operator ----
  'npc-suara': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'HATI-HATI ANGIN! Hah, ketemu juga orang di tengah badai. Gw penjaga Suar Badai. Mau ngapain ke sini?',
        choices: [
          { label: 'Gw mau ngajak kolab', next: 'hire' },
          { label: 'Suar ini buat apa?', next: 'why' },
          { label: 'Badainya sering?', next: 'storm' },
          bye,
        ],
      },
      hire: {
        id: 'hire',
        text: 'Bagus! Yang bikin pulau ini terbuka buat kolaborasi. Suar ini nembak pesan langsung ke dia. Tulis ide lu, kirim, beres.',
        choices: [back, bye],
      },
      why: {
        id: 'why',
        text: 'Suar ini jangkauannya paling jauh dari semua mercusuar. Dari sini, sinyalnya bisa nyampe ke pulau mana pun — termasuk yang belum dibikin.',
        choices: [back, bye],
      },
      storm: {
        id: 'storm',
        text: 'Tiap sore. Tapi tenang, warga sini udah kebal. Kalau lu kedinginan, mampir aja ke Warung Sup Panas di dusun selatan.',
        choices: [back, bye],
      },
    },
  },

  // ---- Anak Badai: tundra kid explorer ----
  'npc-badai': {
    start: 'hub',
    nodes: {
      hub: {
        id: 'hub',
        text: 'Wihii! Orang baru! Gw Anak Badai, paling jago lari di tundra. Mau bocoran?',
        choices: [
          { label: 'Bocoran apa? Bocoran apa?', next: 'bocoran' },
          { label: 'Ada tempat seru di sini?', next: 'spots' },
          { label: 'Pernah nyasar ke pulau seberang?', next: 'across' },
          bye,
        ],
      },
      bocoran: {
        id: 'bocoran',
        text: 'Kalau semua kristal di DUA pulau udah kekumpul, konfetinya dua kali lipat! Gw ngitung sendiri, serius, bang!',
        choices: [back, bye],
      },
      spots: {
        id: 'spots',
        text: 'Menara Pantau di dusun timur. Dari situ keliatan pulau seberang kayak titik hijau di garis laut. Kalau cerah aja sih.',
        choices: [back, bye],
      },
      across: {
        id: 'across',
        text: 'Pernah! Gw nyempil di perahu pak Beku. Di seberang rumputnya ijo banget, aneh. Di sini putih semua, lebih damai.',
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
