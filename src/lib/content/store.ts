import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Binary, Collection, MongoClient } from "mongodb";
import { defaultContent } from "./defaults";
import type { Message, Project, SiteContent } from "./types";

/**
 * Storage adapter.
 * - MONGODB_URI set  -> MongoDB (works on serverless hosts such as Vercel)
 * - otherwise        -> local files in ./data (great for a VPS / Docker / local dev)
 */

export type StoredFile = { data: Buffer; fileName: string; contentType: string };

interface Store {
  listMessages(): Promise<Message[]>;
  addMessage(m: Message): Promise<void>;
  updateMessage(id: string, patch: Partial<Message>): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  readContent(): Promise<Partial<SiteContent> | null>;
  writeContent(content: SiteContent): Promise<void>;
  readFile(key: string): Promise<StoredFile | null>;
  writeFile(key: string, file: StoredFile): Promise<void>;
  deleteFile(key: string): Promise<void>;
}

/* ---------------------------------- file ---------------------------------- */

// On Vercel the project folder is read-only; without MongoDB fall back to /tmp (temporary!).
const ON_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = process.env.DATA_DIR || (ON_VERCEL ? "/tmp/portfolio-data" : path.join(process.cwd(), "data"));
const safeKey = (key: string) => key.replace(/[^a-z0-9_-]/gi, "_");

const MESSAGES_FILE = () => path.join(DATA_DIR, "messages.json");
async function readMessagesFile(): Promise<Message[]> {
  try {
    return JSON.parse(await fs.readFile(MESSAGES_FILE(), "utf8"));
  } catch {
    return [];
  }
}
async function writeMessagesFile(list: Message[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${MESSAGES_FILE()}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2));
  await fs.rename(tmp, MESSAGES_FILE());
}

const fileStore: Store = {
  async listMessages() {
    return (await readMessagesFile()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async addMessage(m) {
    const list = await readMessagesFile();
    list.push(m);
    await writeMessagesFile(list.slice(-2000));
  },
  async updateMessage(id, patch) {
    const list = await readMessagesFile();
    await writeMessagesFile(list.map((m) => (m.id === id ? { ...m, ...patch, id } : m)));
  },
  async deleteMessage(id) {
    await writeMessagesFile((await readMessagesFile()).filter((m) => m.id !== id));
  },
  async readContent() {
    try {
      return JSON.parse(await fs.readFile(path.join(DATA_DIR, "content.json"), "utf8"));
    } catch {
      return null;
    }
  },
  async writeContent(content) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const target = path.join(DATA_DIR, "content.json");
    const tmp = `${target}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(content, null, 2));
    await fs.rename(tmp, target); // atomic swap
  },
  async readFile(key) {
    const dir = path.join(DATA_DIR, "files");
    try {
      const meta = JSON.parse(await fs.readFile(path.join(dir, `${safeKey(key)}.json`), "utf8"));
      const data = await fs.readFile(path.join(dir, `${safeKey(key)}.bin`));
      return { data, fileName: meta.fileName, contentType: meta.contentType };
    } catch {
      return null;
    }
  },
  async writeFile(key, file) {
    const dir = path.join(DATA_DIR, "files");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${safeKey(key)}.bin`), file.data);
    await fs.writeFile(
      path.join(dir, `${safeKey(key)}.json`),
      JSON.stringify({ fileName: file.fileName, contentType: file.contentType }),
    );
  },
  async deleteFile(key) {
    const dir = path.join(DATA_DIR, "files");
    await Promise.allSettled([
      fs.unlink(path.join(dir, `${safeKey(key)}.bin`)),
      fs.unlink(path.join(dir, `${safeKey(key)}.json`)),
    ]);
  },
};

/* --------------------------------- mongodb -------------------------------- */

type Doc = {
  _id: string;
  content?: SiteContent;
  data?: Binary;
  fileName?: string;
  contentType?: string;
  updatedAt?: Date;
};

const globalForMongo = globalThis as unknown as { __portfolioMongo?: Promise<MongoClient> };

async function collection(): Promise<Collection<Doc>> {
  if (!globalForMongo.__portfolioMongo) {
    const { MongoClient } = await import("mongodb");
    globalForMongo.__portfolioMongo = new MongoClient(process.env.MONGODB_URI!, {
      appName: "portfolio",
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    })
      .connect()
      .catch((err) => {
        globalForMongo.__portfolioMongo = undefined; // allow a retry on the next request
        throw err;
      });
  }
  const client = await globalForMongo.__portfolioMongo;
  return client.db(process.env.MONGODB_DB || "portfolio").collection<Doc>("site");
}

async function messagesCollection(): Promise<Collection<Message & { _id?: unknown }>> {
  await collection();
  const client = await globalForMongo.__portfolioMongo!;
  return client.db(process.env.MONGODB_DB || "portfolio").collection<Message & { _id?: unknown }>("messages");
}

const mongoStore: Store = {
  async listMessages() {
    const docs = await (await messagesCollection()).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(500).toArray();
    return docs as Message[];
  },
  async addMessage(m) {
    await (await messagesCollection()).insertOne({ ...m });
  },
  async updateMessage(id, patch) {
    const { id: _ignored, ...rest } = patch;
    void _ignored;
    await (await messagesCollection()).updateOne({ id }, { $set: rest });
  },
  async deleteMessage(id) {
    await (await messagesCollection()).deleteOne({ id });
  },
  async readContent() {
    const doc = await (await collection()).findOne({ _id: "content" });
    return doc?.content ?? null;
  },
  async writeContent(content) {
    await (await collection()).updateOne(
      { _id: "content" },
      { $set: { content, updatedAt: new Date() } },
      { upsert: true },
    );
  },
  async readFile(key) {
    const doc = await (await collection()).findOne({ _id: `file:${key}` });
    if (!doc?.data) return null;
    return {
      data: Buffer.from(doc.data.buffer),
      fileName: doc.fileName ?? key,
      contentType: doc.contentType ?? "application/octet-stream",
    };
  },
  async writeFile(key, file) {
    const { Binary } = await import("mongodb");
    await (await collection()).updateOne(
      { _id: `file:${key}` },
      {
        $set: {
          data: new Binary(file.data),
          fileName: file.fileName,
          contentType: file.contentType,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  },
  async deleteFile(key) {
    await (await collection()).deleteOne({ _id: `file:${key}` });
  },
};

export const store: Store = process.env.MONGODB_URI ? mongoStore : fileStore;
export const storageKind = process.env.MONGODB_URI ? "mongodb" : ON_VERCEL ? "temporary" : "file";

/* --------------------------------- helpers -------------------------------- */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

const BLANK_PROJECT: Project = {
  slug: "",
  name: "",
  tagline: "",
  description: "",
  category: "",
  year: "",
  role: "",
  duration: "",
  client: "",
  stack: [],
  url: "",
  repo: "",
  image: "",
  preview: "",
  accent: "#d4ff3f",
  featured: false,
  overview: "",
  challenge: "",
  solution: "",
  features: [],
  results: [],
  gallery: [],
};

/** Fill new fields on older saved projects and guarantee unique slugs. */
function normalize(c: SiteContent): SiteContent {
  const seen = new Set<string>();
  c.projects = (c.projects ?? []).map((p) => {
    const full = { ...BLANK_PROJECT, ...p };
    let slug = slugify(full.slug || full.name);
    while (seen.has(slug)) slug = `${slug}-2`;
    seen.add(slug);
    return { ...full, slug };
  });
  c.profile.socials = c.profile.socials ?? [];
  return c;
}

/** Saved values win; any key missing from the saved doc falls back to the default. */
export function mergeWithDefaults(saved: Partial<SiteContent> | null): SiteContent {
  if (!saved) return normalize(structuredClone(defaultContent));
  const out = structuredClone(defaultContent) as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(saved)) {
    if (!(key in out) || value === undefined || value === null) continue;
    const base = out[key];
    out[key] = isPlainObject(base) && isPlainObject(value) ? { ...base, ...value } : value;
  }
  return normalize(out as unknown as SiteContent);
}

export async function loadDefaultResume(): Promise<StoredFile> {
  return {
    data: await fs.readFile(path.join(process.cwd(), "assets", "resume.pdf")),
    fileName: defaultContent.resume.fileName,
    contentType: "application/pdf",
  };
}
