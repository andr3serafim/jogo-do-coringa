// A medição das cenas (`e2e/medir-cena.ts`, onde está o uso): fora do `pnpm e2e` e da CI, porque a configuração padrão lista os arquivos que roda.
import base from './playwright.config.ts';

export default { ...base, projects: [{ ...base.projects![0]!, testMatch: ['medir-cena.ts'] }] };
