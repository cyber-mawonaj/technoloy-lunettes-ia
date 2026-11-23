<script lang="ts">
  import cytoscape, { type Core } from 'cytoscape';
  import { onDestroy, onMount } from 'svelte';
  import { appState } from '../../lib/stores/appState.svelte';

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
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'font-weight': 'bold',
            'font-family': 'DM Sans, sans-serif',
            color: '#0f172a',
            width: '155px',
            height: '44px',
            'border-width': 2,
            'border-color': '#64748b',
            'background-color': '#ffffff',
          },
        },
        {
          selector: 'node[shape="ellipse"]',
          style: { shape: 'ellipse', 'background-color': '#e0f2fe', 'border-color': '#0284c7' },
        },
        {
          selector: 'node[shape="rhombus"]',
          style: {
            shape: 'diamond',
            width: '175px',
            height: '62px',
            'background-color': '#fef3c7',
            'border-color': '#d97706',
          },
        },
        {
          selector: 'node[shape="parallelogram"]',
          style: { shape: 'rhomboid', 'background-color': '#d1fae5', 'border-color': '#059669' },
        },
        {
          selector: 'edge',
          style: {
            width: 2.5,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            'font-weight': 'bold',
            color: '#475569',
            'text-background-color': '#f8fafc',
            'text-background-opacity': 1,
            'text-background-padding': '2px',
          },
        },
        {
          selector: '.active-node',
          style: {
            'background-color': '#059669',
            color: '#ffffff',
            'border-color': '#065f46',
            'border-width': 3.5,
          },
        },
        {
          selector: '.error-node',
          style: {
            'background-color': '#dc2626',
            color: '#ffffff',
            'border-color': '#991b1b',
            'border-width': 3.5,
          },
        },
        {
          selector: '.active-edge',
          style: {
            'line-color': '#059669',
            'target-arrow-color': '#059669',
            width: 4,
          },
        },
      ],
      elements: [
        { data: { id: 'start', label: 'DÉBUT', shape: 'ellipse' }, position: { x: 340, y: 42 } },
        { data: { id: 'read', label: 'Lire Capteur (P0)', shape: 'parallelogram' }, position: { x: 340, y: 120 } },
        { data: { id: 'test', label: 'Valeur < Seuil ?', shape: 'rhombus' }, position: { x: 340, y: 215 } },
        { data: { id: 'act_true', label: 'Activer LED / OLED / Buzzer', shape: 'rectangle' }, position: { x: 165, y: 315 } },
        { data: { id: 'act_false', label: 'Statut RAS / Veille', shape: 'rectangle' }, position: { x: 515, y: 315 } },
        { data: { id: 'fault', label: 'Défaut Câblage / Panne', shape: 'rectangle' }, position: { x: 165, y: 398 } },
        { data: { id: 'e1', source: 'start', target: 'read' } },
        { data: { id: 'e2', source: 'read', target: 'test' } },
        { data: { id: 'e3', source: 'test', target: 'act_true', label: 'OUI (Vrai)' } },
        { data: { id: 'e4', source: 'test', target: 'act_false', label: 'NON (Faux)' } },
        { data: { id: 'e5', source: 'act_true', target: 'fault', label: 'Si défaut fil' } },
      ],
      layout: { name: 'preset' },
      userZoomingEnabled: false,
      userPanningEnabled: false,
    });

    appState.registerSnapshotCapturer('logigramme', () => {
      if (!cy) return '';
      const wasDark = appState.theme === 'dark';
      if (wasDark) {
        cy.style()
          .selector('edge')
          .style({
            color: '#475569',
            'text-background-color': '#f8fafc',
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
          })
          .update();
      }
      const png = cy.png({ full: true, scale: 2, bg: '#ffffff' });
      if (wasDark) {
        cy.style()
          .selector('edge')
          .style({
            color: '#cbd5e1',
            'text-background-color': '#020617',
            'line-color': '#64748b',
            'target-arrow-color': '#64748b',
          })
          .update();
      }
      return png;
    });

    const onResize = () => {
      cy?.resize();
      cy?.fit(undefined, 20);
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
      .selector('edge')
      .style({
        color: isDark ? '#cbd5e1' : '#475569',
        'text-background-color': isDark ? '#020617' : '#f8fafc',
        'line-color': isDark ? '#64748b' : '#94a3b8',
        'target-arrow-color': isDark ? '#64748b' : '#94a3b8',
      })
      .update();
  });

  $effect(() => {
    if (!cy) return;
    const triggered = appState.isConditionTriggered;
    const hasErr = appState.hasElectricalError || appState.electronicGridShort;
    const scenario = appState.labScenario;
    const stepNode = appState.activeStepCyNode;

    cy.$('#read').data('label', scenario === '5e' ? 'Lire Luminosité (P0)' : 'Lire Distance (P0)');
    cy.$('#test').data('label', `Mesure < ${appState.activeThreshold} ?`);

    cy.elements().removeClass('active-node active-edge error-node');
    if (stepNode) {
      cy.$(`#${stepNode}`).addClass(stepNode === 'fault' ? 'error-node' : 'active-node');
      return;
    }

    cy.$('#start, #read, #test, #e1, #e2').addClass('active-node active-edge');

    if (hasErr) {
      cy.$('#fault').addClass('error-node');
    } else if (triggered) {
      cy.$('#act_true, #e3').addClass('active-node active-edge');
    } else {
      cy.$('#act_false, #e4').addClass('active-node active-edge');
    }
  });
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
        Logigramme Normalisé Réactif (Cytoscape.js)
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        La branche active est mise en évidence automatiquement selon les mesures et l’état du câblage.
      </p>
    </div>
    <div class="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
      <span>Ovale : Début</span>
      <span>·</span>
      <span>Parallélogramme : Capteur</span>
      <span>·</span>
      <span>Losange : Test SI</span>
    </div>
  </div>

  <div bind:this={containerEl} class="w-full h-[430px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"></div>
</section>
