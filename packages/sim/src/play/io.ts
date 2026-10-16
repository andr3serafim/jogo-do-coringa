import { createInterface } from 'node:readline/promises';

/** Entrada e saída do jogo no terminal; os testes usam `scriptedIo` (stdin por pipe perde linhas no readline). */
export interface Io {
  ask(question: string): Promise<string>;
  print(text: string): void;
}

/** Quem joga saiu no meio da partida (Ctrl+C ou fim da entrada). */
export class QuitSignal extends Error {
  constructor() {
    super('partida interrompida');
    this.name = 'QuitSignal';
  }
}

/** Terminal de verdade. Ctrl+C ou fim da entrada viram `QuitSignal` na pergunta pendente. */
export function consoleIo(): Io & { close(): void } {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  let quit: (reason: QuitSignal) => void = () => {};
  const quitting = new Promise<never>((_, reject) => {
    quit = reject;
  });
  quitting.catch(() => {});
  rl.once('close', () => {
    closed = true;
    quit(new QuitSignal());
  });
  rl.on('SIGINT', () => rl.close());
  return {
    ask: async (q) => {
      if (closed) throw new QuitSignal();
      try {
        return await Promise.race([rl.question(q), quitting]);
      } catch (e) {
        if (closed) throw new QuitSignal();
        throw e;
      }
    },
    print: (t) => console.log(t),
    close: () => rl.close(),
  };
}

/** Respostas fixas, na ordem; acabar as respostas é erro (o teste pediu menos do que o jogo perguntou). */
export function scriptedIo(answers: string[] | ((question: string) => string)): Io & { output: string[] } {
  const output: string[] = [];
  let i = 0;
  return {
    output,
    ask: async (q) => {
      output.push(q);
      if (typeof answers === 'function') return answers(q);
      if (i >= answers.length) throw new Error(`respostas esgotadas na pergunta: ${q}`);
      return answers[i++];
    },
    print: (t) => output.push(t),
  };
}

/** Pergunta até receber um número entre 1 e `options.length`. Devolve o índice (base 0). */
export async function askChoice(io: Io, title: string, options: string[]): Promise<number> {
  io.print(`${title}\n${options.map((o, i) => `  ${String(i + 1).padStart(2)}) ${o}`).join('\n')}`);
  for (;;) {
    const answer = Number((await io.ask('> ')).trim());
    if (Number.isInteger(answer) && answer >= 1 && answer <= options.length) return answer - 1;
    io.print(`Digite um número de 1 a ${options.length}.`);
  }
}
