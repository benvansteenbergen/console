import { mutate } from 'swr';

export interface ScoutEvent {
  type: 'tool_call';
  name: string;
  args: Record<string, unknown>;
}

export interface ScoutResponse {
  session_id: string;
  scout_id?: string | null;
  is_new_scout?: boolean;
  topic_name?: string;
  message: string;
  done: boolean;
  events?: ScoutEvent[];
}

const startsWith = (prefix: string) => (key: unknown) =>
  typeof key === 'string' && key.startsWith(prefix);

/**
 * Process events from a Scout response and trigger SWR revalidations.
 * Called after each Scout API round-trip.
 */
export function dispatchScoutEvents(events: ScoutEvent[] | undefined) {
  if (!events || events.length === 0) return;

  let revalidateSources = false;
  let revalidatePriorities = false;

  for (const event of events) {
    if (event.type !== 'tool_call') continue;

    switch (event.name) {
      case 'proposeSource':
      case 'dropSource':
      case 'followSource':
        revalidateSources = true;
        break;
      case 'updatePriorities':
        revalidatePriorities = true;
        break;
    }
  }

  // Keys carry a scout_id, so revalidate by prefix rather than by exact key.
  if (revalidateSources) {
    mutate(startsWith('/api/radar/sources'));
    mutate(startsWith('/api/radar/scouts'));
  }

  if (revalidatePriorities) {
    mutate(startsWith('/api/radar/priorities'));
    mutate(startsWith('/api/radar/scouts'));
  }
}
