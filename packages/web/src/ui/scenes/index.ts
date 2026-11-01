// A porta do chunk das cenas refeitas no sub-projeto 6 (§12): o mapa cena → desenho. Só entra por `loadScenes`
// (`ui/anim/scenes-loader.ts`); quem não está aqui segue com o painel de antes.
import type { SceneModule } from '../anim/scenes-loader.ts';
import { AbsoluteAttack } from './AbsoluteAttack.tsx';
import { AbsoluteDefense } from './AbsoluteDefense.tsx';
import { Devastation } from './Devastation.tsx';
import { Exodia } from './Exodia.tsx';

export const SCENES: SceneModule = {
  ABSOLUTE_ATTACK: AbsoluteAttack,
  ABSOLUTE_DEFENSE: AbsoluteDefense,
  EXODIA: Exodia,
  DEVASTATION: Devastation,
  DEVASTATION_CANCELED: Devastation,
};
