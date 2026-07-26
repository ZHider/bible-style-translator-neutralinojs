/**
 * 跨平台持久化存储。
 *
 * 桌面端（Neutralinojs）：使用 Neutralino.storage（持久化到 .storage/ 目录）
 * Web 端：使用 window.localStorage
 */

const STORAGE_KEYS = {
  API_KEY: "bible-style-deepseek-api-key",
  API_MODEL: "bible-style-api-model",
  CLIENT_ID: "bible-style-client-id",
} as const;

function isDesktop(): boolean {
  return typeof Neutralino !== "undefined" && typeof Neutralino.storage !== "undefined";
}

export async function getItem(key: string): Promise<string | null> {
  if (isDesktop()) {
    try {
      return await Neutralino.storage.getData(key);
    } catch {
      return null;
    }
  }
  return window.localStorage.getItem(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isDesktop()) {
    await Neutralino.storage.setData(key, value);
    return;
  }
  window.localStorage.setItem(key, value);
}

export async function removeItem(key: string): Promise<void> {
  if (isDesktop()) {
    try {
      await Neutralino.storage.removeData(key);
    } catch {
      // key may not exist
    }
    return;
  }
  window.localStorage.removeItem(key);
}

export { STORAGE_KEYS };
