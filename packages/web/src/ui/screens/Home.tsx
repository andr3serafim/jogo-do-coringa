// Início (spec §2.1): criar sala, entrar com código ou link e treinar contra o bot. O apelido fica lembrado, e a chave "Som"
// já mora aqui (guardada em `coringa:prefs`, com as outras preferências como estavam).
import { HttpError, normalizeNickname, parseTarget } from '@coringa/protocol';
import { useState, type FormEvent } from 'react';
import type { RoomApi } from '../../app/room-api.ts';
import { navigate } from '../../app/router.ts';
import { SOUND_LABEL } from '../../model/copy.ts';
import { loadNickname, loadPrefs, saveNickname, savePrefs, saveSeat, type KeyValueStore } from '../../model/storage.ts';
import { Button, Panel, Screen, Switch, TextField, Title } from '../parts.tsx';
import { useSound } from '../sound-context.ts';
import { NICKNAME_ERROR, OFFLINE, TOO_MANY } from '../text.ts';

const TARGET_ERROR = 'Digite o código de 6 caracteres ou o link da sala.';

export interface HomeProps {
  api: RoomApi;
  store: KeyValueStore;
}

export function Home({ api, store }: HomeProps) {
  const [nickname, setNickname] = useState(() => loadNickname(store));
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState('');
  const [targetError, setTargetError] = useState<string | null>(null);
  const sound = useSound();
  const [soundOn, setSoundOn] = useState(() => loadPrefs(store).sound);

  /** Liga ou desliga o som. O controlador é avisado na hora, no próprio clique (ver `PlayTable.changePrefs`). */
  function changeSound(on: boolean) {
    setSoundOn(on);
    savePrefs(store, { ...loadPrefs(store), sound: on });
    sound.setEnabled(on);
  }

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
      const room = await api.create(valid);
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
    <Screen>
      <Title>Jogo do Coringa</Title>
      <p className="text-lg">Duelo de cartas para dois jogadores, direto no navegador.</p>
      <Panel label="Criar sala">
        <form onSubmit={(event) => void create(event)} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Seu apelido"
            hint="De 1 a 20 caracteres."
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            error={nicknameError}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
          />
          {createError ? (
            <p role="alert" className="font-bold text-vermelho">
              {createError}
            </p>
          ) : null}
          <Button type="submit" disabled={busy}>
            Criar sala
          </Button>
        </form>
      </Panel>
      <Panel label="Entrar numa sala">
        <form onSubmit={join} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Código ou link da sala"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            error={targetError}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
          />
          <Button type="submit" variant="secondary">
            Entrar
          </Button>
        </form>
      </Panel>
      <Button variant="secondary" onClick={() => navigate('/treino')}>
        Treinar contra o bot
      </Button>
      <Panel label="Preferências">
        <Switch label={SOUND_LABEL} checked={soundOn} onChange={changeSound} />
      </Panel>
    </Screen>
  );
}
