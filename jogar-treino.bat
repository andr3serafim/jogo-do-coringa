@echo off
chcp 65001 >nul
setlocal
title Jogo do Coringa - Treino contra Bot
cd /d "%~dp0"

echo ====================================================
echo       Iniciando Jogo do Coringa (Modo Treino)
echo ====================================================
echo.

echo [1/3] Iniciando servidor backend (Wrangler / Cloudflare)...
start "Coringa - Backend" /min cmd /c "pnpm dev:server"

echo [2/3] Iniciando frontend web (Vite)...
start "Coringa - Web" /min cmd /c "pnpm dev:web"

echo [3/3] Aguardando servidores inicializarem...
timeout /t 3 /nobreak >nul

echo Abrindo o jogo no navegador em http://localhost:5173/treino ...
start "" "http://localhost:5173/treino"

echo.
echo ====================================================
echo  Jogo em execucao!
echo  - Partida de Treino: http://localhost:5173/treino
echo  - Pagina Inicial:    http://localhost:5173
echo.
echo  Pressione qualquer tecla nesta janela para PARAR
echo  todos os servidores e fechar o jogo.
echo ====================================================
pause >nul

echo.
echo Encerrando servidores...
taskkill /FI "WINDOWTITLE eq Coringa - Web*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Coringa - Backend*" /T /F >nul 2>&1
echo Concluido!
timeout /t 1 /nobreak >nul
