import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface CurlJsonRequest {
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutSeconds?: number;
}

export interface CurlJsonResponse {
  status: number;
  body: string;
}

function configValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export async function curlJson(
  request: CurlJsonRequest,
): Promise<CurlJsonResponse> {
  const directory = await mkdtemp(join(tmpdir(), "stratz-request-"));
  const bodyFile = join(directory, "body.json");

  try {
    if (request.body !== undefined) {
      await writeFile(bodyFile, request.body, "utf8");
    }

    const lines = [
      `url = "${configValue(request.url)}"`,
      'request = "POST"',
      'silent',
      'show-error',
      'location',
      `max-time = ${request.timeoutSeconds ?? 60}`,
      'write-out = "\\n%{http_code}"',
    ];

    for (const [name, value] of Object.entries(request.headers)) {
      lines.push(`header = "${configValue(`${name}: ${value}`)}"`);
    }

    if (request.body !== undefined) {
      lines.push(`data-binary = "@${configValue(bodyFile)}"`);
    }

    const result = await new Promise<{
      stdout: string;
      stderr: string;
      code: number;
    }>((resolve, reject) => {
      const child = spawn("curl", ["--config", "-"], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8");
      });
      child.on("error", reject);
      child.on("close", (code) => {
        resolve({ stdout, stderr, code: code ?? 1 });
      });

      child.stdin.write(`${lines.join("\n")}\n`);
      child.stdin.end();
    });

    if (result.code !== 0) {
      throw new Error(`curl gagal: ${result.stderr.trim()}`);
    }

    const marker = result.stdout.lastIndexOf("\n");
    const status = Number(result.stdout.slice(marker + 1).trim());
    const body = marker >= 0 ? result.stdout.slice(0, marker) : result.stdout;

    return { status, body };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
