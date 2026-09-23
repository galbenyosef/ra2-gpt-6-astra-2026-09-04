import { validateSaveGame, type SaveGame } from './save-game';
import type { SaveOverview } from './save-overview';

export interface SaveSummary {
  id: string; name: string; savedAt: string; mapName: string;
  mode: 'skirmish' | 'bootcamp'; country: string; elapsed: number;
  gameVersion?: string | null; commitHash?: string | null; overview?: SaveOverview;
}
interface StoredSave { summary: SaveSummary; data: SaveGame }
const DATABASE = 'rustalarm-saves';
const STORE = 'saves';

function storageError(error: unknown): Error {
  return new Error(error instanceof DOMException && error.name === 'QuotaExceededError'
    ? '浏览器存储空间不足。请导出存档后删除旧存档。' : '浏览器无法保存或读取存档。请检查网站存储权限。');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    let blocked = false;
    try { request = indexedDB.open(DATABASE, 1); } catch (error) { reject(storageError(error)); return; }
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: 'summary.id' }); };
    request.onerror = () => reject(storageError(request.error));
    request.onblocked = () => { blocked = true; reject(new Error('请关闭其他游戏页面后重试存档。')); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close(); resolve(request.result);
    };
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result: T;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(storageError(tx.error));
      tx.onerror = () => { /* The abort event reports the final transaction failure. */ };
      try {
        const request = operation(tx.objectStore(STORE));
        request.onsuccess = () => { result = request.result; };
      } catch (error) { tx.abort(); reject(storageError(error)); }
    });
  } finally { db.close(); }
}

export async function listSaves(): Promise<SaveSummary[]> {
  const records = await transaction<StoredSave[]>('readonly', store => store.getAll());
  return records.map(record => {
    if (record.summary.overview) return record.summary;
    // Older records can show an overview without rewriting the original save.
    try { return summarizeSave(record.summary.id, validateSaveGame(record.data)); }
    catch { return record.summary; }
  }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

function summarizeSave(id: string, data: SaveGame): SaveSummary {
  return { id, name: data.name, savedAt: data.savedAt, mapName: data.map.name ?? data.map.id ?? '',
    mode: data.engine.mode, country: data.engine.players.find(player => player.id === data.engine.localPlayerId)!.country, elapsed: data.engine.time,
    gameVersion: data.gameVersion, commitHash: data.commitHash, overview: data.overview };
}

export async function writeSave(value: SaveGame, id: string = crypto.randomUUID()): Promise<SaveSummary> {
  const data = validateSaveGame(value), summary = summarizeSave(id, data);
  await transaction('readwrite', store => store.put({ summary, data } satisfies StoredSave));
  return summary;
}

export async function readSave(id: string): Promise<SaveGame> {
  const result = await transaction<StoredSave | undefined>('readonly', store => store.get(id));
  if (!result) throw new Error('存档已不存在。请刷新存档列表。');
  return validateSaveGame(result.data);
}

export async function deleteSave(id: string): Promise<void> {
  await transaction('readwrite', store => store.delete(id));
}
