import { Link } from "react-router-dom";
import cardCharacteristics from "../assets/card-characteristics.webp";
import cardGuide from "../assets/card-guide.webp";
import cardHeroes from "../assets/card-heroes.webp";
import cardMeta from "../assets/card-meta.webp";
import cardRecommendation from "../assets/card-recommendation.webp";
import dotaBg1920 from "../assets/dota-bg-1920.webp";
import guidePositions from "../assets/guide-positions.webp";

const PAGES = [
  {
    to: "/",
    name: "Beranda",
    image: dotaBg1920,
    description:
      "Landing page website. Menampilkan empat button utama menuju data hero, karakteristik, guide, dan rekomendasi.",
  },
  {
    to: "/guide",
    name: "Guide",
    image: cardGuide,
    description: "Halaman ini menjelaskan fungsi setiap halaman.",
  },
  {
    to: "/heroes",
    name: "Hero",
    image: cardHeroes,
    description:
      "Berisi daftar 127 hero beserta atribut, role, complexity, dan armor. Gunakan pencarian atau filter Atribut, Posisi, dan Tipe serangan, lalu klik hero untuk detail ability dan talent.",
  },
  {
    to: "/meta",
    name: "Meta",
    image: cardMeta,
    description:
      "Berisi daftar hero berdasarkan pick rate pada setiap posisi, win rate, dan jumlah match. Data ini hanya menjadi patokan hero yang sedang trending saat ini dan tidak secara langsung mempengaruhi rekomendasi.",
  },
  {
    to: "/characteristics",
    name: "Karakteristik",
    image: cardCharacteristics,
    description:
      "Berisi daftar hero dengan karakteristik dengan menampilkan skor 1 sampai 10 untuk Damage, Durability, Crowd Control, dan Mobility / Escape. Klik hero untuk melihat nilai mentah, percentile, dan skor indikator.",
  },
  {
    to: "/saw",
    name: "Rekomendasi",
    image: cardRecommendation,
    description:
      "Atur bobot empat kriteria, lalu tekan Hitung peringkat. Bobot tidak harus berjumlah 100 karena server menormalisasi totalnya. Filter posisi, complexity, dan tipe serangan tersedia di bawahnya.",
  },
];

const POSITIONS = [
  {
    label: "Pos 1",
    role: "Carry",
    description:
      "Pos 1 merupakan posisi Carry dengan prioritas farm. Umumnya bermain di safe lane.",
  },
  {
    label: "Pos 2",
    role: "Mid",
    description:
      "Pos 2 pada mid lane dengan tugas, kontrol rune, dan tempo permainan awal.",
  },
  {
    label: "Pos 3",
    role: "Offlane",
    description:
      "Pos 3 bermain di offlane dengan tugas mempersulit carry lawan melakukan farming, menjadi inisiator, dan tank untuk tim.",
  },
  {
    label: "Pos 4",
    role: "Soft Support",
    description:
      "Pos 4 bertugas membantu offlane dan melakukan rotasi dan kontrol map untuk membantu lane lain.",
  },
  {
    label: "Pos 5",
    role: "Hard Support",
    description: "Bertugas membantu carry melakukan farming dan warding, dan.",
  },
];

const TERMS = [
  {
    term: "Percentile",
    definition:
      "Posisi relatif nilai hero dibanding seluruh hero pada indikator yang sama.",
  },
  {
    term: "Skor indikator",
    definition: "Percentile yang dipetakan ke skala 1 sampai 10.",
  },
  {
    term: "Skor karakteristik",
    definition:
      "Gabungan bobot dari beberapa skor indikator dalam satu kriteria.",
  },
  {
    term: "Bobot",
    definition:
      "Tingkat kepentingan tiap kriteria. Totalnya dinormalisasi ke 1 saat dihitung.",
  },
  {
    term: "Pick rate dan win rate",
    definition:
      "Statistik meta. Dipakai sebagai konteks, bukan sebagai kriteria peringkat.",
  },
];

export function GuidePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Cara Penggunaan Aplikasi</h1>
      <p className="muted mt-1 text-sm">
        Penjelasan singkat fungsi setiap halaman.
      </p>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        {PAGES.map((page) => (
          <article
            key={page.to}
            className="panel flex flex-col overflow-hidden"
          >
            <img src={page.image} alt="" className="h-40 w-full object-cover" />
            <div className="flex flex-1 flex-col p-4">
              <h2 className="text-base font-semibold">{page.name}</h2>
              <p className="muted mt-2 flex-1 text-sm">{page.description}</p>
              <Link
                className="mt-3 text-sm text-link underline underline-offset-2"
                to={page.to}
              >
                Buka halaman
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-base font-semibold">Posisi</h2>
        <p className="muted mt-1 text-sm">
          Posisi pada halaman Meta dan Rekomendasi adalah posisi utama
          berdasarkan pick rate tertinggi.
        </p>
        <img
          src={guidePositions}
          alt="Peta Dota 2 dengan nomor posisi 1 sampai 5 di sisi Radiant dan Dire"
          className="mt-3 block w-full max-w-3xl border border-line mx-auto"
        />
        <p className="muted mt-2 text-xs">
          Hijau: Radiant. Merah: Dire. Angka 1 sampai 5 menunjukkan posisi.
        </p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {POSITIONS.map((position) => (
            <div key={position.label}>
              <dt className="text-sm font-medium">
                {position.label} · {position.role}
              </dt>
              <dd className="muted text-sm">{position.description}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-base font-semibold">Istilah</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {TERMS.map((item) => (
            <div key={item.term}>
              <dt className="text-sm font-medium">{item.term}</dt>
              <dd className="muted text-sm">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
