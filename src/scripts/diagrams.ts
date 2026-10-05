import { cssVar } from './data';

type Mermaid = typeof import('mermaid').default;
let mermaidLib: Promise<Mermaid> | null = null;
let counter = 0;

function configure(m: Mermaid) {
  m.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    fontFamily: cssVar('--font-sans'),
    themeVariables: {
      fontSize: '15px',
      background: cssVar('--surface'),
      primaryColor: cssVar('--accent-soft'),
      primaryBorderColor: cssVar('--accent'),
      primaryTextColor: cssVar('--text'),
      secondaryColor: cssVar('--surface-2'),
      tertiaryColor: cssVar('--surface-2'),
      lineColor: cssVar('--muted'),
      textColor: cssVar('--text-2'),
      edgeLabelBackground: cssVar('--surface'),
      clusterBkg: cssVar('--surface-2'),
    },
    flowchart: { curve: 'basis', padding: 14, htmlLabels: true },
  });
}

/** Render every mermaid block inside root. Safe to call again after a theme change. */
export async function renderDiagrams(root: ParentNode = document) {
  const blocks = [...root.querySelectorAll<HTMLElement>('pre.mermaid')];
  if (!blocks.length) return;
  mermaidLib ??= import('mermaid').then((m) => m.default);
  const m = await mermaidLib;
  configure(m);
  for (const el of blocks) {
    const src = el.dataset.src || el.textContent || '';
    el.dataset.src = src;
    try {
      const { svg, bindFunctions } = await m.render(`mmd-${++counter}`, src);
      el.innerHTML = svg;
      el.setAttribute('data-processed', 'true');
      bindFunctions?.(el);
      if (src.includes('click ') && !el.parentElement?.querySelector('.diagram-hint')) {
        const hint = document.createElement('span');
        hint.className = 'diagram-hint';
        hint.textContent = 'Tap a highlighted box to open its note';
        el.after(hint);
      }
    } catch (err) {
      el.textContent = src;
      console.warn('Diagram failed to render', err);
    }
  }
}
