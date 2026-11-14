import { Link } from "react-router-dom";

const CRITERIA = ["Damage", "Durability", "Crowd Control", "Mobility / Escape"];

export function AboutPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold sm:text-3xl">Tentang Aplikasi</h1>
      <p className="muted mt-3 max-w-4xl text-base leading-relaxed sm:text-lg">
        Sistem rekomendasi hero Dota 2 yang menghitung urutan hero berdasarkan
        bobot kriteria yang dipilih pengguna. Penilaian hanya memakai potensi
        hero pada level 30, tanpa item.
      </p>

      <div className="mt-5 space-y-4">
        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold sm:text-xl">Cara kerja</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-base leading-relaxed sm:text-lg">
            <li>Data hero diambil dari Valve Datafeed dan OpenDota.</li>
            <li>Setiap hero diberi skor untuk empat kriteria karakteristik.</li>
            <li>
              Pengguna mengatur bobot setiap kriteria di halaman Rekomendasi.
            </li>
            <li>
              Simple Additive Weighting menghitung final score dan urutan hero
              sesuai bobot tersebut.
            </li>
          </ol>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold sm:text-xl">
            Batasan Rekomendasi
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed sm:text-lg">
            <li>Hero level 30 dengan seluruh 8 talent.</li>
            <li>
              Tanpa item, Aghanim&apos;s Scepter, Aghanim&apos;s Shard, dan buff
              eksternal.
            </li>
            <li>
              Penilaian berupa potensi hero, bukan performa aktual di
              pertandingan.
            </li>
            <li>
              Meta dan pick rate bukan kriteria utama, hanya konteks tambahan.
            </li>
          </ul>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold sm:text-xl">
            Kriteria penilaian
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {CRITERIA.map((criterion) => (
              <p key={criterion} className="text-base sm:text-lg">
                {criterion}
              </p>
            ))}
          </div>
        </section>

        <section className="panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold sm:text-xl">
            Cara membaca hasil
          </h2>
          <ul className="mt-4 space-y-2 text-base leading-relaxed sm:text-lg">
            <li>
              Bobot tidak harus berjumlah 100 karena server menormalisasi
              totalnya.
            </li>
            <li>Urutan hero mengikuti final score dari perhitungan SAW.</li>
            <li>
              Semakin tinggi bobot suatu kriteria, semakin besar pengaruhnya
              pada urutan.
            </li>
          </ul>
        </section>
      </div>

      <section className="panel mt-4 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <p className="muted text-base sm:text-lg">
          Lihat hasil perhitungan atau penjelasan setiap halaman.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="button button-primary" to="/saw">
            Rekomendasi
          </Link>
          <Link className="button" to="/guide">
            Guide
          </Link>
        </div>
      </section>
    </div>
  );
}
