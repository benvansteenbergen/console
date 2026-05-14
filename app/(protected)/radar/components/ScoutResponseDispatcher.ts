import { mutate } from 'swr';

export interface ScoutEvent {
  type: 'tool_call';
  name: string;
  args: Record<string, unknown>;
}

export interface ScoutResponse {
  session_id: string;
  message: string;
  done: boolean;
  events?: ScoutEvent[];
}

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

  if (revalidateSources) {
    mutate('/api/radar/sources?status=proposed');
    mutate('/api/radar/sources?status=followed');
    mutate('/api/radar/sources?status=naylisted');
  }

  if (revalidatePriorities) {
    mutate('/api/radar/priorities');
  }
}
