export class MemoryVault {
  private files = new Map<string, string>();

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async read(path: string): Promise<string> {
    const v = this.files.get(path);
    if (v === undefined) throw new Error(`missing: ${path}`);
    return v;
  }

  async write(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async createFolder(_path: string): Promise<void> {}
}