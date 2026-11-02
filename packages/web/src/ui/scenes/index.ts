// A porta do chunk das cenas refeitas no sub-projeto 6 (§12): o mapa cena → desenho. Só entra por `loadScenes`
// (`ui/anim/scenes-loader.ts`); quem não está aqui segue com o painel de antes.
import type { SceneModule } from '../anim/scenes-loader.ts';
import { AbsoluteAttack } from './AbsoluteAttack.tsx';
import { AbsoluteDefense } from './AbsoluteDefense.tsx';
import { Devastation } from './Devastation.tsx';
import { Exodia } from './Exodia.tsx';
import { ReflectCanceled } from './ReflectCanceled.tsx';
import { ReflectPlayed } from './ReflectPlayed.tsx';
import { ReflectTriggered } from './ReflectTriggered.tsx';
import { Resurrection } from './Resurrection.tsx';

export const SCENES: SceneModule = {
  ABSOLUTE_ATTACK: AbsoluteAttack,
  ABSOLUTE_DEFENSE: AbsoluteDefense,
  EXODIA: Exodia,
  DEVASTATION: Devastation,
  DEVASTATION_CANCELED: Devastation,
  REFLECT_PLAYED: ReflectPlayed,
  REFLECT_TRIGGERED: ReflectTriggered,
  REFLECT_CANCELED: ReflectCanceled,
  RESURRECTED: Resurrection,
};
