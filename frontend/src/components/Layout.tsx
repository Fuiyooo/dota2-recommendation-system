import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/heroes", label: "Heroes" },
  { to: "/meta", label: "Meta" },
  { to: "/characteristics", label: "Characteristics" },
  { to: "/saw", label: "Recommendation" },
];

function linkClass({ isActive }: { isActive: boolean }): string {
  return `block rounded px-3 py-2 text-sm ${
    isActive
      ? "bg-orange-50 font-medium text-accent"
      : "text-stone-700 hover:bg-stone-100 hover:text-ink"
  }`;
}

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
    <div className="min-h-screen lg:flex">
      <header className="flex items-center justify-between border-b border-stone-300 bg-white px-4 py-3 lg:hidden">
        <NavLink to="/" className="text-base font-semibold">
          Dota 2 Data Lab
        </NavLink>
        <button
          type="button"
          className="button small"
          aria-expanded={menuOpen}
          aria-controls="sidebar-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-stone-900/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="sidebar-nav"
        className={`${
          menuOpen ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-stone-300 bg-white px-3 py-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0`}
      >
        <div className="hidden lg:block">
          <NavLink to="/" className="block px-3 text-lg font-semibold">
            Dota 2 Data Lab
          </NavLink>
        </div>
        <div className="mb-4 flex items-center justify-between px-3 lg:hidden">
          <span className="text-sm font-semibold">Navigation</span>
          <button
            type="button"
            className="button small"
            onClick={() => setMenuOpen(false)}
          >
            Close
          </button>
        </div>

        <nav aria-label="Main navigation" className="mt-2">
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
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
