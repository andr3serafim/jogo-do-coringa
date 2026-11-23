# Cordel Escuro: as direções e a versão final

- `prancha-pc.png` e `prancha-celular.png`: a primeira versão (reprovada, `decisoes.md` 2026-11-23 (3)) e as direções A, B e C, também
  recusadas: fugiam da regra de o valor e o naipe terem o mesmo tamanho nos dois decks (`decisoes.md` 2026-11-23 (4)).
- `final-pc.png` e `final-celular.png`: a versão de (4), fundo `#2a2a2a` com grão e luz, vermelho `#e53935` com degradê no valor, a
  geometria do Cordel claro (você no escuro, o bot no claro, a fixture `especiais` na rodada 17).
- Os scripts (`direcoes.mjs`, `prancha.mjs`, `foto-escuro.mjs`) pedem o dev server da web (`pnpm dev:web`) e a fixture com as aparências
  em `packages/web/public/tmp-especiais.json` (a `e2e/fixtures/especiais.json` com `looks`; fora do git). Rodam com `node <script> <pasta>`.
