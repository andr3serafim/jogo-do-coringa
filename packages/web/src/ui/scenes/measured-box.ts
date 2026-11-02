// A caixa medida depois de a mesa assentar. O `state` que traz a cena muda a mesa no mesmo commit (a zona "Reflect ativo" entra ou sai, e os
// campos mudam de altura), e a caixa de antes, ou uma medida durante o render, veria a mesa velha: o espelho e o cometa sairiam dezenas de
// px fora da fileira (visto no navegador, 2026-11-02). A medida fica valendo para a cena inteira.
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { measureSceneBox, type SceneBox } from '../anim/scene-box.ts';

/** `anchor` vai num elemento da cena, dentro do palco; `measured` chega antes da pintura. Sem a mesa montada, vale a caixa que veio. */
export function useMeasuredBox(box: SceneBox): { anchor: RefObject<HTMLDivElement | null>; measured: SceneBox | null } {
  const anchor = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<SceneBox | null>(null);
  useLayoutEffect(() => {
    const read = () => {
      const palco = anchor.current?.closest<HTMLElement>('[data-palco]');
      setMeasured((palco ? measureSceneBox(palco) : null) ?? box);
    };
    read();
    // Só na montagem: a janela que muda de tamanho não recomeça o voo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { anchor, measured };
}
