# Rumus Perhitungan Sistem Rekomendasi

Dokumen ini menjelaskan rumus yang dipakai untuk menghitung atribut, damage, durability, crowd control, mobility, skor indikator, skor karakteristik, dan SAW. Versi konfigurasi: `m2-v32` dan `cc-lab-v2`.

## 1. Simbol

| Simbol | Arti |
| --- | --- |
| `L` | Level hero, nilainya 30 |
| `STR`, `AGI`, `INT` | Strength, agility, intelligence pada level 30 |
| `baseStr`, `baseAgi`, `baseInt` | Nilai dasar atribut |
| `strGain`, `agiGain`, `intGain` | Pertumbuhan atribut per level |
| `D_min`, `D_max` | Damage serangan minimum dan maksimum |
| `BAT` | Base attack time |
| `AS` | Attack speed total |
| `APS` | Attack per second |
| `Δt` | Interval antar serangan |
| `t_ap` | Attack point |
| `N` | Jumlah serangan dalam window 10 detik |
| `W` | Weight atau bobot |
| `W_main`, `W_second` | Bobot main dan secondary damage |
| `S` | Score indikator, skala 1 sampai 10 |
| `P` | Percentile |
| `C` | Score karakteristik |
| `R` | Nilai normalisasi SAW |
| `V` | Final score SAW |
| `D_i` | Durasi efek CC ke-i |
| `S_i` | Control strength efek CC ke-i |
| `M_dispel` | Multiplier dispel |
| `M_pierce` | Multiplier Debuff Immunity |
| `T` | Target atau threshold |

## 2. Konstanta

| Konstanta | Nilai |
| --- | ---: |
| Hero level | 30 |
| Window basic attack | 10 detik |
| Target HP | 5.682 |
| Target mana | 5.000 |
| Target armor | 0 |
| Target magic resistance | 0 |

Target HP dan mana mengikuti Target Dummy demo mode Dota 2: 5.682 HP dan
5.000 mana. Dummy menampilkan 25% magic resistance, tetapi mitigasi belum
diterapkan karena tidak mengubah peringkat percentile.
| Attack speed cap | 700 |
| Movement speed cap | 550 |
| HP per strength | 22 |
| Mana per intelligence | 12 |
| Armor per agility | 1/6 |

## 3. Atribut level 30

```text
STR = baseStr + strGain × (L - 1)
AGI = baseAgi + agiGain × (L - 1)
INT = baseInt + intGain × (L - 1)
```

Damage atribut:

```text
hero normal:
bonus_atribut = growth_atribut_utama × (L - 1)

hero Universal:
bonus_atribut = 0,7 × (STR + AGI + INT)

D_min = D_min_dasar + bonus_atribut + bonus_talent_damage
D_max = D_max_dasar + bonus_atribut + bonus_talent_damage
```

Contoh Lina, hero INT:

```text
INT = 144
D_min = 190
D_max = 198
```

Contoh Techies, hero Universal:

```text
STR = 94,4
AGI = 68,2
INT = 103,3
bonus_atribut = 0,7 × 265,9 = 186,13
D_min = 20 + 186,13 + 253 = 459,13
D_max = 22 + 186,13 + 253 = 461,13
rata-rata = 460,13
```

Angka 253 pada contoh Techies berasal dari talent `+253 Damage`. Talent itu tetap dihitung, tetapi basic attack Techies nanti menjadi 0 karena profil damage-nya `MAGICAL / NONE`.

## 4. Basic attack

```text
AS = min(700, 100 + AGI + bonus_AS_talent + bonus_AS_ability)
APS = AS / (100 × BAT)
Δt = 1 / APS
```

Jumlah serangan dalam 10 detik:

```text
N = jumlah i dimana (i × Δt) + t_ap <= 10
```

Damage basic attack:

```text
D_basic = ((D_min + D_max) / 2) × N
```

Bonus attack speed dari ability hanya dipakai kalau efeknya tidak
kondisional. Contoh yang masuk: Inner Beast, Bloodrage, Strafe, Overpower,
Alacrity, Overcharge, Battle Trance, Magnetic Field, dan Lil' Shredder.
Ability kondisional seperti Fiery Soul, Fervor, Berserker's Blood, dan Hunter
in the Night tidak dihitung dan tidak membuat status `PARTIAL`.

Contoh Ursa dengan Overpower:

```text
AS = 100 + AGI + 400
jumlah serangan dalam 10 detik naik sesuai AS
```

Contoh Lina:

```text
AS = 190,6
BAT = 1,6
APS = 190,6 / 160 = 1,191
Δt = 0,84 detik
N = 12
D_basic = 194 × 12 = 2.328
```

Basic attack hanya dipakai jika `PHYSICAL` adalah main atau secondary pada profil damage. Jika tidak, `D_basic = 0`.

Contoh Techies dengan profil `MAGICAL / NONE`:

```text
D_basic = 0
```

## 5. Bobot profil damage

```text
W_main = 0,70
W_second = 0,30
W_third = 0
```

Jika secondary `NONE`:

```text
W_main = 1,00
```

Contoh:

| Profil | Physical | Magic | Pure |
| --- | ---: | ---: | ---: |
| Techies `MAGICAL / NONE` | 0 | 1,00 | 0 |
| Sniper `PHYSICAL / MAGICAL` | 0,70 | 0,30 | 0 |
| Anti-Mage `PHYSICAL / NONE` | 1,00 | 0 | 0 |
| Leshrac `MAGICAL / PURE` | 0 | 0,70 | 0,30 |

## 6. Damage ability

Pemilihan field damage:

```text
1. Ambil field yang namanya mengandung "damage" atau "dps".
2. Buang field yang mengandung pct, percent, duration, bonus, radius,
   cooldown, dan sejenisnya.
3. Jika ada field bernama tepat "damage", pakai itu.
4. Jika tidak ada, pakai field dengan nilai terbesar.
```

Perhitungan nilai:

```text
damage = nilai_field × jumlah_tick
```

Aturan jumlah tick:

```text
damage per second:
  tick = durasi

damage per tick, pulse, atau explosion:
  tick = tick_count, atau
  tick = floor(durasi / interval), minimal 1

damage per instance:
  tick = instances
```

Contoh Pulse Nova Leshrac:

```text
damage per pulse = 100
pulse = 8
total = 800
```

Custom handler:

```text
Mana Break:
  burn_i = min(mana_i, mana_per_hit + (mana_per_hit_pct / 100) × 5.000)
  damage_i = burn_i × (percent_damage_per_burn / 100)
  mana_(i+1) = max(0, mana_i - burn_i)
  total = Σ damage_i untuk N serangan

Static Field:
  damage_i = HP_i × (damage_health_pct / 100)
  HP_(i+1) = HP_i - damage_i
  total = Σ damage_i untuk 4 proc

Slow Burn:
  magic = magic + magic × (burn_pct / 100)
```

Attack modifier dan ability attack:

```text
Blade Dance:
  bonus = average_damage × N × crit_chance × (crit_mult - 1)

Impetus:
  damage = distance_damage_pct × 575 × N

Burning Spear:
  damage = burn_damage × duration, satu stack

Liquid Fire:
  damage = damage × floor(AbilityDuration / tick_rate), satu aplikasi

Arctic Burn:
  damage = percent_damage × 5.682 × 5

Lil' Shredder:
  damage = buffed_attacks × (damage + damage_pct × average_damage)

God's Rebuke:
  damage = average_damage × crit_mult + bonus_damage_vs_heroes

Gunslinger:
  damage = average_damage × N × double_shot_chance

Sleight of Fist:
  damage = bonus_hero_damage + average_damage, satu target
```

Contoh handler damage khusus:

```text
Mana Break:
  burn per hit = 40 + 4,5% × 5.000 = 265
  damage per hit = 265 × 65% = 172,25
  total 15 attack = 2.583,75 physical

Mana Void:
  missing mana = 5.000
  damage per missing mana = 1 + 0,2 talent = 1,2
  damage = 5.000 × 1,2 = 6.000 magical
```

Profil Anti-Mage memakai `PHYSICAL / MAGICAL 70/30`, sehingga Mana Void masuk
ke bobot magic.

Ball Lightning:

```text
damage = 14 per 100 unit × (7.218,6 / 100) = 1.010,6 magical
```

Electric Vortex dihitung sebagai hard CC pull:

```text
durasi = 2,0 + 0,2 talent = 2,2 detik
kontribusi = 2,2 × 0,8 × 0,6 = 1,056
```

Handler multi-unit, tick, dan buff pada `m2-v32`:

```text
Desolate        = bonus_damage + talent = 35,5 pure per hit
Haunt           = 5 illusion × 65% damage × serangan dalam 6 detik
Mirror Image    = 4 illusion × 50% damage × serangan dalam 10 detik
Juxtapose       = 5 illusion × 15% damage × serangan dalam 8 detik
Doppelganger    = 1 illusion × 20% damage × serangan dalam 8 detik
Phantasm        = 3 illusion × 100% damage × serangan dalam 10 detik
Meepo clone     = 4 clone × basic attack, tanpa penalti item
Poof            = 5 Meepo × poof_damage
Ransack         = health_steal_heroes × jumlah serangan
Malefice        = damage × 3 instance
Midnight Pulse  = tiap tick base_damage + 10% HP terkini, 20 tick
Black Hole      = damage per detik × 4 detik
Firestorm       = 6 wave × wave_damage
Pit of Malice   = 3 tick × pit_damage dalam window 10 detik
Spirits         = 5 spirit × 2 putaran × hero_damage
Spirit Bear     = serangan dengan BAT 1,5 dan agility bear, damage per hit = average Druid
Eclipse         = beams × beam_damage Lucent Beam
                  = 12 × 380 = 4.560 magical
Eye of Storm    = strike per interval dalam window
Storm Surge     = strike_damage × expected proc (chance × window / internal_cd)
Static Link     = rata-rata drain × jumlah serangan
Wolves          = 2 wolf × wolf_damage × serangan
Bone Guard      = 8 skeleton × skeleton_damage × serangan
Overpower       = bonus attack speed hanya untuk max_attacks
Duel            = hard CC 5 detik + 0,75 talent = 5,75
Overwhelming Odds = +125 attack speed selama 6 detik
Razorback       = 75 damage x 7 serangan, BAT 1,35
Raptors         = 2 raptor x 3 dive x 165
Skeleton        = 8 skeleton x 8 serangan x 49, BAT 1,2
Starbreaker     = 3 putaran x (attack + smash_damage)
Luminosity      = bonus_damage x floor((attack + 3 putaran) / 3)
Break of Dawn   = 8% bonus base damage, asumsi siang penuh
Essence Shift   = stack 4 agility per hit, dihitung iteratif dalam window
Chaos Bolt      = (damage_min + damage_max) / 2
Chaos Strike    = average × attacks × chance × (multiplier - 1)
God's Strength  = basic attack × (1 + bonus%)
Wrath of God    = 0,08 × STR × jumlah serangan
```

Asumsi multi-unit: Meepo memakai 4 clone tanpa penalti item, Spectre Haunt
memakai 5 illusion dengan 65% damage, Naga Siren memakai 4 image dengan 50%
damage, Phantom Lancer memakai 5 illusion Juxtapose 15% dan 1 illusion
Doppelganger 20%, Chaos Knight memakai 3 illusion dengan 100% damage. Spirit
Bear memakai average damage Druid tanpa True Form, BAT 1,5, dan attack point
Druid. Eidolon Enigma dan Great Cleave Sven tidak dihitung karena model
memakai satu target.

Talent dengan operasi persentase dihitung multiplicatively, bukan ditambahkan
secara datar. Contoh Rip Tide: 60 × 1,30 × 6 = 468.

Asumsi tambahan `m2-v32`: Mortal Strike memakai crit chance 20%, Duel reward
tidak dihitung, dan Storm Surge memakai expected proc. Skeleton memakai BAT
1,2 dan wolf memakai BAT dari file unit.

## 7. Durability

```text
HP_maks = baseHP + 22 × (STR - baseStr) + bonus_HP
Mana_maks = baseMana + 12 × (INT - baseInt)
HP_regen = baseHPRegen + 0,1 × (STR - baseStr) + bonus_HPRegen
Armor = baseArmor + (1/6) × (AGI - baseAgi) + bonus_armor
Base_MR = baseMR + 0,1 × INT
Magic_resistance = 100 × (1 - (1 - Base_MR/100) × (1 - bonus_MR/100))
Movement_speed = min(550, baseMS + bonus_MS)
```

Contoh Lina:

```text
HP_maks = 2.091,2
Armor = 15,1
Base_MR = 25 + 0,1 × 144 = 39,4
Magic resistance = 39,4
```

Contoh Dragon Knight dengan Dragon Blood dan talent +12:

```text
Armor = 12 + 2 + 12 = 26
HP_regen = 2,35 + 9,28 + 2 + 12 = 25,63
```

Ability pasif atau innate yang masuk perhitungan durability permanen adalah
Dragon Blood, Counterspell, Corrosive Skin, Feral Impulse, dan Grow. Ability
aktif, aura temporer, shield/barrier, dan efek kondisional dikeluarkan dari
skor. HP regen dicatat di detail, tetapi belum menjadi indikator skor.

Medusa Mana Shield dihitung sebagai effective HP:

```text
EHP = maxHP + maxMana × damage_per_mana
    = maxHP + maxMana × 2
```

Persentase absorpsi 98% tidak mengubah total effective HP. Ability shield lain
dan durability temporer tidak dihitung. Leviathan's Catch memakai asumsi 10
stack untuk +30 HP. Berserker's Blood menambah magic resistance maksimum 30%.
Amphibian Rhapsody memberi 20 armor dari 5 stack, dan Wukong's Command memberi
25 armor. Windrun, Scurry, dan Phantom Rush dihitung sebagai mobility, bukan
durability.

Evasion tidak menambah effective HP. Immaterial (75% termasuk talent) dan
Eelskin (12% dari 3 illusion) hanya mengurangi peluang terkena basic attack,
bukan damage dari spell atau magic, sehingga keduanya dicatat sebagai informasi
dan tidak masuk skor durability.

## 8. Crowd control

Hanya hard CC yang masuk perhitungan SAW:

```text
Disable_duration = Σ (durasi_hard × M_dispel × M_pierce)
```

Soft CC yang dicatat adalah slow gerak, root, silence, mute, leash, dan
entangle. Blind, attack slow, dan disarm tidak dihitung sebagai CC. Ghost Walk,
Rot, Degen Aura, dan Berserker's Rage dikeluarkan dari daftar CC. Blast Off!
dihitung sebagai CC, Burrowstrike memakai 1,8 detik, Paralyzing Cask memakai
0,8 detik, Shodo Sai memakai 0,8 detik, Shadow Walk memakai 1,6 detik dengan
range 150, Time Lock memicu stun 0,5 detik saat basic attack, Bash of the Deep
memakai 1 detik setiap hit ke-4, Requiem of Souls memakai 2 detik, Spiked
Carapace memicu stun saat menerima hit, Greater Bash tetap dihitung sebagai
passive bash, dan Night Stalker memakai durasi malam.

Multiplier dispel dari data Valve:

```text
dispellable = 1 -> strong dispellable, M_dispel = 0,8
dispellable = 2 -> basic dispellable, M_dispel = 0,6
dispellable = 3 -> undispellable, M_dispel = 1,0
dispellable = 0 atau kosong -> assumed basic, M_dispel = 0,6
```

Multiplier Debuff Immunity:

```text
immunity = 3 -> pierces, M_pierce = 1,0
immunity = 4 -> does not pierce, M_pierce = 0,6
immunity = 0, 1, 2, atau kosong -> assumed does not pierce, M_pierce = 0,6
```

Hard CC yang ditambahkan lewat override manual antara lain Vacuum, Black Hole,
Fiend's Grip, Echo Stomp, Time Lock, Chronosphere, Song of the Siren, Astral
Imprisonment, Dismember, Bash of the Deep, Winter's Curse, Tornado, dan Charge
of Darkness. Visage memakai Stone Form, bukan Summon Familiars.

Bonus talent durasi CC dihitung. Operasi aditif ditambahkan, operasi persentase
dikalikan. Contohnya Fiend's Grip +3 detik dan Kunkka Torrent +25 persen.

Admin dapat menimpa tipe dispel dan status pierce per ability. Nilai dari tabel
`CcAbilityConfig` dipakai lebih dulu, lalu fallback ke metadata manual dan data
Valve. Halaman pengaturannya ada di `/admin/cc-abilities`.

Urutan pemilihan durasi hard:

```text
1. Field durasi hard yang positif, misalnya stun_duration, ministun_duration,
   stone_duration, atau hex_duration.
2. Field durasi generik yang positif, misalnya duration atau AbilityDuration.
3. Field durasi lain yang positif, lalu ditandai PARTIAL.
```

Override manual:

```text
Chaos Bolt      = (stun_min + stun_max) / 2
Magic Missile   = magic_missile_stun
Mana Void       = mana_void_ministun
Rain of Chaos   = stun_duration, bukan golem_duration
Spark Wraith    = ministun_duration, bukan duration
Battery Assault = 15 tick × 0,1 detik = 1,5
Pulverize       = 3 × 0,2 detik = 0,6
```

Summon, transformasi, dan self-buff tidak dihitung. Slow toggle seperti Rot,
Sand Storm, Degen Aura, dan Ghost Walk masuk daftar review dengan kontribusi 0
dan status PARTIAL.

Contoh Medusa:

```text
Gorgon's Grasp = root, soft, tidak dihitung
Stone Gaze     = 2,4 hard, M_dispel 1,0, M_pierce 0,6

Disable = 2,4 × 0,6 = 1,44
```

Contoh Magnus:

```text
Reverse Polarity = 3,5 hard, M_dispel 0,8
Skewer dan Shockwave soft, tidak dihitung

Disable = 3,5 × 0,8 = 2,8
```

Contoh Clockwerk:

```text
Battery Assault = 1,5 hard, M_dispel 1,0, M_pierce 0,6
Hookshot        = 1,6 hard, M_dispel 0,8, M_pierce 1,0
Rocket Flare dikeluarkan

Disable = 0,90 + 1,28 = 2,18
```

Contoh Arc Warden:

```text
Flux dan Spark Wraith hanya soft
Tempest Double dikeluarkan

Disable = 0
```

Contoh Bladeform Juggernaut:

```text
Tidak ada keyword CC di desc_loc
Disable = 0
```

## 9. Mobility

```text
Movement_speed = min(550, baseMS + bonus_MS)
Dash = max(jarak ability dash)
Blink = max(jarak ability blink)
Mobility_distance = max(Dash, Blink)
```

Cast range hanya dipakai jika ability ditandai sebagai blink atau leap.

Jarak dash dan blink digabung menjadi satu indikator. Bobot mobility adalah
40% movement speed dan 60% blink/dash distance.

Contoh:

| Ability | Jenis | Jarak |
| --- | --- | ---: |
| Puck Illusory Orb | dash | 1.950 |
| Anti-Mage Blink | blink | 1.100 |
| Queen of Pain Blink | blink | 1.300 |
| Ember Spirit Fire Remnant | dash | 1.400 |

Ball Lightning dihitung dari mana penuh level 30:

```text
initial = 25 + 7,5% × maxMana
travel  = 10 + 0,65% × maxMana per 100 unit
jarak   = (maxMana - initial) / travel × 100 = 7.218,6
```

Contoh ability yang tidak dihitung: Shrapnel Sniper, Powershot Windranger, Psionic Trap Templar Assassin, Glimpse Disruptor.

## 10. Percentile indikator

```text
Jika nilai <= 0 atau populasi kosong:
  P = 0

Jika populasi = 1:
  P = 100

Selain itu:
  P = ((below + 0,5 × (equal - 1)) / (N - 1)) × 100
```

Keterangan:

- `below` = jumlah hero dengan nilai lebih kecil.
- `equal` = jumlah hero dengan nilai sama.
- `N` = jumlah hero dengan nilai valid.

Contoh, nilai `[10, 20, 30, 40, 50]`, raw 30:

```text
below = 2
equal = 1
N = 5
P = ((2 + 0) / 4) × 100 = 50
```

## 11. Skor indikator

```text
P <= 10        -> S = 1
10 < P <= 20   -> S = 2
20 < P <= 30   -> S = 3
30 < P <= 40   -> S = 4
40 < P <= 50   -> S = 5
50 < P <= 60   -> S = 6
60 < P <= 70   -> S = 7
70 < P <= 80   -> S = 8
80 < P <= 90   -> S = 9
P > 90         -> S = 10
```

Contoh:

```text
P = 50  -> S = 5
P = 75  -> S = 8
P = 90  -> S = 9
P = 95  -> S = 10
```

## 12. Skor karakteristik

```text
C = Σ (W_indikator × S_indikator)
```

Bobot indikator:

| Karakteristik | Indikator | Bobot |
| --- | --- | ---: |
| Damage | Physical | dari profil |
| Damage | Magic | dari profil |
| Damage | Pure | dari profil |
| Durability | HP, Armor, MR | 0,50 / 0,25 / 0,25 |
| Crowd Control | Disable, AoE, Cast range | 0,50 / 0,25 / 0,25 |
| Mobility | MS, Blink/Dash | 0,40 / 0,60 |

Contoh Techies `MAGICAL / NONE`, skor magic 10:

```text
C_damage = 1,00 × 10 = 10
```

Contoh Sniper `PHYSICAL / MAGICAL`, skor physical 10, magic 6:

```text
C_damage = 0,70 × 10 + 0,30 × 6 = 8,8
```

## 13. SAW

Nilai karakteristik tiap hero dinormalisasi terhadap nilai tertinggi pada karakteristik yang sama:

```text
R_ij = X_ij / max_j(X_ij)
```

Bobot SAW dinormalisasi ke total 1:

```text
w_i = W_i / Σ W
```

Final score:

```text
V_j = Σ (w_i × R_ij)
```

Ranking diurutkan dari `V` terbesar.

Contoh, bobot sama 25 persen:

```text
Damage      R = 1,0
Durability  R = 0,8
CC          R = 0,6
Mobility    R = 0,4

V = 0,25 × (1,0 + 0,8 + 0,6 + 0,4)
  = 0,25 × 2,8
  = 0,70
```

Contoh normalisasi bobot slider `60 / 20 / 20 / 0`:

```text
Total = 100
w = 0,60 / 0,20 / 0,20 / 0
```

## 14. CC Lab

Rumus kontribusi per efek:

```text
CC_i = D_i × S_i × M_dispel × M_pierce
```

Control strength:

| Control | S |
| --- | ---: |
| STUN, HEX | 1,00 |
| BANISH | 0,90 |
| FEAR, TAUNT | 0,85 |
| SILENCE | 0,65 |
| ROOT | 0,55 |
| DISARM | 0,50 |
| SLOW | 0,30 |
| ATTACK_SLOW | 0,20 |

Multiplier:

```text
Dispel:
  BASIC_DISPELLABLE = 0,6
  STRONG_DISPELLABLE = 0,8
  UNDISPELLABLE = 1,0

Debuff Immunity:
  PIERCES = 1,0
  DOES_NOT_PIERCE = 0,7
```

Efek dengan control, dispel, dan pierce yang sama memakai durasi union:

```text
Union = total durasi gabungan interval yang overlap
```

Contoh Magnus Reverse Polarity:

```text
CC = 3,5 × 1,0 × 0,8 × 1,0 = 2,8
```

Contoh Enigma Malefice, 3 instance:

```text
CC = 0,9 × 3 × 1,0 × 0,6 × 1,0 = 1,62
```

## 15. Talent

Pada level 30, tier 10, 15, 20, dan 25 terbuka dua kali. Hero memakai kedua opsi di setiap tier, total 8 talent.

Bonus talent:

```text
Bonus_talent_damage = Σ nilai_ref talent damage dengan abilityKey null
Bonus_talent_AS = Σ nilai_ref talent attack speed
Bonus_talent_HP = Σ nilai_ref talent health atau hp
Bonus_talent_armor = Σ nilai_ref talent armor
Bonus_talent_MR = Σ nilai_ref talent magic resistance
Bonus_talent_MS = Σ nilai_ref talent movement speed
Bonus_talent_HPRegen = Σ nilai_ref talent health regen atau hp regen
```

Talent yang terikat ability, misalnya `+110 Light Strike Array Damage` atau
`+12 Dragon Blood HP Regen/Armor`, ditambahkan ke special value ability
terkait, bukan ke basic attack.

Contoh Lina, seluruh 8 talent dipakai:

```text
+25 Damage
-3s Dragon Slave Cooldown
+110 Light Strike Array Damage
5% Fiery Soul Magic Resist Per Stack
+10/1% Fiery Soul Per Stack
-20s Laguna Blade Cooldown
+1s Slow Burn Duration
150% Attack Crit On Targets Affected By Slow Burn
```

## 16. Contoh lengkap satu hero

Techies, profil `MAGICAL / NONE`:

```text
Atribut Universal:
  bonus_atribut = 186,13
  rata-rata damage = 460,13

Basic attack:
  N = 10
  D_basic = 460,13 × 10 = 4.601,3
  karena PHYSICAL bukan main atau secondary, D_basic = 0

Magic ability:
  Sticky Bomb     = 480
  Reactive Tazer  = 210
  Blast Off!      = 675
  M.A.D.          = 50
  Proximity Mines = 700
  total magic     = 2.115

Bobot damage:
  physical = 0
  magic = 1,00
  pure = 0

Skor karakteristik Damage:
  C = 1,00 × S_magic
```

## 17. Catatan versi

- `m2-v32` menambahkan Starbreaker 3 putaran, Luminosity, dan Break of Dawn
  Dawnbreaker. Sebelumnya, `m2-v31` menambahkan Duel Legion Commander sebagai hard CC, attack speed
  Overwhelming Odds, summon Razorback dan Raptors Beastmaster, serta BAT
  skeleton dari file unit. Sebelumnya, `m2-v30` membatasi Overpower Ursa ke 6 serangan, menambahkan Eye of the Storm,
  Storm Surge, dan Static Link Razor, wolf Lycan, skeleton Wraith King, serta
  crit Lycan dan Wraith King. Sebelumnya, `m2-v29` menambahkan Eclipse Luna. Seluruh 12 beam dianggap mengenai target
  yang sama. Sebelumnya, `m2-v28` menambahkan Spirit Bear Lone Druid dan Essence Shift Slark.
  Sebelumnya, `m2-v27` memperbaiki talent persentase dan menambahkan illusion Naga Siren
  serta Phantom Lancer. Sebelumnya, `m2-v26` menambahkan handler damage multi-unit, tick, wave, DPS, crit, dan buff attack, termasuk Desolate, Haunt, Phantasm, clone Meepo, Malefice, Midnight Pulse, Black Hole, Firestorm, Pit of Malice, Spirits, Chaos Bolt, Chaos Strike, God's Strength, dan Wrath of God. Asumsi: Meepo 4 clone, Haunt 5 illusion 65%, Phantasm 3 illusion 100%. Versi ini juga memakai Target Dummy demo mode dengan 5.682 HP dan 5.000 mana, seluruh 8 talent level 30, bobot profil damage 70/30 atau 100 untuk satu tipe, skor indikator 1 sampai 10, bonus attack speed ability, daftar putih mobility, handler attack modifier, hard CC saja, multiplier dispel dan pierce di SAW, pengaturan CC dari admin, bonus talent durasi CC, pemisahan blind, attack slow, dan disarm dari daftar CC, bobot durability 50/25/25, mobility/escape dengan bobot 40/60 dan gabungan dash/blink, magic resistance dari INT, bonus armor dan HP regen dari ability pasif, handler damage baru, Medusa Mana Shield sebagai effective HP, Leviathan 10 stack, Tiny Grow, Windrun, Scurry, Berserker's Blood, Amphibian Rhapsody, Wukong's Command, serta handler Night Stalker, Lich, Kez, Nyx, Largo, dan Bounty Hunter.
- `cc-lab-v2` memakai efek `BASE` saja dan tidak menghitung Aghanim's Scepter atau Shard.
