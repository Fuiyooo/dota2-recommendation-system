# Dota 2 Recommendation Data

Sistem data dan scoring untuk rekomendasi hero Dota 2. Mencakup Milestone 1
(integrasi data dan validasi patch 7.41f) dan Milestone 2 (characteristic
scoring dan SAW).

## Stack

| Komponen | Teknologi |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Backend | NestJS 12 + TypeScript |
| Database | SQLite + Prisma 6 |
| Sumber constants | Valve Datafeed (utama) |
| Sumber pelengkap | OpenDota dotaconstants (role, fallback attack type, `attack_point`) |
| Sumber meta | STRATZ GraphQL |
| Dokumentasi API | Swagger di `/api/docs` |

## Menjalankan

Prasyarat: Node.js 24 atau lebih baru, npm, dan `curl` (dipakai untuk request
STRATZ karena Cloudflare menolak request Node fetch biasa).

```bash
cd dota2-recommendation
npm install

# Sekali saja untuk menyiapkan database
cd backend
npx prisma migrate dev
cd ..

# Isi constants dan validasi patch
npm run sync:constants

# Buat satu snapshot meta Immortal
npm run sync:meta

# Hitung karakteristik seluruh hero
npm run calculate

# Isi pengaturan CC awal dari data Valve
npm run cc:seed

# Buat akun admin dan isi profil damage awal
npm run admin:seed
npm run profiles:seed

# Jalankan API dan frontend
npm run dev
```

Alamat default:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

## Environment

Salin `backend/.env.example` menjadi `backend/.env`, lalu isi:

```text
DATABASE_URL="file:./dev.db"
PORT=3000
STRATZ_TOKEN=token_rahasia
STRATZ_BRACKET=DIVINE_IMMORTAL
VALVE_LOCALE=english
PATCH_TARGET=7.41f

ADMIN_USERNAME=admin
ADMIN_PASSWORD=password-lokal-yang-kuat
ADMIN_JWT_SECRET=string-acak-panjang
CORS_ORIGIN=http://localhost:5173
```

Token hanya dipakai backend. Jangan menaruh `STRATZ_TOKEN` di frontend.

`ADMIN_PASSWORD` dan `ADMIN_JWT_SECRET` dipakai halaman admin. Akun dibuat
dengan `npm run admin:seed`, yang membaca dua nilai itu dari `.env`. Nilai
default untuk prototipe ini adalah username `admin` dan password `admin123!`.
Ganti password dengan nilai kuat untuk pemakaian nyata. Hindari karakter `#`
tanpa tanda kutip karena dotenv membacanya sebagai komentar.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Jalankan API dan frontend bersamaan |
| `npm run build` | Build backend dan frontend |
| `npm test` | Unit test backend |
| `npm run sync:constants` | Ambil Valve + dotaconstants, simpan raw, validasi patch |
| `npm run sync:patch` | Ulangi validasi patch saja |
| `npm run sync:meta` | Buat snapshot meta Immortal bila belum ada |
| `npm run calculate` | Hitung indikator, skor karakteristik, dan simpan run |
| `npm run admin:seed` | Buat atau perbarui akun admin dari `.env` |
| `npm run profiles:seed` | Isi profil damage awal untuk hero yang belum punya |
| `npm run cc:seed` | Isi pengaturan dispel dan pierce CC dari data Valve |

## Data Milestone 1

Hasil sync terakhir:

| Data | Jumlah |
| --- | ---: |
| Hero | 127 |
| Ability | 734 |
| Talent | 1.016 |
| Baris meta | 634 |
| Catatan patch 7.41f | 68 |
| Snapshot meta | 1 |

Catatan patch diambil langsung dari Valve dan tidak memakai flag review lokal.
Snapshot meta: patch 7.41f, bracket `DIVINE_IMMORTAL`, week 2965, posisi 1
sampai 5. Snapshot bersifat tetap. `npm run sync:meta` tidak mengambil data
baru jika snapshot sudah ada.

Valve adalah acuan utama untuk atribut, damage, talent, dan mekanisme ability.
OpenDota hanya dipakai untuk role, fallback attack type, dan `attack_point`,
dengan status `SUPPLEMENTAL`. Perbandingan nilai dan status `MISMATCH` sudah
dihapus.

## Data Milestone 2

Hasil `npm run calculate` terakhir:

| Data | Jumlah |
| --- | ---: |
| Hero dihitung | 127 |
| Indikator mentah | 1.397 |
| Indikator `SUPPORTED` | 1.397 |
| Indikator `PARTIAL` | 0 |
| Skor indikator | 1.397 |
| Skor karakteristik | 508 |
| Hero dengan ranking SAW | 127 |

`PARTIAL` berarti sebagian mekanisme ability belum terhitung penuh. Nilai
tersebut tetap dipakai dengan penanda coverage, bukan diubah menjadi 0.

### Konfigurasi perhitungan

| Parameter | Nilai |
| --- | --- |
| Hero level | 30 |
| Ability level | Maksimum |
| Talent | Semua talent level 30, dua opsi per tier, total 8 talent |
| Item | Tidak digunakan |
| Buff eksternal | Tidak digunakan |
| Basic attack window | 10 detik |
| Target basic attack | 1 target, armor 0 untuk raw physical |
| Target HP | 2.000 |
| Target mana | 1.000, mulai penuh |
| Movement speed cap | 550 |
| Attack speed cap | 700 |

### Basic attack

`attack_point` diambil dari OpenDota karena Valve Datafeed tidak menyediakannya.

```text
atribut_30 = base + growth × 29

hero STR/AGI/INT:
damage_30 = damage_min/max + primary_growth × 29

hero Universal:
damage_30 = damage_min/max + 0.7 × (STR30 + AGI30 + INT30)

AS_total = min(100 + agility_30 + bonus_AS_talent + bonus_AS_ability, 700)
APS      = AS_total / (100 × BAT)
interval = 1 / APS

serangan ke-i mendarat pada:
t_i = (i × interval) + attack_point

hanya serangan dengan t_i <= 10 detik yang dihitung
```

Basic attack hanya dimasukkan ke physical kalau profil hero menempatkan
PHYSICAL sebagai main atau secondary damage.

Bonus attack speed dari ability ikut dihitung untuk ability yang tidak
kondisional. Contohnya Inner Beast, Bloodrage, Strafe, Overpower, Alacrity,
Overcharge, Battle Trance, Magnetic Field, dan Lil' Shredder. Ability
kondisional seperti Fiery Soul, Fervor, Berserker's Blood, dan Hunter in the
Night tidak dihitung dan tidak membuat status `PARTIAL`.

### Indikator dan bobot internal

| Karakteristik | Indikator | Bobot |
| --- | --- | ---: |
| Damage | Physical Damage | mengikuti profil hero |
| Damage | Magic Damage | mengikuti profil hero |
| Damage | Pure Damage | mengikuti profil hero |
| Durability | Maximum HP | 0,50 |
| Durability | Armor | 0,25 |
| Durability | Magic Resistance | 0,25 |
| Crowd Control | Disable Duration | 0,50 |
| Crowd Control | AoE / Coverage | 0,25 |
| Crowd Control | Cast Range | 0,25 |
| Mobility | Movement Speed | 0,40 |
| Mobility | Blink / Dash Distance | 0,60 |

Bobot internal dipakai untuk menghitung skor karakteristik 1 sampai 10.

### Profil damage per hero

Setiap hero punya `main` dan `secondary` damage. Bobotnya:

| Posisi | Bobot |
| --- | ---: |
| Main | 0,70 |
| Secondary | 0,30 |
| Tipe ketiga | 0 |

Kalau `secondary` bernilai `NONE`, main mendapat bobot 1,00. Basic attack hanya
dihitung kalau PHYSICAL adalah main atau secondary. Contoh:

- Techies: MAGICAL / NONE. Basic attack 0, magic 2.115.
- Sniper: PHYSICAL / MAGICAL. Basic attack dihitung.
- Anti-Mage: PHYSICAL / MAGICAL 70/30. Basic attack dan Mana Break masuk physical, Mana Void masuk magical.
- Leshrac: MAGICAL / PURE.

Profil diisi manual lewat halaman admin `/admin/damage-profiles`, disimpan di
tabel `HeroDamageProfile`. `npm run profiles:seed` mengisi saran awal dari
damage ability untuk hero yang belum punya profil. Saran itu wajib ditinjau,
karena hero right-click seperti Sniper bisa terbaca sebagai MAGICAL.

Ability yang diberikan Aghanim's Scepter atau Aghanim's Shard tidak masuk
kalkulasi karakteristik. Ada 69 ability seperti itu di data Valve, dan
sebelumnya 41 hero terpengaruh.

Klasifikasi CC karakteristik utama memakai `desc_loc`, bukan `notes_loc`, dan
hanya memakai field durasi yang namanya mengandung "duration" tanpa penanda
non-CC seperti pct, tooltip, linger, stack, cooldown, regen, atau resistance.
Ability yang efeknya ditulis dengan bahasa biasa memakai override manual:
Frostbite, Cold Snap, Savage Roar, Overgrowth, dan Soulbind.

Building damage tidak dipakai. Indikator itu sebelumnya mengambil 15% bobot
Damage, dimulai dari damage serangan dasar sehingga menggandakan physical, lalu
menambahkan 100% damage ability setiap kali deskripsi mengandung kata
"building". Heuristik itu salah untuk Jakiro Liquid Ice ("does not apply to
buildings"), Mars Spear (kata "building" hanya menyebut benda yang ditusuk),
Keeper of the Light Illuminate ("building power"), dan Techies Proximity Mines
(hanya 30% ke bangunan). Bobot Damage dinormalisasi ulang ke 0,40 / 0,40 / 0,20
agar skor tetap berskala 1 sampai 10.

### Durability

```text
HP_maks = baseHP + 22 × (STR - baseStr) + bonus_HP
Mana_maks = baseMana + 12 × (INT - baseInt)
HP_regen = baseHPRegen + 0,1 × (STR - baseStr) + bonus_HPRegen
Armor = baseArmor + (1/6) × (AGI - baseAgi) + bonus_armor
Base_MR = baseMR + 0,1 × INT
Magic_resistance = 100 × (1 - (1 - Base_MR/100) × (1 - bonus_MR/100))
```

INT menambah 0,1% base magic resistance per poin. Bonus magic resistance dari
talent dan ability dihitung sebagai sumber terpisah yang bersifat
multiplikatif.

Ability pasif atau innate yang memberi bonus durability permanen masuk
perhitungan: Dragon Blood, Counterspell, Corrosive Skin, Feral Impulse, dan
Grow. Ability aktif atau temporer belum dihitung. Contoh Dragon Blood pada
level 30 memberi +14 armor dan +14 HP regen, termasuk talent +12.

HP regen dihitung dan ditampilkan di detail durability, tetapi belum menjadi
indikator skor. Indikator durability tetap HP maksimum, armor, dan magic
resistance.

Medusa Mana Shield dihitung sebagai effective HP:

```text
EHP = maxHP + maxMana × damage_per_mana
    = maxHP + maxMana × 2
```

Persentase absorpsi 98% tidak mengubah total effective HP, hanya laju
kehilangan HP. Ability durability temporer dan shield/barrier lain dikeluarkan
dari skor, kecuali Medusa Mana Shield. Leviathan's Catch memakai asumsi 10
stack, Tiny Grow menambah +15 armor dan +30 movement speed, dan Berserker's
Blood menambah magic resistance maksimum 30%.

### Crowd control

Hanya hard CC yang masuk perhitungan SAW: stun, hex, fear, taunt, sleep,
banish, petrify, dan cyclone. Soft CC yang dicatat adalah slow gerak, root,
silence, mute, leash, dan entangle. Blind, attack slow, dan disarm tidak
dihitung sebagai CC. Ghost Walk, Rot, Degen Aura, dan Berserker's Rage
dikeluarkan dari daftar CC.

```text
disableDuration = Σ (durasi hard × M_dispel × M_pierce)
```

`M_dispel` diambil dari data Valve:

| `dispellable` | Kategori | Multiplier |
| --- | --- | ---: |
| 1 | strong dispellable | 0,8 |
| 2 | basic dispellable | 0,6 |
| 3 | undispellable | 1,0 |
| 0 atau kosong | tidak ada kategori | 0,6, dianggap basic |

`M_pierce` diambil dari `immunity`:

| `immunity` | Kategori | Multiplier |
| --- | --- | ---: |
| 3 | pierces Debuff Immunity | 1,0 |
| 4 | does not pierce | 0,6 |
| 0, 1, 2, atau kosong | tidak diketahui | 0,6, dianggap tidak pierce |

Hard CC yang ditambahkan lewat override manual antara lain Vacuum, Black Hole,
Fiend's Grip, Echo Stomp, Time Lock, Chronosphere, Song of the Siren, Astral
Imprisonment, Dismember, Bash of the Deep, Winter's Curse, Tornado, dan Charge
of Darkness. Visage memakai sub-ability Stone Form, bukan Summon Familiars.
Ability yang tidak lagi dihitung antara lain Hand of God, Falcon Rush, Slow
Burn, Howl, dan ability yang hanya memberi blind, attack slow, atau disarm.
Luna Eclipse, Dazzle Nothl Projection, dan Monkey King Tree Dance tetap
dihitung sesuai keputusan penelitian.

Bonus talent durasi CC ikut dihitung. Operasi aditif ditambahkan, operasi
persentase dikalikan. Contohnya Fiend's Grip mendapat tambahan 3 detik dan
Kunkka Torrent mendapat tambahan 25 persen.

Admin dapat menimpa tipe dispel dan status pierce per ability lewat halaman
`/admin/cc-abilities`. Nilai dari tabel `CcAbilityConfig` dipakai lebih dulu
oleh calculator, lalu fallback ke metadata manual dan data Valve. Setelah
diubah, jalankan hitung ulang karakteristik dan SAW dari halaman admin.

Durasi diambil dengan urutan:

1. Field durasi hard yang positif, misalnya `stun_duration`,
   `ministun_duration`, `stone_duration`, atau `hex_duration`.
2. Field durasi generik yang positif, misalnya `duration` atau
   `AbilityDuration`.
3. Field durasi lain yang positif, lalu ditandai `PARTIAL`.

Override manual durasi antara lain:

- Chaos Bolt: titik tengah `stun_min` dan `stun_max`.
- Magic Missile: `magic_missile_stun`.
- Mana Void: `mana_void_ministun`.
- Rain of Chaos: `stun_duration`, bukan `golem_duration`.
- Spark Wraith: `ministun_duration`, bukan umur wraith.
- Battery Assault: 1,5 detik dari 15 tick ministun.
- Fiend's Grip dan Dismember: `AbilityChannelTime` ditambah bonus talent.
- Echo Stomp: `sleep_duration` 4,4 detik.
- Winter's Curse: `duration` 2 detik.
- Morphling Adaptive Strike: `stun_max`, bukan `knockback_duration`.
- Grimstroke Ink Swell: `max_stun`, bukan `buff_duration`.
- Puck Dream Coil: `stun_duration` 0,5 detik.
- Visage: Stone Form dengan durasi tetap 1,2 detik.
- Daftar lengkap ada di `cc-main-config.ts`.
- Pulverize: 0,6 detik dari tiga ministun.

Summon, transformasi, dan self-buff dikeluarkan dari CC. Slow toggle seperti
Rot, Sand Storm, Degen Aura, dan Ghost Walk ditandai `PARTIAL` dengan
kontribusi 0.

Contoh:

```text
Medusa Stone Gaze  = 2,4 × 1,0 = 2,4
Magnus Reverse Polarity = 3,5 × 0,8 = 2,8
Clockwerk Battery Assault 1,5 + Hookshot 1,6 × 0,8 = 2,78
```

### Mobility / Escape

Mobility hanya menghitung ability yang ada di daftar putih manual dan
benar-benar memindahkan Hero. Cast range hanya dipakai untuk ability yang
ditandai sebagai blink atau leap. Ability di luar daftar tidak dihitung,
sekalipun deskripsinya menyebut charge, blink, atau distance.

Jarak dash dan blink digabung menjadi satu indikator:

```text
mobilityDistance = max(dashDistance, blinkDistance)
```

Bobot mobility adalah 40% movement speed dan 60% blink/dash distance.

Contoh yang dihitung: Blink Anti-Mage 1.100, Blink Queen of Pain 1.300,
Illusory Orb Puck 1.950, Fire Remnant Ember Spirit 1.400, Skewer Magnus 1.100.

Ball Lightning dihitung dari mana penuh level 30:

```text
initial = 25 + 7,5% × maxMana
travel  = 10 + 0,65% × maxMana per 100 unit
jarak   = (maxMana - initial) / travel × 100
```

Dengan maxMana 1.638,6, jaraknya sekitar 7.218 unit. Blast Off! Techies tidak
punya field jarak lompat, jadi mobility-nya `PARTIAL`.

### Indicator scoring

- Populasi: seluruh hero dengan nilai valid untuk indikator tersebut.
- Nilai 0 mendapat percentile 0 dan skor 1.
- Nilai positif diberi peringkat terhadap nilai positif lainnya.
- Ties memakai peringkat rata-rata.
- Batas skor: 0 sampai 10 = 1, >10 sampai 20 = 2, >20 sampai 30 = 3,
  >30 sampai 40 = 4, >40 sampai 50 = 5, >50 sampai 60 = 6,
  >60 sampai 70 = 7, >70 sampai 80 = 8, >80 sampai 90 = 9,
  >90 sampai 100 = 10.

### SAW

| Kriteria | Bobot default |
| --- | ---: |
| Damage | 0,25 |
| Durability | 0,25 |
| Crowd Control | 0,25 |
| Mobility | 0,25 |

Normalisasi benefit: `R = X / max(X)`. Bobot dinormalisasi ke total 1. Final
score adalah jumlah `w × R`, lalu ranking diurutkan menurun.

Halaman SAW memakai slider 0 sampai 100 untuk setiap kriteria. Menggeser satu
slider menyesuaikan slider lain agar total tetap 100. Tidak ada input angka
terpisah.

Filter hasil SAW:

- **Posisi**: memakai main position hero dari snapshot meta, yaitu posisi dengan
  pick rate tertinggi. Pilihan: semua posisi atau Pos 1 sampai Pos 5.
- **Complexity**: nilai Valve 1, 2, dan 3 dengan label Low, Medium, dan High.
- **Tipe serangan**: Melee atau Ranged, diambil dari data hero. Jumlahnya 62
  Melee dan 65 Ranged.
- Rank dihitung ulang pada hasil filter. Rank global tetap ditampilkan di bawah
  nama hero.

Contoh bobot default terakhir menghasilkan Magnus, Monkey King, dan Bane di
posisi teratas. Ranking berubah ketika bobot atau filter diubah.

### Custom handler yang sudah ada

- Mana Break: 65% dari mana burned per basic attack, dengan target mana menurun.
- Static Field: 3,45% HP saat ini, 4 proc berurutan.
- Pulse Nova: 8 pulse.
- Diabolic Edict: 32 explosion, pure damage.
- Slow Burn: 64% burn dari damage ability Lina.
- Blade Dance: crit 35% dengan multiplier talent.
- Impetus: 20% dari cast range 575 per serangan.
- Burning Spear: satu stack, 16 per detik selama 9 detik.
- Liquid Fire: satu aplikasi, 48 per tick selama 5 detik.
- Arctic Burn: 10% HP target untuk 5 serangan.
- Lil' Shredder: 5 attack, masing-masing 65 plus 35% attack damage.
- God's Rebuke: 3 kali attack damage plus 20.
- Gunslinger: 45% peluang tembakan kedua.
- Sleight of Fist: 160 plus satu attack damage.
- Searing Arrows: bonus 65 per hit.
- Jingu Mastery: bonus 180 untuk attack setelah 4 hit.
- Tree Grab: bonus 40 untuk maksimum 8 attack.
- Fury Swipes: total bonus 36 × N(N+1)/2.
- Geminate Attack: satu attack tambahan plus bonus damage.
- Meld: bonus 200 untuk satu attack per window.
- Glaives of Wisdom: 80% INT per hit.
- Incapacitating Bite: bonus 12 per hit.
- Insatiable Hunger: 70% average damage per hit.
- Feast: 3,25% HP target per hit.
- Alacrity: bonus 106 per hit selama 9 detik.
- Dark Ascension: bonus 150 per hit.
- Bodyguard: bonus 30 per hit.
- Pierce the Veil: 100% base attack damage selama 8 detik.
- Aphotic Shield: damage sebesar nilai shield.
- Shuriken Toss: memakai `bonus_damage`.
- Quill Spray: base + 7 × stack.
- Prickly: damage amp 19,5% ke semua damage.
- Flesh Golem: damage amp 35%.
- Jinada: bonus 175, tiga kali dalam window.
- Multishot: 3 wave × 140% attack damage.
- Tiny Grow: +180 damage, +15 armor, +30 movement speed.
- Windrun: 50% movement speed dengan uptime 60%.
- Scurry: 30% movement speed.
- Leviathan's Catch: 10 stack, +30 HP.
- Berserker's Blood: magic resistance maksimum 30%.
- Blast Off!: CC stun, bukan mobility.
- Time Lock: stun 0,5 detik saat basic attack.
- Burrowstrike: stun 1,8 detik.
- Paralyzing Cask: stun 0,8 detik.
- Raptor Dance: 5 strike × 2,5% HP target.
- Earth Splitter: 50% HP target, dibagi 50% magic dan 50% physical.
- Mind Flare: 40% max mana target.
- Vendetta: 550 bonus damage.
- Amphibian Rhapsody: 20 armor dari 5 stack.
- Wukong's Command: 25 armor.
- Eelskin: 12% evasion dari 3 illusion.
- Crippling Fear dan Void: memakai durasi malam.
- Sinister Gaze: memakai channel time.
- Shodo Sai: stun 0,8 detik.
- Shadow Walk: stun 1,6 detik dengan range melee 150.
- Reaper's Scythe: 50% missing HP × 1,2.
- Purification: 300 + 160 = 460 pure.
- Spiked Carapace: stun saat menerima hit.
- Immaterial: 75% evasion dikonversi ke effective HP.
- Phantom Rush: masuk mobility.
- Colossal dan Puckish: dikeluarkan dari durability.
- Escape Act: box temporer dan untargetable, detail saja.
- Requiem of Souls: fear 2 detik.
- Bash of the Deep: stun 1 detik setiap hit ke-4.
- Desolate: 25 + 1,5 × 29 + 12 = 80,5 pure per hit.
- Refraction: bonus 60 per hit.
- Invading Force: dikeluarkan dari durability.
- Greater Bash: passive bash tanpa AoE/cast range, tetap dihitung.
- Mana Void: 1.000 missing mana × 1,2 = 1.200 magical.
- Ball Lightning: 14 damage per 100 unit × jarak 7.218,6 = 1.010,6 magical.
- Electric Vortex: hard CC pull 2,0 + 0,2 talent = 2,2 detik.

Ability yang dikeluarkan dari damage antara lain Bloodrage, Bone Chill,
Corrosive Weaponry, Celestial Quiver, Tree Throw, Tag Team, Kazurai Katana,
Arcane Orb, Blink Strike, Psi Blades, E.M.P., dan Time Dilation.
Durability yang dikeluarkan antara lain Windrun, Scurry, Gravekeeper's Cloak,
Poison Attack, Fowl Play, Caustic Finale, Overcharge, Proximity Mines, Blood
Magic, Burning Spear, Life Break, Divine Favor, Quick Wit, Pixie Dust, Double
Trouble, Spirit Bear, True Form, Howl, Heartstopper Aura, dan Raptor Dance.

Ability lain memakai ekstraksi generik dari special value. Jika mekanismenya
tidak dapat dipastikan, statusnya `PARTIAL`.

### CC Lab (eksperimen)

CC Lab adalah kalkulasi CC terpisah. Modul ini tidak mengubah kalkulasi CC lama,
characteristic scoring, atau SAW.

Formula:

```text
CC_i = D_i × S_i × M_dispel × M_pierce
```

Aturan:

- Control type: STUN, HEX, BANISH, FEAR, TAUNT, SILENCE, ROOT, DISARM, SLOW,
  ATTACK_SLOW.
- Dispel: basic, strong, undispellable, atau unknown.
- Debuff Immunity: pierces, does not pierce, partial, atau unknown.
- Efek dengan control, dispel, dan pierce yang sama dan overlap memakai durasi
  union, bukan menjumlahkan durasi.
- Efek dengan control type berbeda dihitung terpisah.
- Conditional effect hanya dihitung jika kondisi didukung dan diasumsikan
  terpenuhi, lalu tetap berstatus `PARTIAL`.
- Dispel atau pierce yang `UNKNOWN` tidak memakai multiplier default. Kontribusi
  menjadi `null` dan status `PARTIAL` atau `UNSUPPORTED`.

Scope penelitian adalah tanpa item, jadi Aghanim's Scepter dan Aghanim's Shard
tidak dihitung. Registry berisi 32 efek, tetapi hanya 17 efek `BASE` untuk 10
hero validasi yang masuk kalkulasi. Lima belas efek `SCEPTER` dan `SHARD`
disimpan sebagai dokumentasi audit dan tidak pernah dibaca calculator.

Audit terpisah memindai 343 upgrade Scepter dan Shard: 29 ability baru, 50
tambahan CC, 49 perubahan CC, 56 kandidat review, dan 159 bukan CC. Semua 343
baris ditandai `EXCLUDED_BY_SCOPE`. Sebanyak 13 ability/upgrade sudah punya
entri dokumentasi, 171 kandidat belum terdaftar dan ditampilkan sebagai
coverage gap.

Hasil kalkulasi tanpa Aghanim:

| Hero | CC total | Efek yang dihitung |
| --- | ---: | --- |
| Lion | 4,32 | Impale, Hex, Mana Drain |
| Magnus | 3,385 | Reverse Polarity, Skewer slow |
| Crystal Maiden | 3,09 | Frostbite root, Frostbite disarm, Nova slow, Nova attack slow |
| Nature's Prophet | 2,20 | Sprout root |
| Death Prophet | 1,95 | Silence |
| Mars | 1,76 | Spear stun |
| Enigma | 1,62 | Malefice stun, 3 instance |
| Arc Warden | 1,38 | Flux slow, Spark Wraith slow |
| Earthshaker | 1,28 | Fissure stun |
| Templar Assassin | 0,90 | Psionic Trap slow |

Enigma Malefice memakai `stun_instances = 3` dari Valve. Tiga stun 0,9 detik
dihitung berurutan sehingga total kontrol 2,7 detik. Interval antar instance
tidak dimodelkan karena metrik menjumlahkan durasi kontrol.

Hero yang CC-nya hanya berasal dari Aghanim's keluar dari klasifikasi: Void
Spirit, Sniper, Queen of Pain, Centaur Warrunner, Tiny, dan Visage.

Sensitivity memakai preset A sampai D. Preset mengubah multiplier dispel dan
Debuff Immunity, lalu membandingkan raw CC, skor percentile, rank, perubahan
rank, dan top-10 overlap. Jumlah hero masih kecil, jadi hasil sensitivity belum
mewakili seluruh populasi.

Pemetaan awal dari data Valve:

| Field Valve | Pemetaan |
| --- | --- |
| `dispellable = 1` | STRONG_DISPELLABLE |
| `dispellable = 2` | BASIC_DISPELLABLE |
| `dispellable = 3` | UNDISPELLABLE |
| `dispellable = 0` | UNKNOWN, dianggap basic |
| `immunity = 3` | PIERCES |
| `immunity = 4` | DOES_NOT_PIERCE |
| `immunity = 0, 1, 2` | UNKNOWN atau NOT_APPLICABLE |

Konflik yang dicatat:

- Contoh spesifikasi menyebut Magnus Reverse Polarity undispellable dan
  menghasilkan 3,50. Data Valve menandai `dispellable = 1`, yang dipetakan ke
  strong dispellable, sehingga CC Lab menghitung 2,80. Registry dapat diubah
  jika klasifikasi ini tidak dipakai.
- Spesifikasi CC awal mencantumkan contoh Arc Warden Scepter silence dan
  Nature's Prophet Scepter root. Keputusan scope tanpa item mengeluarkan
  keduanya, sehingga Arc Warden hanya memakai Flux slow 6 detik dan Spark
  Wraith slow, dan Nature's Prophet hanya memakai Sprout root.

CC Lab dihitung on demand lewat API. Hasil verifikasi manual disimpan di tabel
`CcEffect` dan dibaca saat perhitungan. Registry di kode tetap menjadi fallback
jika belum ada baris database untuk ability tersebut. Semua respons membawa
`cc-lab-v2` sebagai versi konfigurasi.

Halaman CC Lab dan audit tidak lagi ditampilkan di frontend. Endpoint
`/api/cc-lab/*` tetap tersedia untuk kebutuhan penelitian dan verifikasi lewat
API.

Baris dengan `controlType` kosong dianggap belum diverifikasi dan tidak dipakai.
`durationField` mengacu pada nama special value Valve. Kolom bantu
`availableDurationFields` berisi daftar field yang tersedia untuk ability itu.
`durationFixed` dipakai untuk durasi tetap yang tidak punya field angka.

Baris `SCEPTER` dan `SHARD` tetap bisa diimpor sebagai dokumentasi, tetapi
`verified` selalu dipaksa `FALSE`, sehingga efek Aghanim tidak mungkin aktif
meski CSV diisi `verified = TRUE`.

Setelah impor, data disimpan di `CcEffect` dan tidak ditimpa oleh
`sync:constants`.

## Admin

Halaman admin tidak ditampilkan di sidebar. Login hanya bisa dibuka lewat URL
langsung `/admin/login`, dengan username `admin` dan password `admin123!`.
Setelah login, halaman `/admin/damage-profiles` menampilkan 127 hero beserta
nilai physical, magic, dan pure saat ini. Admin bisa mengubah main, secondary,
dan catatan, lalu menekan simpan per baris atau simpan semua. Halaman
`/admin/cc-abilities` juga hanya bisa dibuka lewat URL langsung.

Sesi memakai JWT di cookie `httpOnly` selama 8 jam. Password disimpan sebagai
hash scrypt. Percobaan login dibatasi 5 kali per 15 menit per IP. Perubahan
profil baru berlaku setelah tombol hitung ulang karakteristik dan SAW ditekan.

Endpoint admin dilindungi login. Endpoint mutasi lain seperti
`/api/characteristics/calculate`, `/api/saw/calculate`, sync, dan impor CSV CC
masih terbuka di prototipe ini.

## API

### Data dan meta

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/heroes` | Semua hero |
| GET | `/api/heroes/:heroId` | Detail hero, ability, talent |
| GET | `/api/heroes/:heroId/abilities` | Ability dan talent hero |
| GET | `/api/meta/heroes` | Statistik meta, filter `position` |
| GET | `/api/meta/heroes/:heroId` | Statistik satu hero |
| GET | `/api/meta/heroes/:heroId/positions` | Statistik per posisi |
| GET | `/api/data/status` | Ringkasan sinkronisasi dan validasi |
| GET | `/api/data/sources` | Daftar sumber dan status |
| GET | `/api/data/patch` | Target patch dan hasil validasi |

### Characteristic scoring

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/api/characteristics/calculate` | Jalankan kalkulasi karakteristik |
| GET | `/api/characteristics/heroes` | Skor karakteristik seluruh hero |
| GET | `/api/characteristics/heroes/:heroId` | Skor satu hero |
| GET | `/api/characteristics/heroes/:heroId/breakdown` | Rincian indikator |
| GET | `/api/damage-profiles` | Profil main dan secondary damage |

### SAW dan status kalkulasi

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/api/saw/calculate` | Hitung SAW dan simpan ranking |
| POST | `/api/saw/rankings` | Hitung ranking berdasarkan bobot |
| GET | `/api/saw/rankings` | Ranking SAW terakhir |
| GET | `/api/saw/heroes/:heroId` | Hasil SAW satu hero |
| GET | `/api/calculation/status` | Status kalkulasi terakhir |
| GET | `/api/calculation/versions` | Versi konfigurasi |

### CC Lab

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/cc-lab/config` | Config, preset, dan registry |
| GET | `/api/cc-lab/heroes` | Perhitungan CC eksperimen seluruh hero |
| GET | `/api/cc-lab/heroes/:heroId` | Breakdown efek CC satu hero |
| GET | `/api/cc-lab/abilities` | Registry efek CC |
| GET | `/api/cc-lab/audit` | Audit upgrade Scepter dan Shard, semua `EXCLUDED_BY_SCOPE` |
| GET | `/api/cc-lab/verification/export` | Unduh CSV verifikasi CC |
| POST | `/api/cc-lab/verification/import` | Impor CSV verifikasi CC |
| POST | `/api/cc-lab/calculate` | Hitung dengan skenario atau preset |
| POST | `/api/cc-lab/sensitivity` | Bandingkan preset A sampai D |

### Admin

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/api/admin/login` | Login dan set cookie sesi |
| POST | `/api/admin/logout` | Hapus cookie sesi |
| GET | `/api/admin/session` | Cek sesi aktif |
| GET | `/api/admin/damage-profiles` | Daftar profil dan nilai damage |
| PATCH | `/api/admin/damage-profiles/:heroId` | Ubah satu profil |
| POST | `/api/admin/damage-profiles/bulk` | Simpan banyak profil |

## Struktur

```text
dota2-recommendation/
  backend/
    prisma/schema.prisma
    src/
      data-sources/
      sync/
      heroes/
      meta/
      data-status/
      characteristics/
      scoring/
      saw/
      cc-lab/
      scripts/
    test/
  frontend/
    src/
      api/
      components/
      pages/
      utils/
```

Raw response Valve dan OpenDota disimpan di `backend/data/raw/` dan tidak
dimasukkan ke Git.

## Testing

- 152 unit test backend: normalisasi, patch notes, atribut, basic attack,
  Universal damage, Mana Break, durability, CC, mobility, percentile, main
  position, SAW, formula CC Lab, registry BASE, Enigma multi-instance, overlap,
  conditional, data unknown, durasi fixed, bobot profil damage, basic attack
  per profil, bonus attack speed ability, scope Aghanim, klasifikasi CC, field
  durasi CC, multiplier dispel dan pierce, daftar putih mobility, seluruh 8
  talent level 30, handler attack modifier, ability CC baru, Stone Form,
  talent durasi, dan hash password admin.
- Pemeriksaan browser terbaru: sidebar desktop, tautan CC ability, kolom pick
  rate, hero SAW membuka karakteristik, status tanpa label review, login
  `admin123!`, Stone Form tampil, Fiend's Grip strong dan pierce, Hand of God
  tidak tampil, Nasal Goo soft, Eclipse tetap, rank SAW setelah bobot
  durability dan mobility baru, magic resistance dari INT, armor Dragon Blood,
  mobility gabungan dash/blink, Ball Lightning berbasis mana, mobile 390px
  tanpa overflow, dan console bersih.
- Build backend dan frontend lulus.
- Tidak ada error console pada alur normal.

## Batasan

- Seluruh 1.397 indikator berstatus `SUPPORTED`. Tidak ada indikator
  `PARTIAL` pada run terakhir.
- Attack modifier selain Mana Break belum memiliki handler khusus.
- Beberapa DoT, proc chance, dan conditional effect masih memakai pendekatan
  generik atau belum dihitung.
- Seluruh 8 talent level 30 dipakai, yaitu dua opsi di setiap tier. Efek talent
  diterapkan secara generik, sehingga beberapa interaksi khusus ability belum
  dimodelkan.
- Target HP, mana, dan armor memakai asumsi tetap.
- Item, Aghanim's Scepter, Aghanim's Shard, dan buff hero lain tidak dihitung.
  Building damage juga tidak dihitung karena bukan penentu rekomendasi dan
  heuristik lamanya terbukti salah untuk beberapa hero.
- Mobility memakai daftar putih manual. Ability gerak yang belum terdaftar
  tidak dihitung. Ball Lightning memakai jarak berbasis mana penuh. Blast Off!
  Techies dihitung sebagai CC, bukan mobility.
- Profil main dan secondary damage ditentukan manual, jadi bersifat penilaian
  peneliti. Daftar lengkap dan catatan alasan perlu dilampirkan di skripsi.
- Hasil SAW tetap bergantung pada asumsi model. Pada run terakhir seluruh
  indikator berstatus `SUPPORTED`.
- CC Lab mencakup 10 hero validasi. Hero lain berstatus `UNSUPPORTED`.
- Audit menemukan 171 kandidat upgrade yang belum terdaftar. Kandidat tersebut
  ditampilkan di halaman audit dan bisa diverifikasi lewat CSV. Karena semua
  upgrade Aghanim berada di luar scope, baris itu tidak pernah menambah CC.
- CC Lab tidak menyimpan run ke database dan tidak memengaruhi SAW.
- Sensitivity CC Lab memakai populasi kecil, jadi perbandingan rank belum
  mewakili seluruh hero.
- CC Lab tidak menyediakan parameter Aghanim's Scepter atau Shard. Efek item
  tidak bisa diaktifkan dari API maupun UI, sesuai scope tanpa item.
