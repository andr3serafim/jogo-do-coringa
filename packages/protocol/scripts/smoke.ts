/**
 * Smoke do Node puro: carrega o protocolo sem bundler nem loader (type stripping do Node 24),
 * valida um `hello` e um `act` e checa o código da sala. Roda no `pnpm check`.
 */
import { generateCode, normalizeCode, PROTOCOL_VERSION } from '../src/index.ts';
import { parseClientMessage } from '../src/schemas.ts';

const token = 'A'.repeat(43);
const hello = parseClientMessage(JSON.stringify({ t: 'hello', protocol: PROTOCOL_VERSION, token }));
if (hello?.t !== 'hello') throw new Error('hello válido foi recusado');

const act = parseClientMessage(JSON.stringify({ t: 'act', id: 'a1', epoch: 0, action: { type: 'PASS' } }));
if (act?.t !== 'act') throw new Error('act válido foi recusado');

if (parseClientMessage(JSON.stringify({ t: 'act', id: 'a1', epoch: 0, action: { type: 'TIMEOUT' } })) !== null)
  throw new Error('TIMEOUT do cliente deveria ser recusado');

const code = generateCode((n) => crypto.getRandomValues(new Uint8Array(n)));
if (normalizeCode(code) !== code) throw new Error(`código gerado inválido: ${code}`);

console.log('smoke do protocolo ok');
