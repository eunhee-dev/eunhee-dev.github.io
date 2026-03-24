import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  fontFamily: 'Lato, Verdana, Helvetica, sans-serif',
  flowchart: {
    htmlLabels: true,
    useMaxWidth: true,
    curve: 'linear',
    nodeSpacing: 24,
    rankSpacing: 38
  },
  themeVariables: {
    fontSize: '18px',
    primaryColor: '#f7f8f4',
    primaryTextColor: '#000000',
    primaryBorderColor: '#b7c4cf',
    lineColor: '#4c5f70',
    secondaryColor: '#eef3f7',
    tertiaryColor: '#fff8ec',
    clusterBkg: '#fbfbf8',
    clusterBorder: '#d4dde5'
  }
});

async function renderArchitectureDiagrams() {
  const nodes = Array.prototype.slice.call(
    document.querySelectorAll('.architecture-diagram .mermaid')
  );

  for (const node of nodes) {
    try {
      await mermaid.run({ nodes: [node] });
    } catch (error) {
      node.classList.add('mermaid-fallback');
      console.error('Failed to render Mermaid diagram.', error);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    void renderArchitectureDiagrams();
  });
} else {
  void renderArchitectureDiagrams();
}
