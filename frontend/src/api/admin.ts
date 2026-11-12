import { apiGet, apiPatch, apiPost } from "./client";
import type {
  AdminBulkResult,
  AdminCcAbilitiesResponse,
  AdminCcDispel,
  AdminCcPierce,
  AdminDamageProfilesResponse,
  AdminSession,
  DamageSecondary,
  DamageType,
} from "./types";

export function fetchAdminSession(): Promise<AdminSession> {
  return apiGet<AdminSession>("/admin/session");
}

export function loginAdmin(
  username: string,
  password: string,
): Promise<AdminSession> {
  return apiPost<AdminSession>("/admin/login", { username, password });
}

export function logoutAdmin(): Promise<{ ok: boolean }> {
  return apiPost<{ ok: boolean }>("/admin/logout", {});
}

export function fetchAdminProfiles(): Promise<AdminDamageProfilesResponse> {
  return apiGet<AdminDamageProfilesResponse>("/admin/damage-profiles");
}

export function saveAdminProfile(
  heroId: number,
  main: DamageType,
  secondary: DamageSecondary,
  notes: string,
) {
  return apiPatch(`/admin/damage-profiles/${heroId}`, {
    main,
    secondary,
    notes,
  });
}

export function saveAdminProfilesBulk(
  rows: Array<{
    heroId: number;
    main: DamageType;
    secondary: DamageSecondary;
    notes: string;
  }>,
): Promise<AdminBulkResult> {
  return apiPost<AdminBulkResult>("/admin/damage-profiles/bulk", { rows });
}

export function fetchAdminCcAbilities(): Promise<AdminCcAbilitiesResponse> {
  return apiGet<AdminCcAbilitiesResponse>("/admin/cc-abilities");
}

export function saveAdminCcAbility(
  abilityId: number,
  dispelType: AdminCcDispel,
  piercesImmunity: AdminCcPierce,
) {
  return apiPatch(`/admin/cc-abilities/${abilityId}`, {
    dispelType,
    piercesImmunity,
  });
}

export function saveAdminCcAbilitiesBulk(
  rows: Array<{
    abilityId: number;
    dispelType: AdminCcDispel;
    piercesImmunity: AdminCcPierce;
  }>,
): Promise<AdminBulkResult> {
  return apiPost<AdminBulkResult>("/admin/cc-abilities/bulk", { rows });
}
