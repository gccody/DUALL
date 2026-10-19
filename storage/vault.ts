import type { Service } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { readLegacyConfig, removeLegacyConfig } from "./legacy";

/**
 * Persistence for services.
 *
 * - Each service (including its secret) is a JSON entry in SecureStore under
 *   `service_<uid>`.
 * - The AsyncStorage index holds no secrets: `order` is the display order and
 *   `written` lists every uid whose SecureStore entry may exist (a superset of
 *   `order`). SecureStore can't enumerate its keys, so `written` is what lets
 *   orphaned entries left by an interrupted save always be swept.
 *
 * Invariants: a uid is added to `written` before its secret is written; the
 * index never references a uid whose secret write failed; a secret is only
 * deleted after an index that no longer orders it has been persisted.
 *
 * All operations run one at a time on a single queue.
 */

export const VAULT_INDEX_KEY = "vault.index.v2";
export const SECRET_KEY_PREFIX = "service_";

export interface VaultIndex {
  version: 2;
  order: string[];
  written: string[];
}

export const secretKey = (uid: string) => `${SECRET_KEY_PREFIX}${uid}`;

const unique = (uids: Iterable<string>) => [...new Set(uids)];
const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/** Last known content of each SecureStore entry, used to skip unchanged writes. */
let persisted = new Map<string, string>();
/** Last index read or written; null until known. */
let cachedIndex: VaultIndex | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** Runs `task` after every previously queued operation has settled. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function parseIndex(raw: string | null): VaultIndex {
  if (raw === null) return { version: 2, order: [], written: [] };
  const value = JSON.parse(raw);
  if (!value || value.version !== 2 || !Array.isArray(value.order) || !Array.isArray(value.written)) {
    throw new Error("Unrecognized vault index");
  }
  const order = unique(value.order.filter((uid: unknown) => typeof uid === "string"));
  const written = unique([...order, ...value.written.filter((uid: unknown) => typeof uid === "string")]);
  return { version: 2, order, written };
}

/** Reads the index from storage. Throws when it exists but is unreadable. */
export async function readIndex(): Promise<VaultIndex> {
  return parseIndex(await AsyncStorage.getItem(VAULT_INDEX_KEY));
}

export async function writeIndex(order: readonly string[], written: readonly string[]): Promise<VaultIndex> {
  const index: VaultIndex = { version: 2, order: [...order], written: unique([...order, ...written]) };
  await AsyncStorage.setItem(VAULT_INDEX_KEY, JSON.stringify(index));
  cachedIndex = index;
  return index;
}

/** Deletes the given entries; returns the uids whose deletion failed. */
async function deleteSecrets(uids: readonly string[]): Promise<string[]> {
  const results = await Promise.allSettled(uids.map((uid) => SecureStore.deleteItemAsync(secretKey(uid))));
  const failed = uids.filter((_, i) => results[i].status === "rejected");
  for (const uid of uids) if (!failed.includes(uid)) persisted.delete(uid);
  if (failed.length > 0) console.error(`Failed to delete ${failed.length} stored service(s)`);
  return failed;
}

/**
 * Loads all services in display order. Entries whose secret is missing or
 * unreadable are dropped from the index, and orphaned entries are deleted.
 * Throws when storage can't be read (nothing is modified in that case).
 */
export function loadServices(): Promise<Service[]> {
  return enqueue(async () => {
    const index = await readIndex();
    cachedIndex = index;

    const raws = await Promise.all(index.order.map((uid) => SecureStore.getItemAsync(secretKey(uid))));
    const services: Service[] = [];
    const baseline = new Map<string, string>();
    const corrupt: string[] = [];
    index.order.forEach((uid, i) => {
      const raw = raws[i];
      if (raw === null) return;
      try {
        const stored = JSON.parse(raw) as Service;
        if (!stored || typeof stored !== "object" || typeof stored.secret !== "string") throw new Error("invalid");
        baseline.set(uid, JSON.stringify(stored));
        // The index is authoritative for the uid; a mismatch is rewritten on the next save.
        services.push(stored.uid === uid ? stored : { ...stored, uid });
      } catch {
        corrupt.push(uid);
        console.error(`Dropping unreadable stored service ${uid}`);
      }
    });
    persisted = baseline;

    const order = services.map((service) => service.uid);
    // Missing entries need no cleanup; corrupt ones stay in `written` so they get swept below.
    const missing = index.order.filter((uid, i) => raws[i] === null);
    let written = index.written.filter((uid) => !missing.includes(uid));
    if (!sameList(order, index.order) || written.length !== index.written.length) {
      await writeIndex(order, written);
    }

    const orphans = written.filter((uid) => !order.includes(uid));
    if (orphans.length > 0) {
      const failed = await deleteSecrets(orphans);
      written = [...order, ...failed];
      await writeIndex(order, written);
    }

    return services;
  });
}

/**
 * Persists `services` as the complete, ordered list. Only entries whose
 * content changed since the last load/save are written; entries no longer in
 * the list are deleted after the new index is stored. If any write fails the
 * index is left unchanged and the error is rethrown.
 */
export function saveServices(services: readonly Service[]): Promise<void> {
  return enqueue(async () => {
    const order = services.map((service) => service.uid);
    if (new Set(order).size !== order.length) throw new Error("Duplicate service uid");

    let index = cachedIndex ?? (await readIndex());
    const changed = services
      .map((service) => ({ uid: service.uid, json: JSON.stringify(service) }))
      .filter(({ uid, json }) => persisted.get(uid) !== json);

    // Track new uids before their entries exist so an interruption can't orphan them.
    const untracked = changed.map(({ uid }) => uid).filter((uid) => !index.written.includes(uid));
    if (untracked.length > 0) {
      index = await writeIndex(index.order, [...index.written, ...untracked]);
    }

    const results = await Promise.allSettled(changed.map(({ uid, json }) => SecureStore.setItemAsync(secretKey(uid), json)));
    let failure: unknown = null;
    changed.forEach(({ uid, json }, i) => {
      const result = results[i];
      if (result.status === "fulfilled") {
        persisted.set(uid, json);
      } else {
        persisted.delete(uid); // content unknown: rewrite next time
        failure ??= result.reason;
      }
    });
    if (failure !== null) {
      throw new Error(`Failed to save services: ${String(failure)}`);
    }

    if (!sameList(order, index.order)) {
      index = await writeIndex(order, index.written);
    }

    const removed = index.written.filter((uid) => !order.includes(uid));
    if (removed.length > 0) {
      const failed = await deleteSecrets(removed);
      await writeIndex(order, [...order, ...failed]);
    }
  });
}

/**
 * Deletes every stored service, the index and any legacy config. The index is
 * first emptied (but still tracks every entry) so an interruption leaves
 * nothing unswept.
 * Throws if any entry couldn't be deleted.
 */
export function eraseAllServices(): Promise<void> {
  return enqueue(async () => {
    let tracked: string[] = [];
    try {
      tracked = (await readIndex()).written;
    } catch (error) {
      console.error("Unreadable vault index while erasing:", error);
    }
    try {
      // Not yet migrated data (normally migrated at startup) is erased too.
      tracked = unique([...tracked, ...((await readLegacyConfig())?.uids ?? [])]);
    } catch (error) {
      console.error("Unreadable legacy config while erasing:", error);
    }
    await writeIndex([], tracked);

    const failed = await deleteSecrets(tracked);
    if (failed.length > 0) {
      await writeIndex([], failed);
      throw new Error(`Failed to erase ${failed.length} stored service(s)`);
    }
    await removeLegacyConfig();
    await AsyncStorage.removeItem(VAULT_INDEX_KEY);
    cachedIndex = null;
    persisted = new Map();
  });
}
