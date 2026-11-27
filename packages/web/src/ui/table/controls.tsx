// Peças de controle que a barra de ação e os painéis das fases (Equipar, ordem, reação) dividem. Desde o bloco D dos pontos do playtest
// (ponto 5, spec do playtest §6.1) são carimbos de madeira (`.carimbo`, no `styles.css`): borda grossa de tinta, sombra dura da cor da
// madeira (a barra é de tinta) e, no toque, o carimbo afunda. O pequeno é de papel; os grandes levam o título em tipo de madeira e o grão:
// ouro (Confirmar e a escolha principal), papel (Passar, Encerrar turno) e vermelho, só o Atacar. Alvo de toque ≥ 44 px (spec §3.2).
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import type { Notice } from '../../model/session.ts';

const OFF = 'disabled:cursor-wait disabled:opacity-60';

/** O carimbo pequeno, de papel: jogadas, alvos, destinos, Cancelar. Sem o grão: leva prévias e contas (spec §10.7). */
export const SECONDARY = `carimbo carimbo-papel min-h-11 px-3.5 py-1.5 text-left text-[15px] font-bold ${OFF}`;

/** A face do carimbo grande, sem a altura: o grão, o respiro e o título à esquerda. */
const FACE = `carimbo carimbo-grande justify-center px-3.5 py-1.5 text-left ${OFF}`;

const BIG = `${FACE} min-h-14 pc:min-h-12`;

/** O carimbo principal da fase: ouro, com o título em tipo de madeira. Mais alto que o pequeno e longe da mão. */
export const PRIMARY = `${BIG} carimbo-ouro`;

/**
 * O tamanho dos botões principais (decisoes.md 2026-11-26 (7), ponto 2): o Atacar, o Encerrar turno, o Confirmar e o Passar, iguais. A altura
 * é a do Atacar com a tira; no PC a largura mínima também. Só o Atacar cresce além dela, quando a prévia é longa.
 */
export const MAIN_SIZE = 'min-h-[68px] pc:min-h-[72px] pc:min-w-[260px]';

/** O carimbo grande de papel, no tamanho dos principais: Encerrar turno e Passar. */
export const PAPER_BIG = `${FACE} carimbo-papel ${MAIN_SIZE}`;

/** O Atacar: o único vermelho. */
export const ATTACK = `${FACE} carimbo-atacar ${MAIN_SIZE}`;

/**
 * As jogadas especiais (Devastar, Reflect, Anular o Reflect, Ressuscitar; decisoes.md 2026-11-26 (8), item 4): o retângulo do Atacar, em
 * tinta, com o título em ouro e o detalhe na tira de papel. Só a largura mínima cede: numa linha apertada o título quebra.
 */
export const SPECIAL = `${FACE} carimbo-tinta min-h-[68px] pc:min-h-[72px]`;

/** O título das jogadas especiais: o tipo de madeira do Atacar, em ouro. */
// No celular, 20 px: o título cabe numa linha a 360 px ("DEVASTAR O ATAQUE" a 24 px quebrava em duas, e duas especiais empilhadas
// tiravam da janela dos campos a dica do tutorial num celular de 640 px de altura).
export const SPECIAL_TITLE = 'font-madeira text-xl uppercase leading-none text-ouro pc:text-[26px]';

export const PRIMARY_TITLE = 'font-madeira text-[19px] uppercase leading-tight pc:text-[22px]';

export const ATTACK_TITLE = 'carimbo-atacar-titulo font-madeira text-2xl uppercase leading-none pc:text-[26px]';

/** A prévia do Atacar numa tira lisa de papel: número de jogo, na fonte de texto e sem o grão (spec §10.7). */
export const STRIP = 'carimbo-tira font-texto text-xs font-extrabold tabular-nums pc:text-[13px]';

/**
 * O título dos botões principais sem a tira (o Confirmar e o Passar): o tipo de madeira do Atacar. No celular, 2 px menor: a 360 px o Confirmar
 * divide a linha com os dois selos e, com 24 px, empurrava o Recomeçar para fora da tela.
 */
export const MAIN_TITLE = 'whitespace-nowrap font-madeira text-[22px] uppercase leading-none pc:text-[26px]';

/** O desenho dos botões principais, à esquerda da palavra (o tamanho da espada do Atacar). */
export const MAIN_ICON = 'size-9 flex-none pc:size-10';

/**
 * O Confirmar e o Passar no retângulo do Atacar (decisoes.md 2026-11-26 (7), ponto 2): o desenho à esquerda e a palavra em tipo de madeira;
 * o Confirmar em ouro, o Passar em papel. O nome acessível é a palavra (o desenho é `aria-hidden`).
 */
export function MainButton({
  tone,
  icon,
  label,
  className = '',
  ...rest
}: Omit<ComponentPropsWithoutRef<'button'>, 'children'> & { tone: 'ouro' | 'papel'; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className={`${tone === 'ouro' ? `${FACE} carimbo-ouro ${MAIN_SIZE}` : PAPER_BIG} flex flex-row items-center gap-2.5 ${className}`}
      {...rest}
    >
      {icon}
      <span className={MAIN_TITLE}>{label}</span>
    </button>
  );
}

/**
 * O selo redondo (Desfazer, Recomeçar): o desenho gira no toque. Sem legenda (decisoes.md 2026-11-25 (3)): o nome fica no `aria-label` e
 * na dica do mouse.
 */
export function Seal({ label, icon, ...rest }: Omit<ComponentPropsWithoutRef<'button'>, 'children'> & { label: string; icon: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} className={`carimbo-selo min-h-11 min-w-11 ${OFF}`} {...rest}>
      <span data-selo>{icon}</span>
    </button>
  );
}

/** A seta que volta: desfazer um passo. Desenho original, no traço cheio de tinta das figuras da mesa. */
export function UndoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 5 3 10l6 5v-3.5c5 0 8 1.5 10 6-1-6-4-9.5-10-10V5Z" />
    </svg>
  );
}

/** A seta em círculo: recomeçar do início. */
export function ResetIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4a8 8 0 1 0 8 8h-3a5 5 0 1 1-5-5v3l5-4.5L12 1Z" />
    </svg>
  );
}

/** O aviso de uma jogada recusada (`rate`, `rule`, spec §6.4): os controles voltam e a linha diz o porquê. */
export function NoticeLine({ notice }: { notice: Notice | null }) {
  if (notice === null || (notice.kind !== 'rate' && notice.kind !== 'rule')) return null;
  return (
    <p role="status" className="text-sm font-bold leading-snug text-ouro">
      {notice.text}
    </p>
  );
}

interface TwoLineProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'title'> {
  title: string;
  detail?: string;
  titleClass?: string;
  detailClass?: string;
  /** Um desenho à esquerda das duas linhas (escondido do leitor de tela: o nome é o texto). */
  icon?: ReactNode;
  /** A segunda linha é a tira de papel do Atacar (`data-tira`). */
  strip?: boolean;
}

/**
 * Botão de duas linhas. O nome é o título e a segunda linha, juntos (`aria-labelledby` nos dois): o axe (WCAG 2.5.3, rótulo no
 * nome) exige que o texto visível do botão seja trecho contínuo do nome, e o texto visível é o das duas linhas. O espaço entre
 * os dois `span` separa as palavras do texto visível ("Atacar 27 × 3 · dano 24", e não "Atacar27 × 3 · dano 24").
 */
export function TwoLine({ title, detail, titleClass = '', detailClass = '', className = '', icon, strip, ...rest }: TwoLineProps) {
  const titleId = useId();
  const detailId = useId();
  const lines = (
    <>
      <span id={titleId} className={titleClass}>
        {title}
      </span>
      {detail ? (
        <>
          {' '}
          <span id={detailId} data-tira={strip ? '' : undefined} className={detailClass}>
            {detail}
          </span>
        </>
      ) : null}
    </>
  );
  return (
    <button
      type="button"
      aria-labelledby={detail ? `${titleId} ${detailId}` : titleId}
      className={`flex ${icon ? 'flex-row items-center gap-2.5' : 'flex-col items-start'} ${className}`}
      {...rest}
    >
      {icon ? (
        <>
          {icon}
          <span className="flex flex-col items-start">{lines}</span>
        </>
      ) : (
        lines
      )}
    </button>
  );
}
