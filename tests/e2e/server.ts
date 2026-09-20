import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

export interface RunningServer {
  url: string;
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

export function tempDb(): { path: string; cleanup(): void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "catalog-e2e-"));
  return { path: path.join(dir, "catalog.db"), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

export async function startServer(databasePath: string): Promise<RunningServer> {
  const port = await freePort();
  const child: ChildProcess = spawn("node", ["dist/Server.js"], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATABASE_PATH: databasePath, LOG_LEVEL: "silent" },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}/api/v1`;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${url}/products`);
      break;
    } catch {
      if (child.exitCode !== null) throw new Error("servidor encerrou durante o boot");
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return {
    url,
    stop: () =>
      new Promise((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once("exit", () => resolve());
        child.kill("SIGTERM");
      }),
  };
}

export const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
