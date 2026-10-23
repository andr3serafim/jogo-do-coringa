// O menu da partida (spec §2.4, §7): copiar o link da sala, as chaves (passe automático, movimento reduzido e som), o resumo
// das regras, Desistir (com confirmação) e a versão publicada. É um `<dialog>` modal; o resumo e a confirmação são
// diálogos irmãos, abertos por cima dele, e o menu continua aberto por baixo (o foco volta ao botão que os abriu).
//
// Não conhece a sessão, o armazenamento nem o HTTP: recebe as preferências e os ouvintes por props, e o que depende da
// sala (o link, a versão) é opcional e some quando falta. Assim o treino contra o bot usa o mesmo menu.
import { useEffect, useId, useState } from 'react';
import {
  AUTO_PASS_LABEL,
  CANCEL_LABEL,
  CLOSE_LABEL,
  CONCEDE_LABEL,
  CONCEDE_TITLE,
  CONCEDE_WARNING,
  CONFIRM_LABEL,
  COPY_LINK_LABEL,
  EXIT_TRAINING_LABEL,
  MENU_LABEL,
  REDUCE_MOTION_LABEL,
  REDUCE_MOTION_SYSTEM_HINT,
  RULES_LABEL,
  SOUND_LABEL,
  versionText,
} from '../../model/copy.ts';
import type { Prefs } from '../../model/storage.ts';
import { useSystemReducedMotion } from '../anim/useReducedMotion.ts';
import { copyText } from '../clipboard.ts';
import { Switch } from '../parts.tsx';
import { COPY_FAILED, LINK_COPIED } from '../text.ts';
import { Modal } from './Modal.tsx';
import { RulesDialog } from './RulesDialog.tsx';

const BASE = 'min-h-11 border-2 px-4 py-1.5 text-left font-bold disabled:opacity-60';
const ITEM = `${BASE} border-tinta bg-papel text-tinta`;
const DANGER = `${BASE} border-vermelho bg-papel text-vermelho`;
const CONFIRM = `${BASE} border-vermelho bg-vermelho text-papel`;

export interface MenuButtonProps {
  onClick: () => void;
  /** Onde o botão mora: na capa colorida (tinta) ou na coluna escura do histórico (papel). */
  tone?: 'tinta' | 'papel';
  /** Visibilidade por ponto de quebra: o celular e o PC têm cada um o seu botão, e o CSS esconde um deles. */
  className?: string;
}

/** O botão que abre o menu (alvo de toque de 44 px). */
export function MenuButton({ onClick, tone = 'tinta', className = '' }: MenuButtonProps) {
  const color = tone === 'tinta' ? 'border-tinta text-tinta' : 'border-papel/60 text-papel';
  return (
    <button
      type="button"
      aria-label={MENU_LABEL}
      aria-haspopup="dialog"
      onClick={onClick}
      className={`grid size-11 place-items-center border-2 bg-transparent ${color} ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-5" fill="currentColor">
        <circle cx="12" cy="5" r="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="12" cy="19" r="2.2" />
      </svg>
    </button>
  );
}

export interface GameMenuProps {
  open: boolean;
  onClose: () => void;
  prefs: Prefs;
  /** As preferências novas: quem chama guarda no armazenamento e avisa a sessão. */
  onPrefs: (prefs: Prefs) => void;
  /** O link da sala; sem ele (treino) não há o que copiar. */
  inviteLink?: string;
  /** Busca a versão publicada, uma vez a cada abertura do menu; `null` ou falha não mostram nada. Tem que ser estável. */
  loadVersion?: () => Promise<string | null>;
  /** Só no treino: sai da partida na hora, sem resultado (a sala local não tem o que avisar a ninguém). */
  onExit?: () => void;
  /** O aviso da confirmação de Desistir (padrão: perder por W.O.). O treino não tem W.O. e diz só que a partida se perde. */
  concedeWarning?: string;
  /** A chave "Passar sozinho" (padrão: aparece). O treino a esconde: lá o passe automático não se aplica (spec §2.6). */
  showAutoPass?: boolean;
  /** Há partida em curso para desistir. */
  canConcede: boolean;
  /** Sem conexão não dá para desistir (o pedido se perderia). */
  concedeDisabled: boolean;
  onConcede: () => void;
}

type Feedback = 'copied' | 'copyFailed' | null;

export function GameMenu({
  open,
  onClose,
  prefs,
  onPrefs,
  inviteLink,
  loadVersion,
  onExit,
  concedeWarning = CONCEDE_WARNING,
  showAutoPass = true,
  canConcede,
  concedeDisabled,
  onConcede,
}: GameMenuProps) {
  const titleId = useId();
  const systemReduced = useSystemReducedMotion();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [version, setVersion] = useState<string | null>(null);

  // Fechar o menu leva junto o que ele abriu e o aviso de "copiado". Estado derivado na renderização, sem efeito.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setRulesOpen(false);
      setConfirmOpen(false);
      setFeedback(null);
    }
  }

  // A partida que acaba com a confirmação aberta (o oponente desistiu, o tempo estourou) a fecha: não há mais o que
  // desistir, e ela não fica armada para quando uma partida nova (revanche) começar.
  if (!canConcede && confirmOpen) setConfirmOpen(false);

  // A versão publicada: uma busca a cada abertura. Falhar não é erro; só não aparece nada.
  useEffect(() => {
    if (!open || loadVersion === undefined) return;
    let live = true;
    loadVersion().then(
      (found) => {
        if (live && found !== null) setVersion(found);
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [open, loadVersion]);

  async function copy(link: string) {
    setFeedback((await copyText(link)) ? 'copied' : 'copyFailed');
  }

  return (
    <>
      <Modal open={open} onClose={onClose} labelledBy={titleId}>
        <div className="flex flex-col gap-3">
          <h2 id={titleId} className="textura font-madeira text-2xl uppercase leading-tight">
            {MENU_LABEL}
          </h2>

          {inviteLink === undefined ? null : (
            <>
              <button type="button" className={ITEM} onClick={() => void copy(inviteLink)}>
                {COPY_LINK_LABEL}
              </button>
              <div aria-live="polite">
                {feedback === null ? null : <p className="font-bold">{feedback === 'copied' ? LINK_COPIED : COPY_FAILED}</p>}
              </div>
            </>
          )}

          {showAutoPass ? (
            <Switch
              label={AUTO_PASS_LABEL}
              checked={prefs.autoPass}
              onChange={(autoPass) => onPrefs({ ...prefs, autoPass })}
            />
          ) : null}
          <Switch
            label={REDUCE_MOTION_LABEL}
            checked={prefs.reduceMotion || systemReduced}
            disabled={systemReduced}
            hint={systemReduced ? REDUCE_MOTION_SYSTEM_HINT : undefined}
            onChange={(reduceMotion) => onPrefs({ ...prefs, reduceMotion })}
          />
          <Switch label={SOUND_LABEL} checked={prefs.sound} onChange={(sound) => onPrefs({ ...prefs, sound })} />

          <button type="button" className={ITEM} onClick={() => setRulesOpen(true)}>
            {RULES_LABEL}
          </button>

          {canConcede ? (
            <button
              type="button"
              disabled={concedeDisabled}
              className={DANGER}
              onClick={() => setConfirmOpen(true)}
            >
              {CONCEDE_LABEL}
            </button>
          ) : null}

          {onExit ? (
            <button type="button" className={ITEM} onClick={onExit}>
              {EXIT_TRAINING_LABEL}
            </button>
          ) : null}

          {version === null ? null : (
            <p data-numero className="font-texto text-sm tabular-nums">
              {versionText(version)}
            </p>
          )}

          <button type="button" className={`${ITEM} self-end`} onClick={onClose}>
            {CLOSE_LABEL}
          </button>
        </div>
      </Modal>

      <RulesDialog open={open && rulesOpen} onClose={() => setRulesOpen(false)} />
      <ConcedeDialog
        open={open && confirmOpen}
        warning={concedeWarning}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onConcede();
          onClose();
        }}
      />
    </>
  );
}

interface ConcedeDialogProps {
  open: boolean;
  warning: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** A confirmação de Desistir. O "Cancelar" vem primeiro: é nele que o foco cai ao abrir (o gesto seguro). */
function ConcedeDialog({ open, warning, onCancel, onConfirm }: ConcedeDialogProps) {
  const titleId = useId();
  const textId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} describedBy={textId} className="w-[min(92vw,26rem)]">
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="textura font-madeira text-2xl uppercase leading-tight">
          {CONCEDE_TITLE}
        </h2>
        <p id={textId}>{warning}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={ITEM} onClick={onCancel}>
            {CANCEL_LABEL}
          </button>
          <button type="button" className={CONFIRM} onClick={onConfirm}>
            {CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </Modal>
  );
}
