// Textos das duas telas das partidas anteriores (a lista e o visualizador do replay), em pt-BR. Ficam fora do `copy.ts` de
// propósito: o `copy.ts` entra no JavaScript inicial, e estes só as telas carregadas sob demanda usam. Se morassem lá, o
// minificador os deixaria no pacote inicial (o `scripts/smoke.ts` confere que não vazam). Os textos que o código inicial
// também usa (o título "Partidas anteriores", "Voltar à lista", "Revendo a partida") ficam no `copy.ts`.
import type { PlayerId } from '@coringa/engine';
import type { Outcome } from '@coringa/protocol';
import { trainingLevelText } from './copy.ts';
import type { PastGameMode } from './past-games.ts';

// --- A lista ---

export const PAST_GAMES_EMPTY_TEXT = 'Nenhuma partida terminada neste navegador.';
/** O botão de cada linha com replay. O nome é só este; o resto da linha o descreve (`aria-describedby`). */
export const REVIEW_LABEL = 'Rever';

const two = (n: number): string => String(n).padStart(2, '0');

/** "25/10, 14:30": dia/mês e hora local, em 24 h. */
export function pastGameDateText(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return 'data desconhecida';
  return `${two(date.getDate())}/${two(date.getMonth() + 1)}, ${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** O resultado do ponto de vista de quem guardou a partida (`seat`). */
export function pastGameResultText(outcome: Outcome, seat: PlayerId): string {
  const { result } = outcome;
  if (result === null) return 'Sem resultado';
  if (result.kind === 'DRAW') return 'Empate';
  return result.winner === seat ? 'Vitória' : 'Derrota';
}

/** "Treino · Médio" ou "Sala ABC234". */
export const pastGameModeText = (mode: PastGameMode): string =>
  mode.kind === 'training' ? trainingLevelText(mode.level) : `Sala ${mode.code}`;

/** Um apelido guardado vazio (entrada estragada) vira "Oponente"/"Você", como a mesa faz sem a sala. */
export const opponentName = (name: string): string => (name === '' ? 'Oponente' : name);
export const myName = (name: string): string => (name === '' ? 'Você' : name);

export const againstText = (opponent: string): string => `contra ${opponentName(opponent)}`;

// --- O visualizador ---

export const REPLAY_CONTROLS_LABEL = 'Controles do replay';
export const REPLAY_START_LABEL = 'Início';
export const REPLAY_PREVIOUS_LABEL = 'Passo anterior';
export const REPLAY_NEXT_LABEL = 'Próximo passo';
export const REPLAY_PLAY_LABEL = 'Tocar';
export const REPLAY_PAUSE_LABEL = 'Pausar';
export const REPLAY_ROUND_LABEL = 'Rodada';

/** "Passo 12 de 240". O total são os passos que existem para ver (numa parada, só os de antes do passo recusado). */
export const stepCounterText = (step: number, total: number): string => `Passo ${step} de ${total}`;

export const OTHER_RULES_VERSION_TEXT =
  'Esta partida foi gravada com outra versão das regras. Ela pode não se repetir igual.';

/** O motor costuma dizer o motivo sem ponto final; com ele, a frase não ganha um segundo. */
const withoutFinalDot = (message: string): string => message.trim().replace(/\.+$/, '');

/** "O replay parou no passo 37: <motivo>."; no passo 0 a partida nem chegou a começar. */
export const replayStoppedText = (step: number, message: string): string =>
  step === 0 ? `O replay não pôde começar: ${withoutFinalDot(message)}.` : `O replay parou no passo ${step}: ${withoutFinalDot(message)}.`;

export const UNKNOWN_GAME_TEXT = 'Esta partida não está mais neste navegador.';
export const NO_REPLAY_TEXT = 'Esta partida não tem replay.';
