import { createInterface } from 'node:readline/promises';

/** Entrada e saída do jogo no terminal; os testes usam `scriptedIo` (stdin por pipe perde linhas no readline). */
export interface Io {
  /** O `signal` cancela a pergunta pendente: a promessa rejeita com um `AbortError`. */
  ask(question: string, signal?: AbortSignal): Promise<string>;
  print(text: string): void;
  /** Resolve quando a entrada acaba (Ctrl+C ou fim do stdin), mesmo sem pergunta pendente. Só o terminal de verdade tem. */
  closed?: Promise<void>;
}

/** Quem joga saiu no meio da partida (Ctrl+C ou fim da entrada). */
export class QuitSignal extends Error {
  constructor() {
    super('partida interrompida');
    this.name = 'QuitSignal';
  }
}

/** A pergunta foi cancelada pelo `AbortSignal` (o `readline` e o `signal.throwIfAborted()` lançam erro com este nome). */
export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

/** Terminal de verdade. Ctrl+C ou fim da entrada viram `QuitSignal` na pergunta pendente. */
export function consoleIo(): Io & { closed: Promise<void>; close(): void } {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  let quit: (reason: QuitSignal) => void = () => {};
  let closedNow: () => void = () => {};
  const quitting = new Promise<never>((_, reject) => {
    quit = reject;
  });
  quitting.catch(() => {});
  const whenClosed = new Promise<void>((resolve) => {
    closedNow = resolve;
  });
  rl.once('close', () => {
    closed = true;
    quit(new QuitSignal());
    closedNow();
  });
  rl.on('SIGINT', () => rl.close());
  return {
    ask: async (q, signal) => {
      if (closed) throw new QuitSignal();
      try {
        return await Promise.race([rl.question(q, { signal }), quitting]);
      } catch (e) {
        if (closed) throw new QuitSignal();
        throw e;
      }
    },
    print: (t) => console.log(t),
    closed: whenClosed,
    close: () => rl.close(),
  };
}

/**
 * Respostas fixas, na ordem; acabar as respostas é erro (o teste pediu menos do que o jogo perguntou).
 * Com função, a resposta pode ser uma promessa (pergunta que fica pendente até o teste decidir); o `signal` a cancela.
 */
export function scriptedIo(answers: string[] | ((question: string) => string | Promise<string>)): Io & { output: string[] } {
  const output: string[] = [];
  let i = 0;
  return {
    output,
    ask: async (q, signal) => {
      signal?.throwIfAborted();
      output.push(q);
      if (typeof answers !== 'function') {
        if (i >= answers.length) throw new Error(`respostas esgotadas na pergunta: ${q}`);
        return answers[i++];
      }
      const answer = answers(q);
      if (typeof answer === 'string' || !signal) return answer;
      return new Promise<string>((resolve, reject) => {
        const onAbort = () => reject(signal.reason);
        signal.addEventListener('abort', onAbort, { once: true });
        answer.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
      });
    },
    print: (t) => output.push(t),
  };
}

/** Pergunta até receber um número entre 1 e `options.length`. Devolve o índice (base 0). */
export async function askChoice(io: Io, title: string, options: string[], signal?: AbortSignal): Promise<number> {
  signal?.throwIfAborted();
  io.print(`${title}\n${options.map((o, i) => `  ${String(i + 1).padStart(2)}) ${o}`).join('\n')}`);
  for (;;) {
    const answer = Number((await io.ask('> ', signal)).trim());
    if (Number.isInteger(answer) && answer >= 1 && answer <= options.length) return answer - 1;
    io.print(`Digite um número de 1 a ${options.length}.`);
  }
}
