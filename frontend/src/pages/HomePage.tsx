import { Link } from "react-router-dom";

const BUTTONS = [
  { to: "/saw", label: "Rekomendasi" },
  { to: "/meta", label: "Meta / Posisi" },
  { to: "/heroes", label: "Hero" },
  { to: "/guide", label: "Guide" },
];

export function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-4.0625rem)] flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="max-w-4xl text-3xl font-bold uppercase leading-tight tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.65)] sm:text-5xl lg:text-6xl">
        Sistem Rekomendasi Hero Dota 2
      </h1>

      <div className="mt-12 w-full max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          {BUTTONS.map((button) => (
            <Link
              key={button.to}
              className="button button-primary flex min-h-16 items-center justify-center px-6 py-4 text-sm font-semibold uppercase tracking-wide"
              to={button.to}
            >
              {button.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
