// A versão publicada, de `GET /api/health` (spec §2.4). É só um enfeite do menu: qualquer falha vira `null`, sem
// aviso e sem erro na tela.

/** `null` se a rede falhar, o servidor recusar ou a resposta não trouxer uma `version` em texto. */
export async function fetchVersion(origin: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(`${origin}/api/health`);
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('version' in body)) return null;
    return typeof body.version === 'string' ? body.version : null;
  } catch {
    return null;
  }
}
