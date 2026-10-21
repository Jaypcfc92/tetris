import type { EngineEvent, EngineEventMap } from "./types";

type Handler<E extends EngineEvent> = (payload: EngineEventMap[E]) => void;

/**
 * Minimal typed pub/sub used by the engine to report what happened.
 * Subscribers (the Phaser controller) receive plain events and never
 * reach into engine internals.
 */
export class TypedEmitter {
  private readonly handlers = new Map<EngineEvent, Set<Handler<EngineEvent>>>();

  on<E extends EngineEvent>(event: E, handler: Handler<E>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<EngineEvent>);
    return () => {
      set.delete(handler as Handler<EngineEvent>);
    };
  }

  emit<E extends EngineEvent>(event: E, payload: EngineEventMap[E]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      (handler as Handler<E>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
