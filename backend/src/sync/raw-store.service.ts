import { Injectable } from "@nestjs/common";
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

@Injectable()
export class RawStoreService {
  private readonly root = join(process.cwd(), "data", "raw");

  async createRunDir(source: string): Promise<string> {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = join(this.root, source, stamp);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  async save(dir: string, name: string, data: unknown): Promise<string> {
    const file = join(dir, `${name}.json`);
    await writeFile(file, JSON.stringify(data, null, 2), "utf8");
    return relative(process.cwd(), file);
  }

  async saveMany(
    dir: string,
    entries: Array<{ name: string; data: unknown }>,
  ): Promise<string[]> {
    const paths: string[] = [];
    for (const entry of entries) {
      paths.push(await this.save(dir, entry.name, entry.data));
    }
    return paths;
  }
}
