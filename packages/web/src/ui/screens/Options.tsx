// Opções (`/opcoes`; spec 2026-11-18-menus-folheto-design.md §2): a aparência das cartas e as preferências que o jogo guarda — o som, o
// movimento reduzido e o passe automático, as mesmas chaves do menu da partida, no mesmo `coringa:prefs`. Gravar nunca apaga as outras.
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { useState } from 'react';
import {
  AUTO_PASS_LABEL,
  LOOK_ONLINE_NOTE,
  LOOK_PANEL_LABEL,
  OPTIONS_LABEL,
  OPTIONS_LINE,
  PREFERENCES_LABEL,
  REDUCE_MOTION_LABEL,
  REDUCE_MOTION_SYSTEM_HINT,
  SOUND_LABEL,
} from '../../model/copy.ts';
import { loadPrefs, savePrefs, type KeyValueStore, type Prefs } from '../../model/storage.ts';
import { useSystemReducedMotion } from '../anim/useReducedMotion.ts';
import { LookChoice } from '../LookChoice.tsx';
import { useMenuMotion } from '../menu/menu-theme.tsx';
import { MenuScreen } from '../menu/MenuScreen.tsx';
import { BackHome, MenuPanel, MenuSwitch, MenuTitle } from '../menu/parts.tsx';
import { useSound } from '../sound-context.ts';

const ICON = { strokeWidth: 2.2, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function Options({ store }: { store: KeyValueStore }) {
  const sound = useSound();
  const systemReduced = useSystemReducedMotion();
  const { reduceMotion, setReduceMotion } = useMenuMotion();
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(store));
  const look = prefs.look ?? DEFAULT_LOOK;

  /** Lê de novo antes de gravar (o tema, trocado no Início, também mora lá) e mostra o que gravou. */
  function save(change: Partial<Prefs>) {
    const next = { ...loadPrefs(store), ...change };
    savePrefs(store, next);
    setPrefs(next);
  }

  return (
    <MenuScreen>
      <BackHome />
      <MenuTitle card="options" line={OPTIONS_LINE} focusOnMount>
        {OPTIONS_LABEL}
      </MenuTitle>
      <MenuPanel
        title={LOOK_PANEL_LABEL}
        order={1}
        icon={
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...ICON}>
            <rect x="3.5" y="6" width="10" height="14" rx="1.5" transform="rotate(-10 8.5 13)" />
            <rect x="10.5" y="4" width="10" height="14" rx="1.5" transform="rotate(8 15.5 11)" />
          </svg>
        }
      >
        <LookChoice skin="menu" value={look} onChange={(next: Look) => save({ look: next })} note={LOOK_ONLINE_NOTE} />
      </MenuPanel>
      <MenuPanel
        title={PREFERENCES_LABEL}
        order={2}
        icon={
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...ICON}>
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
        }
      >
        <MenuSwitch
          label={SOUND_LABEL}
          checked={prefs.sound}
          onChange={(on) => {
            save({ sound: on });
            // Na hora, no próprio clique (como no menu da partida): é o gesto que libera o áudio.
            sound.setEnabled(on);
          }}
        />
        <MenuSwitch
          label={REDUCE_MOTION_LABEL}
          checked={reduceMotion || systemReduced}
          disabled={systemReduced}
          hint={systemReduced ? REDUCE_MOTION_SYSTEM_HINT : undefined}
          onChange={(on) => {
            setReduceMotion(on);
            setPrefs((current) => ({ ...current, reduceMotion: on }));
          }}
        />
        <MenuSwitch label={AUTO_PASS_LABEL} checked={prefs.autoPass} onChange={(on) => save({ autoPass: on })} />
      </MenuPanel>
    </MenuScreen>
  );
}
