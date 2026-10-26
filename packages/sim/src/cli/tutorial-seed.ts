/**
 * `pnpm sim:tutorial`: procura a semente do tutorial (job à parte, nunca entra no `pnpm check`). Percorre `tutorial-0`,
 * `tutorial-1`, … e imprime a primeira que cumpre o critério (J, Q, K e A até o 2º Equipar, o Selvagem até o 3º e K + J + Q até
 * o 3º), com a distribuição. A constante `TUTORIAL_SEED` (`src/tutorial-seed.ts`) tem que ser essa; o teste confere.
 */
import { meetsTutorialCriterion, TUTORIAL_SEED, tutorialDeal, tutorialSeedAt } from '../tutorial-seed.ts';
import { parseArgs, positiveInt } from './args.ts';

const { values } = parseArgs({ options: { limite: { type: 'string' } } });
const limit = positiveInt(values.limite ?? '100000', '--limite');

for (let index = 0; index < limit; index += 1) {
  const seed = tutorialSeedAt(index);
  const result = tutorialDeal(seed);
  if (!meetsTutorialCriterion(result)) continue;
  console.log(`semente: ${seed} (a ${index + 1}ª candidata)`);
  console.log(`especial → Equipar em que p1 o recebe: ${JSON.stringify(result.firstEquipWithSpecial)}`);
  console.log(`K + J + Q juntos no Equipar: ${result.reflectByEquip}`);
  console.log(seed === TUTORIAL_SEED ? 'TUTORIAL_SEED já é esta.' : `TUTORIAL_SEED (src/tutorial-seed.ts) é "${TUTORIAL_SEED}": troque por "${seed}".`);
  process.exit(seed === TUTORIAL_SEED ? 0 : 1);
}
console.error(`nenhuma das ${limit} primeiras sementes cumpre o critério; aumente --limite`);
process.exit(1);
