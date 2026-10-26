// O Equipar do replay, só de leitura (polimento, fatia 3): no Equipar, as numéricas que o seu assento recebeu na rodada, no mesmo
// desenho de carta da mão. Sem destino, sem Desfazer, sem Confirmar: o replay só mostra o que chegou, e a montagem de cada
// jogador aparece na mesa quando a rodada revela. Quem escolhe destinos é o `EquipPanel`, da mesa ao vivo, que o replay não usa.
//
// As cartas vêm da `view` do quadro (`view.self.pending`, as do assento de quem guardou a partida; as do oponente nunca saem
// do motor). O motor as mantém até a revelação, então o bloco segue à vista no passo em que você confirma e some quando a
// rodada de ataque começa.
import type { PlayerView } from '@coringa/engine';
import { useId } from 'react';
import { NO_PENDING_TEXT } from '../../model/copy.ts';
import { REPLAY_EQUIP_LABEL } from '../../model/past-games-copy.ts';
import { Card } from '../cards/Card.tsx';

export function ReplayEquip({ view }: { view: PlayerView }) {
  const titleId = useId();
  if (view.phase.kind !== 'EQUIP') return null;
  const cards = view.self.pending;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-1.5 text-papel">
      <p id={titleId} className="text-[11px] font-bold uppercase tracking-[0.12em]">
        {REPLAY_EQUIP_LABEL}
      </p>
      {cards.length === 0 ? (
        <p className="text-sm font-bold leading-snug">{NO_PENDING_TEXT}</p>
      ) : (
        // `animated={false}`: a carta da mesa do Equipar não disputa o `layoutId` com a da fileira que ela vai ocupar.
        <ul role="list" className="flex list-none flex-wrap gap-2 p-0">
          {cards.map((card) => (
            <li key={card.id}>
              <Card card={card} size="hand" animated={false} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
