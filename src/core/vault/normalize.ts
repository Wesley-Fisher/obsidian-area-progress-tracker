export function normalizeVaultPath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function normalizeFolderPath(folderPath: string): string {
  const normalized = normalizeVaultPath(folderPath).replace(/\/+$/, "");
  return normalized;
}
