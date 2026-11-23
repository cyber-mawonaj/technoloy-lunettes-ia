<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    AlertTriangle,
    CheckCircle2,
    LayoutGrid,
    RotateCcw,
    Unplug,
    Zap,
    ZoomIn,
    ZoomOut,
  } from 'lucide-svelte';
  import { WiringBenchJointController } from '../../lib/joint/WiringBenchJoint';
  import { appState, getDefaultWires } from '../../lib/stores/appState.svelte';
  import { svgElementToPngDataUrl } from '../../lib/utils/pdfExport';

  let mountEl: HTMLDivElement | undefined = $state();
  let controller: WiringBenchJointController | null = null;
  let zoomLevel = $state(1);

  function buildLiveState() {
    return {
      wires: appState.wires,
      scenario: appState.labScenario,
      luxValue: appState.luxValue,
      distValue: appState.distValue,
      isLedActive: appState.isLedActive,
      isBuzzerActive: appState.isBuzzerActive,
      isOledActive: appState.isOledActive,
      buzzerFault: appState.buzzerFault,
      ihModeLabel: appState.ihModeLabel,
      isDark: appState.theme === 'dark',
    };
  }

  function handleConnect(fromPort: string, toModule: string, toPin: string) {
    const colorMap: Record<string, 'yellow' | 'red' | 'black' | 'blue'> = {
      P0: 'yellow',
      P1: 'yellow',
      P2: 'yellow',
      I2C: 'blue',
      '5V': 'red',
      GND: 'black',
    };

    const filtered = appState.wires.filter((w) => !(w.toModule === toModule && w.toPin === toPin));
    appState.wires = [
      ...filtered,
      {
        id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        fromPort,
        toModule,
        toPin,
        wireColor: colorMap[fromPort] ?? 'yellow',
      },
    ];

    if (toModule === 'buzzer' && fromPort === 'P2') {
      appState.buzzerFault = false;
    }
    appState.saveToStorage();
  }

  function handleRemoveWire(wireId: string) {
    appState.wires = appState.wires.filter((w) => w.id !== wireId);
    appState.saveToStorage();
  }

  function refreshSnapshot() {
    const svg = controller?.getSvgElement();
    if (!svg) return;
    svgElementToPngDataUrl(svg, 1040, 520)
      .then((url) => {
        if (url) appState.schematicSnapshotUrl = url;
      })
      .catch(() => {});
  }

  onMount(() => {
    if (!mountEl) return;
    controller = new WiringBenchJointController(
      mountEl,
      {
        onConnect: handleConnect,
        onRemoveWire: handleRemoveWire,
      },
      buildLiveState(),
    );

    appState.registerAsyncSnapshotCapturer('schematic', async () => {
      const svg = controller?.getSvgElement();
      if (!svg) return '';
      return svgElementToPngDataUrl(svg, 1040, 520);
    });

    const snapTimer = window.setTimeout(refreshSnapshot, 200);
    return () => {
      window.clearTimeout(snapTimer);
    };
  });

  onDestroy(() => {
    appState.unregisterSnapshotCapturer('schematic');
    controller?.destroy();
    controller = null;
  });

  // Synchronize reactive Svelte 5 state (wires, scenario, sensors, faults, theme) into JointJS canvas
  $effect(() => {
    const state = buildLiveState();
    // Explicitly track array mutations
    void state.wires.length;
    if (controller) {
      controller.syncState(state);
      refreshSnapshot();
    }
  });

  function toggleBuzzerFault() {
    appState.buzzerFault = !appState.buzzerFault;
  }

  function simulateShortCircuit() {
    appState.wires = [
      ...appState.wires.filter((w) => !(w.toModule === 'buzzer' && w.toPin === 'GND')),
      { id: 'w-err', fromPort: '5V', toModule: 'buzzer', toPin: 'GND', wireColor: 'red' },
    ];
    appState.saveToStorage();
    appState.showToast('Court-circuit 5V / GND injecté sur le banc JointJS.', 'error');
  }

  function resetWiring() {
    appState.buzzerFault = false;
    appState.wires = getDefaultWires(appState.labScenario);
    appState.saveToStorage();
  }

  function resetLayout() {
    if (!controller) return;
    controller.resetLayout();
    zoomLevel = controller.getZoom();
    refreshSnapshot();
  }

  function adjustZoom(delta: number) {
    if (!controller) return;
    zoomLevel = controller.setZoom(zoomLevel + delta);
  }
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
        Banc de Câblage Interactif JointJS — Routage Orthogonal & Détection d’Erreurs
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Glissez les modules sur la grille, tirez un fil directement d’un port magnétique à un autre (routage orthogonal automatique), ou cliquez sur un fil pour le retirer.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2 no-print">
      <button
        type="button"
        onclick={toggleBuzzerFault}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer {appState.buzzerFault
          ? 'bg-rose-600 border-rose-700 text-white'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}"
      >
        <Unplug class="w-3.5 h-3.5" />
        {appState.buzzerFault ? 'Rétablir Buzzer' : 'Panne Buzzer (5e S4)'}
      </button>

      <button
        type="button"
        onclick={simulateShortCircuit}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 text-xs font-semibold cursor-pointer"
      >
        <Zap class="w-3.5 h-3.5" />
        Tester erreur 5V/GND
      </button>

      <button
        type="button"
        onclick={resetWiring}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        Câblage conforme
      </button>

      <button
        type="button"
        onclick={resetLayout}
        title="Réaligner les modules sur leur position initiale"
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
      >
        <LayoutGrid class="w-3.5 h-3.5" />
        Réorganiser
      </button>

      <div class="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden">
        <button
          type="button"
          onclick={() => adjustZoom(-0.1)}
          title="Dézoomer"
          class="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <ZoomOut class="w-3.5 h-3.5" />
        </button>
        <span class="px-2 py-1 text-[11px] font-mono tabular-nums bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-x border-slate-200 dark:border-slate-700">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          type="button"
          onclick={() => adjustZoom(0.1)}
          title="Zoomer"
          class="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <ZoomIn class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>

  <!-- Electrical Diagnostics Readout (Dual-coded icon + text) -->
  <div class="space-y-2">
    {#each appState.electricalDiagnostics as diag}
      <div
        class="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-medium {diag.severity === 'error'
          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          : diag.severity === 'warning'
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'}"
      >
        {#if diag.severity === 'ok'}
          <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        {:else}
          <AlertTriangle class="w-4 h-4 {diag.severity === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'} shrink-0" />
        {/if}
        <span class="font-mono font-bold">[{diag.code}]</span>
        <span>{diag.message}</span>
      </div>
    {/each}
  </div>

  <!-- JointJS Interactive Orthogonal Circuit Canvas -->
  <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-x-auto p-2">
    <div bind:this={mountEl} class="mx-auto w-[900px] h-[456px] rounded-lg overflow-hidden select-none"></div>
  </div>

  <!-- Color Code Legend -->
  <div class="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-yellow-500 inline-block"></span> Signal Grove (P0 / P1 / P2)
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-sky-500 inline-block"></span> Bus I2C (OLED SDA/SCL)
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-emerald-500 inline-block"></span> Actionneur actif
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-orange-500 inline-block"></span> Bus / Polarité incompatible
    </span>
    <span class="inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
      <span class="w-4 h-1.5 rounded bg-rose-500 inline-block"></span> Court-circuit 5V / GND ou Panne fil
    </span>
  </div>
</section>
