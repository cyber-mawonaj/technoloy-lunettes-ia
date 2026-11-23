<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    Activity,
    Bell,
    ChevronDown,
    ChevronUp,
    Cpu,
    Eye,
    Layers,
    RotateCcw,
  } from 'lucide-svelte';
  import { POSTER_COMPONENTS } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import { GlassesSceneController, type CameraPresetKey } from '../../lib/three/GlassesScene';
  import { playBuzzerTone } from '../../lib/utils/audio';

  interface Props {
    selectedPart?: string;
    explodeFactor?: number;
    arOverlay?: boolean;
    onSelectPart?: (partKey: string) => void;
  }

  let {
    selectedPart = appState.selected3DPart,
    explodeFactor = appState.explodeFactor,
    arOverlay = appState.arOverlay,
    onSelectPart,
  }: Props = $props();

  let mountEl: HTMLDivElement | undefined = $state();
  let controller: GlassesSceneController | null = null;
  let dockCollapsed = $state(false);
  let contextLost = $state(false);
  let activePreset = $state<CameraPresetKey>('ensemble');

  // Keep reactive bindings synchronized with appState when props aren't overridden
  const currentSelectedPart = $derived(selectedPart ?? appState.selected3DPart);
  const currentExplodeFactor = $derived(explodeFactor ?? appState.explodeFactor);
  const currentArOverlay = $derived(arOverlay ?? appState.arOverlay);

  const selectedSpec = $derived(
    POSTER_COMPONENTS.find((c) => c.threeTarget === currentSelectedPart) ?? null,
  );

  onMount(() => {
    if (!mountEl) return;
    controller = new GlassesSceneController(mountEl, {
      onSelectPart: (partKey) => {
        appState.selected3DPart = partKey;
        onSelectPart?.(partKey);
        const found = POSTER_COMPONENTS.find((c) => c.threeTarget === partKey);
        if (found) {
          appState.showToast(`Composant sélectionné : ${found.name} (${found.bus})`, 'info');
        }
      },
      onContextLost: (lost) => {
        contextLost = lost;
      },
    });
    controller.setTheme(appState.theme === 'dark');

    appState.registerSnapshotCapturer('three', () => {
      return controller ? controller.captureSnapshot() : '';
    });

    const initialSnapTimer = window.setTimeout(() => {
      if (controller) {
        const snap = controller.captureSnapshot();
        if (snap) appState.threeSnapshotUrl = snap;
        const explodedSnap = controller.captureExplodedSnapshot();
        if (explodedSnap) appState.threeExplodedSnapshotUrl = explodedSnap;
      }
    }, 350);

    return () => {
      window.clearTimeout(initialSnapTimer);
    };
  });

  onDestroy(() => {
    if (controller) {
      try {
        const snap = controller.captureSnapshot();
        if (snap) appState.threeSnapshotUrl = snap;
        const explodedSnap = controller.captureExplodedSnapshot();
        if (explodedSnap) appState.threeExplodedSnapshotUrl = explodedSnap;
      } catch {
        // Ignore if context already lost
      }
    }
    appState.unregisterSnapshotCapturer('three');
    controller?.dispose();
    controller = null;
  });

  // Sync live hardware state (LED / Alert / OLED HUD) into the 3D PBR scene
  $effect(() => {
    if (!controller) return;
    const ledOn = appState.isLedActive;
    const alertOn = appState.isConditionTriggered && !appState.hasElectricalError;
    const mode = appState.ihModeLabel;
    const detail =
      appState.labScenario === '5e'
        ? `LUX: ${appState.luxValue} / ${appState.activeThreshold}`
        : `DIST: ${appState.distValue} cm`;
    controller.setLiveHardwareState(ledOn, alertOn, mode, detail);
  });

  $effect(() => {
    controller?.setExplodeFactor(currentExplodeFactor);
  });

  $effect(() => {
    controller?.setShowFlows(appState.showEnergyFlows3D);
  });

  $effect(() => {
    controller?.setIsolateElectronics(appState.isolateElectronics3D);
  });

  $effect(() => {
    controller?.setTheme(appState.theme === 'dark');
  });

  function setAssembled() {
    appState.viewMode3D = 'assembled';
    appState.explodeFactor = 0;
  }

  function setExploded() {
    appState.viewMode3D = 'exploded';
    appState.explodeFactor = 1;
  }

  function handleExplodeSlider(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    appState.explodeFactor = val;
    appState.viewMode3D = val > 0.15 ? 'exploded' : 'assembled';
  }

  function zoomPreset(preset: CameraPresetKey) {
    activePreset = preset;
    controller?.setCameraPreset(preset);
  }

  function resetCamera() {
    appState.selected3DPart = 'ensemble';
    activePreset = 'ensemble';
    controller?.setCameraPreset('ensemble');
  }

  function triggerAlert3D() {
    controller?.triggerAlertBurst();
    playBuzzerTone(2200, 260, appState.ebepMode);
    appState.showToast('Signal d’alerte visuelle et sonore envoyé aux lunettes 3D.', 'info');
  }

  export function focusComponent(target: string, preset: CameraPresetKey) {
    appState.selected3DPart = target;
    activePreset = preset;
    controller?.setCameraPreset(preset);
    controller?.triggerAlertBurst();
  }
</script>

<div class="relative w-full h-[520px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 overflow-hidden select-none">
  <!-- Isolated Three.js WebGL Mount Container -->
  <div bind:this={mountEl} class="w-full h-full"></div>

  {#if contextLost}
    <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 text-white p-6 text-center">
      <p class="font-semibold text-base">Contexte WebGL interrompu</p>
      <p class="text-xs text-slate-300 mt-1">La vue 3D reprendra automatiquement dès la restauration du pilote graphique.</p>
    </div>
  {/if}

  <!-- Minimal Top-Left Spec Strip (no backdrop-filter over WebGL, uncluttered center) -->
  <div class="absolute top-3 left-3 z-10 pointer-events-none flex flex-col gap-1 max-w-sm">
    <div class="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-sm space-y-0.5">
      <div class="text-xs font-semibold text-slate-900 dark:text-slate-100">
        {selectedSpec ? `${selectedSpec.index}. ${selectedSpec.name}` : 'Prototype Lunettes Connectées IA'}
      </div>
      <div class="text-[11px] font-mono text-sky-700 dark:text-sky-400">
        {selectedSpec ? `${selectedSpec.bus} · ${selectedSpec.voltage}` : 'Cliquer sur un sous-ensemble pour l’inspecter'}
      </div>
      {#if selectedSpec}
        <div class="text-[11px] text-slate-600 dark:text-slate-300 leading-snug pt-0.5">
          {selectedSpec.placement}
        </div>
      {/if}
    </div>
  </div>

  <!-- Minimal Orbit Control Hint -->
  {#if !currentArOverlay}
    <div class="hidden sm:block absolute top-3 right-3 z-10 pointer-events-none">
      <div class="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-xs">
        Glisser : orbiter · Molette : zoomer · Clic droit : déplacer
      </div>
    </div>
  {/if}

  <!-- Optional Worker AR HUD Overlay (FPV simulation, solid/rgba surface, no backdrop-filter) -->
  {#if currentArOverlay}
    <div class="absolute inset-0 z-10 pointer-events-none p-4 flex flex-col justify-between border-2 border-sky-500/40 bg-slate-950/20">
      <div class="flex justify-between items-start font-mono text-[11px]">
        <div class="bg-slate-900/90 text-sky-300 px-3 py-2 rounded-lg border border-sky-500/40 space-y-0.5">
          <div class="font-semibold text-white">HUD OPÉRATEUR LOYALLE (FPV)</div>
          <div>MODE : {appState.ihModeLabel}</div>
          <div>
            {appState.labScenario === '5e'
              ? `LUMINOSITÉ : ${appState.luxValue} lux`
              : `OBSTACLE SIMULÉ : ${appState.distValue} cm`}
          </div>
          <div class="w-36 h-1.5 bg-slate-800 rounded overflow-hidden mt-1">
            <div
              class="h-full transition-all {appState.isConditionTriggered ? 'bg-rose-500' : 'bg-emerald-400'}"
              style="width: {appState.labScenario === '5e'
                ? `${Math.min(100, appState.luxValue)}%`
                : `${Math.max(8, Math.min(100, 100 - appState.distValue * 1.6))}%`}"
            ></div>
          </div>
        </div>
        <div class="bg-slate-900/90 text-slate-200 px-3 py-2 rounded-lg border border-sky-500/40 text-right tabular-nums">
          <div>BROKER : {appState.brokerIp}:1883</div>
          <div>ALIM : 5 V USB (Non EPI)</div>
          <div class="text-sky-300">{appState.showEnergyFlows3D ? 'FLUX ACTIFS' : 'PRISME OPTIQUE'}</div>
        </div>
      </div>

      <!-- Center Optical Reticle -->
      <div class="mx-auto flex flex-col items-center gap-1">
        <div
          class="w-28 h-16 rounded-lg border-2 flex items-center justify-center font-mono text-[11px] font-bold {appState.isConditionTriggered
            ? 'border-rose-500 bg-rose-950/40 text-rose-200'
            : 'border-sky-400/60 bg-slate-900/30 text-sky-200'}"
        >
          {appState.isConditionTriggered ? 'DANGER PROCHE' : 'CHAMP LIBRE'}
        </div>
      </div>

      <div class="mx-auto bg-slate-900/90 text-white px-4 py-1.5 rounded-lg border border-sky-500/40 font-mono text-xs font-semibold">
        {appState.isConditionTriggered
          ? 'ALERTE SEUIL DÉCLENCHÉE — VÉRIFIER ZONE DE TRAVAIL'
          : `TOPIC ACTIF : ${appState.topicBase}/ia -> RAS`}
      </div>
    </div>
  {/if}

  <!-- Collapsible Bottom Center Control Dock (Zero Viewport Occlusion) -->
  <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(920px,95%)] flex flex-col items-center">
    <button
      type="button"
      onclick={() => (dockCollapsed = !dockCollapsed)}
      class="flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-white/95 dark:bg-slate-900/95 border border-b-0 border-slate-300 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-sm cursor-pointer whitespace-nowrap"
    >
      {#if dockCollapsed}
        <ChevronUp class="w-3.5 h-3.5" /> Afficher les commandes 3D
      {:else}
        <ChevronDown class="w-3.5 h-3.5" /> Masquer les commandes
      {/if}
    </button>

    {#if !dockCollapsed}
      <div class="w-full bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <!-- Assembly / Exploded Slider -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={setAssembled}
            class="px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer {currentExplodeFactor <= 0.15
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            Assemblé
          </button>
          <button
            type="button"
            onclick={setExploded}
            class="px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 {currentExplodeFactor > 0.15
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            <Layers class="w-3.5 h-3.5" /> Éclaté
          </button>
          <label class="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 pl-1">
            <span>Écartement</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={currentExplodeFactor}
              oninput={handleExplodeSlider}
              aria-label="Facteur de vue éclatée"
              class="w-20 accent-sky-600 cursor-pointer"
            />
          </label>
        </div>

        <!-- Camera Presets -->
        <div class="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onclick={() => zoomPreset('ensemble')}
            class="px-2 py-1 rounded font-medium whitespace-nowrap cursor-pointer {activePreset === 'ensemble'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
          >
            Ensemble
          </button>
          <button
            type="button"
            onclick={() => zoomPreset('microbit')}
            class="px-2 py-1 rounded font-medium whitespace-nowrap cursor-pointer {activePreset === 'microbit'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
          >
            micro:bit
          </button>
          <button
            type="button"
            onclick={() => zoomPreset('jst')}
            class="px-2 py-1 rounded font-medium whitespace-nowrap cursor-pointer {activePreset === 'jst'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
          >
            Grove JST
          </button>
          <button
            type="button"
            onclick={() => zoomPreset('sensors')}
            class="px-2 py-1 rounded font-medium whitespace-nowrap cursor-pointer {activePreset === 'sensors'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
          >
            Capteurs
          </button>
          <button
            type="button"
            onclick={() => zoomPreset('camera')}
            class="px-2 py-1 rounded font-medium whitespace-nowrap cursor-pointer {activePreset === 'camera'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
          >
            OV2640
          </button>
          <button
            type="button"
            onclick={() => zoomPreset('oled')}
            class="px-2 py-1 rounded font-medium whitespace-nowrap cursor-pointer {activePreset === 'oled'
              ? 'bg-sky-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}"
          >
            Prisme AR
          </button>
          <button
            type="button"
            onclick={resetCamera}
            title="Réinitialiser la caméra"
            class="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- AR, Energy Flows, Isolation & Alert Actions -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onclick={() => (appState.showEnergyFlows3D = !appState.showEnergyFlows3D)}
            title="Visualiser les flux 5V (rouge) et données I2C/Signal (bleu)"
            class="px-2 py-1.5 rounded-md font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer {appState.showEnergyFlows3D
              ? 'bg-amber-500 text-slate-950'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            <Activity class="w-3.5 h-3.5" /> Flux
          </button>
          <button
            type="button"
            onclick={() => (appState.isolateElectronics3D = !appState.isolateElectronics3D)}
            title="Masquer la monture plastique pour inspecter l'électronique"
            class="px-2 py-1.5 rounded-md font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer {appState.isolateElectronics3D
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            <Cpu class="w-3.5 h-3.5" /> Électronique
          </button>
          <button
            type="button"
            onclick={() => (appState.arOverlay = !appState.arOverlay)}
            class="px-2.5 py-1.5 rounded-md font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer {currentArOverlay
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}"
          >
            <Eye class="w-3.5 h-3.5" /> Vision AR
          </button>
          <button
            type="button"
            onclick={triggerAlert3D}
            class="px-2.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <Bell class="w-3.5 h-3.5" /> Test Alerte
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
