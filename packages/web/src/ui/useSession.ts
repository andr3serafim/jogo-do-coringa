import { useCallback, useSyncExternalStore } from 'react';
import type { Session, SessionSnapshot } from '../model/session.ts';

/** O snapshot da sessão, redesenhando quando ele muda. Os dois callbacks ficam presos à sessão. */
export function useSession(session: Session): SessionSnapshot {
  const subscribe = useCallback((onChange: () => void) => session.subscribe(onChange), [session]);
  const getSnapshot = useCallback(() => session.snapshot(), [session]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
