import { Link } from "react-router-dom";

const CARDS = [
  {
    to: "/heroes",
    title: "Hero data",
    description: "127 heroes on patch 7.41f with attributes, abilities, and talents.",
  },
  {
    to: "/characteristics",
    title: "Characteristics",
    description: "Damage, durability, crowd control, and mobility scores.",
  },
  {
    to: "/saw",
    title: "Recommendation",
    description: "Ranked heroes with adjustable criteria weights.",
  },
];

export function HomePage() {
  return (
    <div>
      <section className="panel p-5 sm:p-7">
        <h1 className="max-w-3xl text-2xl font-semibold sm:text-3xl">
          Pick a Dota 2 hero with traceable reasoning.
        </h1>
        <p className="muted mt-3 max-w-2xl text-sm">
          Hero characteristics calculated from Valve data and ranked with Simple
          Additive Weighting.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="button button-primary" to="/heroes">
            Browse heroes
          </Link>
          <Link className="button" to="/saw">
            View recommendation
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {CARDS.map((card) => (
          <article key={card.to} className="panel flex flex-col p-4">
            <h2 className="text-base font-semibold">{card.title}</h2>
            <p className="muted mt-2 flex-1 text-sm">{card.description}</p>
            <Link
              className="mt-4 text-sm text-link underline underline-offset-2"
              to={card.to}
            >
              Open
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
