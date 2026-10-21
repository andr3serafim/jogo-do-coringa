// Os recursos do Motion que a mesa usa, carregados sob demanda (`LazyMotion`, spec §12): o `layoutId` das cartas pede
// o recurso `layout`, que só vem no `domMax` (o `domAnimation` não tem). O `import()` do `Stage` põe isto num pedaço
// à parte, fora dos 200 KB do JavaScript inicial.
export { domMax as default } from 'motion/react';
