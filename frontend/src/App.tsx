import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminCcAbilitiesPage } from "./pages/AdminCcAbilitiesPage";
import { AdminDamageProfilesPage } from "./pages/AdminDamageProfilesPage";
import { AboutPage } from "./pages/AboutPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { CharacteristicDetailPage } from "./pages/CharacteristicDetailPage";
import { CharacteristicsPage } from "./pages/CharacteristicsPage";
import { GuidePage } from "./pages/GuidePage";
import { HeroDetailPage } from "./pages/HeroDetailPage";
import { HeroListPage } from "./pages/HeroListPage";
import { HomePage } from "./pages/HomePage";
import { MetaPage } from "./pages/MetaPage";
import { SawPage } from "./pages/SawPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="heroes" element={<HeroListPage />} />
        <Route path="heroes/:heroId" element={<HeroDetailPage />} />
        <Route path="meta" element={<MetaPage />} />
        <Route path="characteristics" element={<CharacteristicsPage />} />
        <Route
          path="characteristics/:heroId"
          element={<CharacteristicDetailPage />}
        />
        <Route path="saw" element={<SawPage />} />
        <Route path="guide" element={<GuidePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="admin/login" element={<AdminLoginPage />} />
        <Route
          path="admin/damage-profiles"
          element={<AdminDamageProfilesPage />}
        />
        <Route path="admin/cc-abilities" element={<AdminCcAbilitiesPage />} />
        <Route
          path="*"
          element={
            <div className="panel p-4">
              <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
              <p className="muted mt-1 text-sm">
                Alamat ini tidak ada di aplikasi. Kembali ke beranda lewat
                navigasi.
              </p>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
