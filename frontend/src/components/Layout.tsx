import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import dotaBg1280 from "../assets/dota-bg-1280.webp";
import dotaBg1920 from "../assets/dota-bg-1920.webp";
import dotaLogo from "../assets/dota-logo.webp";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Beranda", end: true },
  { to: "/guide", label: "Guide" },
  { to: "/heroes", label: "Hero" },
  { to: "/meta", label: "Meta" },
  { to: "/characteristics", label: "Karakteristik" },
  { to: "/saw", label: "Rekomendasi" },
];

function linkClass({ isActive }: { isActive: boolean }): string {
  return `block rounded-sm px-3 py-2 text-sm ${
    isActive
      ? "bg-accent-soft font-medium text-link"
      : "text-ink-soft hover:bg-surface-muted hover:text-ink"
  }`;
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="relative min-h-screen">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <img
          src={dotaBg1920}
          srcSet={`${dotaBg1280} 1280w, ${dotaBg1920} 1920w`}
          sizes="100vw"
          alt=""
          className="h-full w-full object-cover object-[55%_50%]"
        />
        <div
          className={`absolute inset-0 ${
            isHome ? "bg-stone-950/55" : "bg-stone-950/85"
          }`}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <NavLink to="/" aria-label="Dota 2 Data Lab" className="flex items-center">
            <img src={dotaLogo} alt="Dota 2 Data Lab" className="h-9 w-auto" />
          </NavLink>

          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={linkClass}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            className="button ml-auto lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="navbar-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? "Tutup" : "Menu"}
          </button>
        </div>

        {menuOpen ? (
          <div
            id="navbar-menu"
            className="absolute inset-x-0 top-full z-50 border-b border-line bg-surface px-4 pb-4 pt-2 shadow-lg lg:hidden"
          >
            <nav aria-label="Navigasi utama mobile">
              <ul className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={linkClass}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        ) : null}
      </header>

      <main
        className={
          isHome
            ? "relative z-10"
            : "relative z-10 mx-auto w-full max-w-7xl px-4 py-6"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
