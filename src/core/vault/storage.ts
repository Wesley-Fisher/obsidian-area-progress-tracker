export interface VaultLike {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  createFolder(path: string): Promise<void>;
}

import { normalizeFolderPath } from "./normalize";

export async function ensureFolder(vault: VaultLike, folderPath: string): Promise<void> {
  const normalized = normalizeFolderPath(folderPath);
  if (!normalized) return;
  if (await vault.exists(normalized)) return;
  await vault.createFolder(normalized);
}

export async function readJsonFile<T>(vault: VaultLike, path: string): Promise<T> {
  const raw = await vault.read(path);
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(vault: VaultLike, path: string, data: unknown): Promise<void> {
  await vault.write(path, JSON.stringify(data, null, 2));
}
