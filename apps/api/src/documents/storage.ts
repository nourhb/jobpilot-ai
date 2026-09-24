import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";

/**
 * Section 51/52: never store CV files in PostgreSQL blobs, never trust
 * the original filename. Every implementation renames to `UUID.ext` and
 * returns an opaque `storageKey` -- callers must never construct file
 * paths themselves.
 *
 * `StorageAdapter` is intentionally provider-agnostic (mirrors the
 * `STORAGE_PROVIDER` env var) so an S3-backed implementation can be
 * added later (Phase 10+) without touching callers.
 */
export interface StorageAdapter {
  save(buffer: Buffer, extension: string): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}

/**
 * Local-disk storage adapter. Chosen for Phase 2 over an S3-compatible
 * (MinIO) backend to avoid adding another Docker Compose service before
 * it's needed -- the `StorageAdapter` interface means swapping to a real
 * object-storage backend later is a one-file change (see
 * docs/architecture.md, "Storage").
 */
export class LocalDiskStorageAdapter implements StorageAdapter {
  constructor(private readonly baseDir: string = env.STORAGE_DIR) {}

  private resolvePath(storageKey: string): string {
    // storageKey is always a UUID + extension we generated ourselves in
    // `save`, but resolve+verify anyway so a malformed key can never
    // escape the storage directory (defense in depth).
    const resolved = path.resolve(this.baseDir, storageKey);
    const base = path.resolve(this.baseDir);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new Error(`Refusing to access path outside storage directory: ${storageKey}`);
    }
    return resolved;
  }

  async save(buffer: Buffer, extension: string): Promise<string> {
    await mkdir(this.baseDir, { recursive: true });
    const storageKey = `${randomUUID()}${extension}`;
    await writeFile(this.resolvePath(storageKey), buffer);
    return storageKey;
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolvePath(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.resolvePath(storageKey), { force: true });
  }
}

let singleton: StorageAdapter | undefined;

/** Single place that decides which StorageAdapter implementation is active. */
export function getStorageAdapter(): StorageAdapter {
  if (!singleton) {
    if (env.STORAGE_PROVIDER === "s3") {
      throw new Error(
        "STORAGE_PROVIDER=s3 is not implemented yet. Set STORAGE_PROVIDER=local, or implement an S3StorageAdapter.",
      );
    }
    singleton = new LocalDiskStorageAdapter();
  }
  return singleton;
}
