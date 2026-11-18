// Fontes servidas pelo próprio site, só com o subconjunto latino (spec §10.2): o Vite copia os woff2 para o dist,
// e nada vem do Google em tempo de execução. O Archivo variável não traz CSS por subconjunto; a face latina é
// declarada em `fonts.css`, apontando para o arquivo do pacote.
import '@fontsource/alfa-slab-one/latin.css';
import './fonts.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { loadIntro } from './ui/intro/intro-loader.ts';

// Abrindo no Início, o pedaço da abertura já sai agora, antes do primeiro desenho: a capa escura dura menos. Se ele falhar, o `App` tenta
// de novo e abre o menu.
if (window.location.pathname === '/') loadIntro().catch(() => undefined);

const root = document.getElementById('root');
if (!root) throw new Error('o index.html não tem o elemento #root');

createRoot(root).render(
  <StrictMode>
    <App intro />
  </StrictMode>,
);
