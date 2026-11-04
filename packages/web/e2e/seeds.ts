// Sementes do E2E que um teste de unidade também confere (sem o Playwright: o Vitest importa este arquivo).

/**
 * O treino em que a janela da Ressurreição (ponto 16) abre para o jogador cedo (rodada 4), jogando como o `playOnce`
 * (`helpers.ts`). Conferida por `test/model/resurrection-seed.test.ts`, que diz como procurar outra.
 */
export const RESURRECTION_E2E_SEED = 'e2e-quadra-36';
