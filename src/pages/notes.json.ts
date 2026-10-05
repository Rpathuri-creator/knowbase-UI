// Static "UI pack": every note as JSON, read by side panels, graph and review.
import { loadNotes } from '../lib/knowledge';

export function GET() {
  return new Response(JSON.stringify(loadNotes()), {
    headers: { 'Content-Type': 'application/json' },
  });
}
