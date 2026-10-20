import * as Clipboard from 'expo-clipboard';

/** How long a copied code stays on the clipboard before it's cleared. */
export const CLIPBOARD_CLEAR_DELAY_MS = 30_000;

let pendingClear: ReturnType<typeof setTimeout> | null = null;

/**
 * Copies a code to the clipboard and clears it after `CLIPBOARD_CLEAR_DELAY_MS`,
 * unless the clipboard has changed since. A newer copy replaces the pending clear.
 */
export async function copyCodeToClipboard(code: string): Promise<void> {
  await Clipboard.setStringAsync(code);

  if (pendingClear) clearTimeout(pendingClear);
  pendingClear = setTimeout(() => {
    pendingClear = null;
    clearClipboardIfUnchanged(code).catch((error) => {
      console.warn('Failed to clear the clipboard:', error);
    });
  }, CLIPBOARD_CLEAR_DELAY_MS);
}

/** Empties the clipboard only if it still holds `code`, so a later copy is never clobbered. */
async function clearClipboardIfUnchanged(code: string): Promise<void> {
  if ((await Clipboard.getStringAsync()) === code) {
    await Clipboard.setStringAsync('');
  }
}
