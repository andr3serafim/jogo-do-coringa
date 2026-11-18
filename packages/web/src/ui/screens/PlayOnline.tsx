// Jogar online (`/jogar`; spec 2026-11-18-menus-folheto-design.md §2): criar sala e entrar numa sala, os formulários que eram do Início
// (spec da web §2.1). O apelido fica lembrado; a aparência que vai junto na criação é a das Opções (fatia 3 dos decks, H1).
import { DEFAULT_CONFIG } from '@coringa/engine';
import { DEFAULT_LOOK, HttpError, normalizeNickname, parseTarget } from '@coringa/protocol';
import { useState, type FormEvent } from 'react';
import type { RoomApi } from '../../app/room-api.ts';
import { navigate } from '../../app/router.ts';
import { PLAY_ONLINE_LABEL, PLAY_ONLINE_LINE } from '../../model/copy.ts';
import { sentLook } from '../../model/looks.ts';
import { loadNickname, loadPrefs, saveNickname, saveSeat, type KeyValueStore } from '../../model/storage.ts';
import { HpChoice } from '../HpChoice.tsx';
import { MenuScreen } from '../menu/MenuScreen.tsx';
import { BackHome, MenuField, MenuPanel, MenuTitle, StampButton } from '../menu/parts.tsx';
import { NICKNAME_ERROR, OFFLINE, TOO_MANY } from '../text.ts';

const TARGET_ERROR = 'Digite o código de 6 caracteres ou o link da sala.';

const CREATE_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
);
const JOIN_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M3 12h11M10 8l4 4-4 4" />
  </svg>
);

export interface PlayOnlineProps {
  api: RoomApi;
  store: KeyValueStore;
}

export function PlayOnline({ api, store }: PlayOnlineProps) {
  const [nickname, setNickname] = useState(() => loadNickname(store));
  const [hp, setHp] = useState(DEFAULT_CONFIG.hp);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [targetError, setTargetError] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    const valid = normalizeNickname(nickname);
    if (valid === null) {
      setNicknameError(NICKNAME_ERROR);
      return;
    }
    setNicknameError(null);
    setBusy(true);
    try {
      // Fora do padrão, a aparência das Opções vai junto (fatia 3, H1); no padrão, a chamada é a de antes.
      const sent = sentLook(loadPrefs(store).look ?? DEFAULT_LOOK);
      const room = await (sent === undefined ? api.create(valid, hp) : api.create(valid, hp, sent));
      saveNickname(store, valid);
      saveSeat(store, room.code, { token: room.token, playerId: room.playerId, nickname: valid });
      navigate(`/s/${room.code}`);
    } catch (error) {
      setBusy(false);
      if (error instanceof HttpError && error.status === 400) setNicknameError(NICKNAME_ERROR);
      else if (error instanceof HttpError && error.status === 429) setCreateError(TOO_MANY);
      else if (error instanceof HttpError) setCreateError('Não deu para criar a sala. Tente de novo.');
      else setCreateError(`${OFFLINE}. Confira a internet e tente de novo.`);
    }
  }

  function join(event: FormEvent) {
    event.preventDefault();
    let code: string | null;
    try {
      // O servidor do link é ignorado: a interface só fala com o próprio site.
      code = parseTarget(target, window.location.origin).code;
    } catch {
      code = null;
    }
    if (code === null) {
      setTargetError(TARGET_ERROR);
      return;
    }
    navigate(`/s/${code}`);
  }

  return (
    <MenuScreen>
      <BackHome />
      <MenuTitle card="online" line={PLAY_ONLINE_LINE} focusOnMount>
        {PLAY_ONLINE_LABEL}
      </MenuTitle>
      <MenuPanel title="Criar sala" icon={CREATE_ICON} order={1}>
        <form onSubmit={(event) => void create(event)} className="flex flex-col gap-4" noValidate>
          <MenuField
            label="Seu apelido"
            hint="De 1 a 20 caracteres."
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            error={nicknameError}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
          />
          <HpChoice value={hp} onChange={setHp} skin="menu" />
          {createError ? (
            <p role="alert" className="menu-erro">
              {createError}
            </p>
          ) : null}
          <StampButton type="submit" tone="gold" disabled={busy}>
            Criar sala
          </StampButton>
        </form>
      </MenuPanel>
      <MenuPanel title="Entrar numa sala" icon={JOIN_ICON} order={2}>
        <form onSubmit={join} className="flex flex-col gap-4" noValidate>
          <MenuField
            label="Código ou link da sala"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            error={targetError}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
          />
          <StampButton type="submit">Entrar</StampButton>
        </form>
      </MenuPanel>
    </MenuScreen>
  );
}
