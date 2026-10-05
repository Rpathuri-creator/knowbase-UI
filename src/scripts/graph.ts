// Knowledge graph: every note is a node, every [[link]] an edge.
import { cssVar, getNotes, isMobile, noteUrl } from './data';
import { openNote } from './panels';

let cy: any = null;

function style() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': cssVar('--muted'),
        label: 'data(label)',
        color: cssVar('--text-2'),
        'font-family': cssVar('--font-sans'),
        'font-size': 12,
        'text-valign': 'bottom',
        'text-margin-y': 6,
        width: 'data(size)',
        height: 'data(size)',
        'border-width': 2,
        'border-color': cssVar('--page'),
      },
    },
    { selector: 'node[status = "lesson"]', style: { 'background-color': cssVar('--accent'), color: cssVar('--text'), 'font-weight': 600, 'font-size': 13 } },
    { selector: 'edge', style: { width: 1.2, 'line-color': cssVar('--border-strong'), 'curve-style': 'bezier', opacity: 0.9 } },
    { selector: 'node:active, node.hover', style: { 'overlay-opacity': 0, 'border-color': cssVar('--accent'), 'border-width': 3 } },
    { selector: '.faded', style: { opacity: 0.2 } },
  ];
}

export async function initGraph() {
  const el = document.getElementById('graph');
  if (!el) return;
  const [{ default: cytoscape }, notes] = await Promise.all([import('cytoscape'), getNotes()]);
  const degree = new Map<string, number>();
  notes.forEach((n) => n.links.forEach((l) => {
    degree.set(n.slug, (degree.get(n.slug) || 0) + 1);
    degree.set(l, (degree.get(l) || 0) + 1);
  }));
  const seen = new Set<string>();
  const edges = notes.flatMap((n) => n.links.map((l) => {
    const key = [n.slug, l].sort().join('|');
    if (seen.has(key)) return null;
    seen.add(key);
    return { data: { id: key, source: n.slug, target: l } };
  })).filter(Boolean);

  cy = cytoscape({
    container: el,
    elements: [
      ...notes.map((n) => ({ data: { id: n.slug, label: n.title, status: n.status, size: 14 + (degree.get(n.slug) || 0) * 4 } })),
      ...(edges as any[]),
    ],
    style: style() as any,
    layout: { name: 'cose', animate: false, padding: 40, nodeRepulsion: () => 9000, idealEdgeLength: () => 90 },
    minZoom: 0.4,
    maxZoom: 2.5,
  });

  cy.on('mouseover', 'node', (e: any) => {
    const n = e.target;
    cy.elements().addClass('faded');
    n.closedNeighborhood().removeClass('faded');
    n.addClass('hover');
    el.style.cursor = 'pointer';
  });
  cy.on('mouseout', 'node', () => { cy.elements().removeClass('faded hover'); el.style.cursor = ''; });
  cy.on('tap', 'node', (e: any) => {
    const slug = e.target.id();
    if (el.dataset.mini !== undefined && !isMobile()) window.location.href = noteUrl(slug);
    else openNote(slug, null);
  });
}

export function restyleGraph() { cy?.style(style()); }
