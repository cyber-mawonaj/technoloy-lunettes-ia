<script lang="ts">
  import cytoscape, { type Core } from 'cytoscape';
  import { onDestroy, onMount } from 'svelte';
  import { appState } from '../../lib/stores/appState.svelte';

  let { pulseTrigger = 0, pulseSource = 'esp32c3' }: { pulseTrigger?: number; pulseSource?: string } = $props();

  let containerEl: HTMLDivElement | undefined = $state();
  let cy: Core | null = null;

  onMount(() => {
    if (!containerEl) return;
    cy = cytoscape({
      container: containerEl,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'font-size': '11px',
            'font-weight': 'bold',
            'font-family': 'DM Sans, sans-serif',
            color: '#0f172a',
            width: '52px',
            height: '52px',
            'background-color': '#38bdf8',
            'border-width': 2.5,
            'border-color': '#0284c7',
          },
        },
        {
          selector: 'node[role="broker"]',
          style: {
            'background-color': '#10b981',
            'border-color': '#047857',
            width: '68px',
            height: '68px',
          },
        },
        {
          selector: 'node[role="nowifi"]',
          style: {
            'background-color': '#f59e0b',
            'border-color': '#b45309',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 2.2,
            'line-color': '#cbd5e1',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#94a3b8',
          },
        },
        {
          selector: '.pulse-edge',
          style: {
            'line-color': '#e11d48',
            'target-arrow-color': '#e11d48',
            width: 4.5,
          },
        },
      ],
      elements: [
        { data: { id: 'broker', label: `RPi 400 Broker\n(${appState.brokerIp})`, role: 'broker' }, position: { x: 400, y: 185 } },
        { data: { id: 'pc_prof', label: 'PC Enseignant (PuTTY / CMD)', role: 'client' }, position: { x: 145, y: 78 } },
        { data: { id: 'esp32c3', label: 'ESP32-C3 (Nœud préprogrammé)', role: 'client' }, position: { x: 655, y: 78 } },
        { data: { id: 'esp32cam', label: 'ESP32-CAM Stream (Préprogrammé)', role: 'client' }, position: { x: 655, y: 290 } },
        { data: { id: 'pico', label: 'Pico W Capteur (Préprogrammé)', role: 'client' }, position: { x: 400, y: 345 } },
        { data: { id: 'microbit', label: 'micro:bit V2\n(Cible blocs élèves · USB/Radio)', role: 'nowifi' }, position: { x: 145, y: 290 } },
        { data: { source: 'pc_prof', target: 'broker' } },
        { data: { source: 'esp32c3', target: 'broker' } },
        { data: { source: 'esp32cam', target: 'broker' } },
        { data: { source: 'pico', target: 'broker' } },
        { data: { source: 'microbit', target: 'pc_prof' } },
      ],
      layout: { name: 'preset' },
      userZoomingEnabled: false,
      userPanningEnabled: false,
    });

    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data() as { label: string; role: string };
      const cleanLabel = d.label.replace(/\n/g, ' ');
      appState.pushTerminalLog(
        `Nœud inspecté : ${cleanLabel} · Rôle : ${d.role.toUpperCase()} · Ports : MQTT 1883 / WS 9001`,
        'info',
      );
      appState.showToast(`${cleanLabel} (${d.role.toUpperCase()})`, 'info');
    });

    appState.registerSnapshotCapturer('network', () => {
      if (!cy) return '';
      const wasDark = appState.theme === 'dark';
      if (wasDark) {
        cy.style().selector('node').style({ color: '#0f172a' }).update();
      }
      const png = cy.png({ full: true, scale: 2, bg: '#ffffff' });
      if (wasDark) {
        cy.style().selector('node').style({ color: '#f1f5f9' }).update();
      }
      return png;
    });

    const onResize = () => {
      cy?.resize();
      cy?.fit(undefined, 24);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
    };
  });

  onDestroy(() => {
    cy?.destroy();
    cy = null;
  });

  $effect(() => {
    if (!cy) return;
    const isDark = appState.theme === 'dark';
    cy.style()
      .selector('node')
      .style({ color: isDark ? '#f1f5f9' : '#0f172a' })
      .selector('edge')
      .style({
        'line-color': isDark ? '#475569' : '#cbd5e1',
        'target-arrow-color': isDark ? '#64748b' : '#94a3b8',
      })
      .update();
  });

  $effect(() => {
    if (!cy) return;
    cy.$('#broker').data('label', `RPi 400 Broker\n(${appState.brokerIp})`);
  });

  $effect(() => {
    if (!cy || pulseTrigger === 0) return;
    const edges = cy.$(`edge[source="${pulseSource}"]`);
    edges.addClass('pulse-edge');
    const timer = window.setTimeout(() => edges.removeClass('pulse-edge'), 900);
    return () => window.clearTimeout(timer);
  });
</script>

<div bind:this={containerEl} class="w-full h-[420px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
