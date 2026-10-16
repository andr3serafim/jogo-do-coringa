import { DurableObject } from 'cloudflare:workers';

/** Casca do Durable Object da sala; a lógica chega nas próximas tarefas. */
export class Room extends DurableObject<Env> {}
