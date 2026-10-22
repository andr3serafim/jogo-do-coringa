// As sobreposições das batidas (spec §4.2, §10.1): a cena (a tela escurece e o título aparece no meio) e a faixa. Ficam
// escondidas do leitor de tela: o histórico (região polida) é o registro acessível de tudo o que aconteceu.
//
// Sem pisca-pisca (spec §10.4: nunca mais de 3 trocas claro ↔ escuro por segundo, somando tudo o que estiver na tela):
// as camadas ficam montadas o tempo todo e só trocam de opacidade (esmaecimento de 150 ms). A cortina escura da cena (a
// única mudança de luminância de tela inteira além da inversão) não segue a batida de agora: quem a sobe e a desce é o
// `useBeatPlayer`, pela mesma `FlashLock` da inversão, e a faixa também: ela sobe e desce por ele, quando a regra deixa. Entre
// uma faixa e a seguinte só o texto troca, então faixas coladas são UMA subida e UMA descida. No `catchUp`, onde batidas de
// movimento se intercalam com as faixas, `bannerBeatAt` mantém a camada no ar da primeira à última faixa da linha do tempo
// (com o texto da última que passou): uma subida e uma descida por reconexão, e não uma por faixa, o que passaria de 3
// trocas por segundo.
//
// Com movimento reduzido, a cena é o mesmo texto parado que aparece e some (esmaecimento), sem escala nem deslocamento.
import type { Names } from '@coringa/sim/text';
import { useState } from 'react';
import { bannerText, sceneText } from '../../model/effects.ts';
import type { Beat } from '../../model/timeline.ts';

export interface BeatOverlayProps {
  /** A batida cuja faixa vale agora (`bannerBeatAt`), ou `null`: o texto vem dela. */
  bannerBeat: Beat | null;
  /** A camada da faixa está no ar (decidido pelo `useBeatPlayer`, pela trava de flash). */
  banner: boolean;
  /** A cena que o painel mostra (a de agora, ou a última enquanto a cortina segura). */
  scene: Beat | null;
  /** A cortina escura está no ar (decidido pelo `useBeatPlayer`). */
  curtain: boolean;
  names: Names;
  reduced: boolean;
}

/** A sobreposição da batida de agora: cena, faixa, ou nada (as camadas ficam, só esmaecem). */
export function BeatOverlay({ bannerBeat, banner, scene, curtain, names, reduced }: BeatOverlayProps) {
  // A trava pode segurar a faixa no ar depois da batida dela: fica o texto da última que passou.
  const text = bannerBeat === null ? null : bannerText(bannerBeat.event, names);
  const [last, setLast] = useState<string | null>(text);
  if (text !== null && text !== last) setLast(text);
  return (
    <>
      <SceneLayer scene={scene} curtain={curtain} names={names} reduced={reduced} />
      <BannerLayer text={banner ? (text ?? last) : null} />
    </>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 24 26" aria-hidden="true" className="mx-auto mb-2 size-12 text-ouro pc:size-16">
      <path
        d="M12 1 L22 4.5 V13 C22 19 17.5 23.5 12 25 C6.5 23.5 2 19 2 13 V4.5 Z"
        fill="currentColor"
        stroke="var(--color-papel)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function SceneLayer({
  scene,
  curtain,
  names,
  reduced,
}: {
  scene: Beat | null;
  curtain: boolean;
  names: Names;
  reduced: boolean;
}) {
  // O painel fica montado depois da primeira cena e só esmaece (150 ms), com o texto da última enquanto some: sem troca
  // brusca de luminância, e o esmaecimento é o que o movimento reduzido mantém (texto parado que aparece e some).
  const [last, setLast] = useState<Beat | null>(scene);
  if (scene !== null && scene !== last) setLast(scene);
  const shown = scene ?? last;
  const { title, detail } = shown === null ? { title: '', detail: '' } : sceneText(shown, names);
  const reflect = shown?.scene === 'REFLECT_PLAYED' || shown?.scene === 'REFLECT_TRIGGERED';
  return (
    <div
      aria-hidden="true"
      data-camada-cena
      data-cena={scene?.scene ?? undefined}
      data-reduzido={reduced ? 'true' : undefined}
      className="pointer-events-none absolute inset-0 z-50 grid place-items-center px-4"
    >
      <div
        data-cortina
        data-ativa={curtain ? 'true' : undefined}
        className={`absolute inset-0 bg-tinta/60 transition-opacity duration-150 ${curtain ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Sempre montado: até o primeiro aparecer é um esmaecimento, não um pulo de opacidade. */}
      <div
        data-painel-cena
        data-ativo={scene === null ? undefined : 'true'}
        className={`relative border-[5px] border-papel bg-tinta px-6 py-4 text-center text-papel transition-opacity duration-150 ${scene === null ? 'opacity-0' : 'opacity-100'}`}
      >
        {reflect ? <Shield /> : null}
        <p className="textura font-madeira text-4xl uppercase leading-none pc:text-6xl">{title}</p>
        {detail ? <p className="mt-2 text-base font-bold pc:text-xl">{detail}</p> : null}
      </div>
    </div>
  );
}

function BannerLayer({ text }: { text: string | null }) {
  return (
    <div
      aria-hidden="true"
      data-camada-faixa
      data-faixa={text ?? undefined}
      className={`pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 border-y-4 border-ouro bg-tinta px-3 py-2 text-center transition-opacity duration-150 ${text === null ? 'opacity-0' : 'opacity-100'}`}
    >
      {text === null ? null : (
        <p className="font-madeira text-2xl uppercase leading-tight text-ouro pc:text-3xl">{text}</p>
      )}
    </div>
  );
}
