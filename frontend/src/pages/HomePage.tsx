import { Link } from "react-router-dom";

const CARDS = [
  {
    to: "/heroes",
    title: "Data hero",
    description:
      "127 hero pada patch 7.41f, lengkap dengan atribut, ability, talent, role, dan complexity.",
    cta: "Buka daftar hero",
  },
  {
    to: "/characteristics",
    title: "Karakteristik",
    description:
      "Damage, durability, crowd control, dan mobility/escape dihitung dari data hero level 30.",
    cta: "Lihat karakteristik",
  },
  {
    to: "/saw",
    title: "Ranking SAW",
    description:
      "Ranking hero dengan bobot kriteria yang bisa diatur dan skor yang dapat ditelusuri.",
    cta: "Lihat ranking",
  },
];

export function HomePage() {
  return (
    <div>
      <section className="panel p-5 sm:p-7">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Patch 7.41f
        </p>
        <h1 className="mt-2 max-w-3xl text-2xl font-semibold sm:text-3xl">
          Pilih hero Dota 2 dengan alasan yang bisa ditelusuri.
        </h1>
        <p className="muted mt-3 max-w-2xl text-sm">
          Dota 2 Data Lab menghitung karakteristik hero dari data Valve dan
          peringkat meta rank tinggi, lalu menyusun rekomendasi dengan Simple
          Additive Weighting.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="button button-primary" to="/heroes">
            Jelajahi hero
          </Link>
          <Link className="button" to="/saw">
            Lihat ranking SAW
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {CARDS.map((card) => (
          <article key={card.to} className="panel flex flex-col p-4">
            <h2 className="text-base font-semibold">{card.title}</h2>
            <p className="muted mt-2 flex-1 text-sm">{card.description}</p>
            <Link
              className="mt-4 text-sm text-accent underline underline-offset-2"
              to={card.to}
            >
              {card.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-base font-semibold">Alur kerja</h2>
        <ol className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <li>
            <span className="num text-accent">01</span>
            <p className="mt-1">Pilih hero dari daftar 127 hero.</p>
          </li>
          <li>
            <span className="num text-accent">02</span>
            <p className="mt-1">
              Baca rincian karakteristik dan asal nilai setiap indikator.
            </p>
          </li>
          <li>
            <span className="num text-accent">03</span>
            <p className="mt-1">
              Bandingkan ranking SAW sesuai bobot kriteria yang dipilih.
            </p>
          </li>
        </ol>
      </section>

      <section className="panel mt-4 p-4 text-sm">
        <p className="muted">
          Data utama dari Valve Datafeed. Meta dari STRATZ. Perhitungan tidak
          memakai item, Aghanim&apos;s Scepter, atau Aghanim&apos;s Shard.
        </p>
      </section>
    </div>
  );
}
