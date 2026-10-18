/** Constantes do protocolo compartilhadas entre servidor e clientes (spec §4). */

export const PROTOCOL_VERSION = 1;

/** Limites de tamanho de frames, corpos e campos (spec §4.1, §4.3, §3). */
export const LIMITS = {
  frameBytes: 4096,
  httpBodyBytes: 1024,
  idLength: 64,
  cardIdLength: 32,
  destinations: 16,
  kCards: 8,
  nicknameLength: 20,
  tokenLength: 43,
} as const;

/** Códigos de fechamento do WebSocket (spec §4.2). */
export const CLOSE = {
  LEAVE: 1000,
  BINARY: 1003,
  ABUSE: 1008,
  TOO_BIG: 1009,
  ROOM_GONE: 4000,
  PROTOCOL: 4001,
  AUTH: 4003,
  HELLO: 4008,
  OTHER_TAB: 4009,
  LIMITED: 4029,
} as const;

/** Fechamentos depois dos quais o cliente não reconecta. */
export const FINAL_CLOSE_CODES: readonly number[] = [1000, 4000, 4001, 4003, 4009];

/** Fechamentos depois dos quais o cliente espera `SLOW_RETRY_MS` antes de reconectar. */
export const SLOW_RETRY_CODES: readonly number[] = [1008, 4029];

/** Intervalo do texto literal `ping` enviado pelo cliente. */
export const PING_INTERVAL_MS = 15_000;

/** Prazo do `pong` depois de um `ping` de `wake()`: sem ele, o socket é dado como morto (spec web §6.2). */
export const PONG_TIMEOUT_MS = 2_000;

/** Prazo do `ack` de um `act`/`concede`: sem ele, o socket é dado como morto (spec web §6.2). */
export const ACK_TIMEOUT_MS = 5_000;

/** Espera entre tentativas de reconexão; a última se repete. */
export const RECONNECT_DELAYS_MS = [500, 1000, 2000, 4000, 5000] as const;

/** Fração de variação aleatória aplicada a cada espera de reconexão. */
export const RECONNECT_JITTER = 0.2;

export const SLOW_RETRY_MS = 30_000;
