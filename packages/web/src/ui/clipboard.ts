/** Copia `text` para a área de transferência. `false` se não houver como (fora de contexto seguro, permissão negada). */
export async function copyText(text: string): Promise<boolean> {
  try {
    // Fora de contexto seguro (http num IP da rede local) não há `navigator.clipboard`.
    const clipboard = navigator.clipboard as Clipboard | undefined;
    if (clipboard === undefined) return false;
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
