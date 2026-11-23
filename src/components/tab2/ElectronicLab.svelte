<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { AlertTriangle, CheckCircle2, Eraser, RotateCcw, Zap } from 'lucide-svelte';
  import { appState } from '../../lib/stores/appState.svelte';
  import { svgElementToPngDataUrl } from '../../lib/utils/pdfExport';

  type PinId =
    | 'bat_vcc'
    | 'bat_gnd'
    | 'sensor_vcc'
    | 'sensor_sig'
    | 'sensor_gnd'
    | 'led_anode'
    | 'led_cathode';

  interface PinDef {
    id: PinId;
    label: string;
    role: 'vcc' | 'gnd' | 'sig';
    x: number;
    y: number;
  }

  interface GridPoint {
    x: number;
    y: number;
  }

  interface GridWire {
    id: string;
    from: PinId;
    to: PinId;
    waypoints: GridPoint[];
  }

  const GRID_STEP = 20;

  const PINS: PinDef[] = [
    { id: 'bat_vcc', label: '+5V', role: 'vcc', x: 180, y: 140 },
    { id: 'bat_gnd', label: 'GND', role: 'gnd', x: 180, y: 260 },
    { id: 'sensor_vcc', label: 'VCC', role: 'vcc', x: 360, y: 100 },
    { id: 'sensor_sig', label: 'SIG', role: 'sig', x: 500, y: 140 },
    { id: 'sensor_gnd', label: 'GND', role: 'gnd', x: 360, y: 220 },
    { id: 'led_anode', label: 'ANODE (+)', role: 'sig', x: 640, y: 140 },
    { id: 'led_cathode', label: 'CATHODE (-)', role: 'gnd', x: 640, y: 260 },
  ];

  const DEFAULT_CIRCUIT: GridWire[] = [
    { id: 'gw-1', from: 'bat_vcc', to: 'sensor_vcc', waypoints: [{ x: 260, y: 140 }, { x: 260, y: 100 }] },
    { id: 'gw-2', from: 'sensor_sig', to: 'led_anode', waypoints: [] },
    { id: 'gw-3', from: 'sensor_gnd', to: 'bat_gnd', waypoints: [{ x: 260, y: 220 }, { x: 260, y: 260 }] },
    { id: 'gw-4', from: 'led_cathode', to: 'bat_gnd', waypoints: [{ x: 560, y: 260 }, { x: 560, y: 320 }, { x: 220, y: 320 }, { x: 220, y: 260 }] },
  ];

  let wires = $state<GridWire[]>(DEFAULT_CIRCUIT.map((w) => ({ ...w, waypoints: [...w.waypoints] })));
  let activeStartPin = $state<PinId | null>(null);
  let draftWaypoints = $state<GridPoint[]>([]);
  let sensorTriggered = $state(true);
  let resistorEnabled = $state(true);
  let svgEl: SVGSVGElement | undefined = $state();

  function getPin(id: PinId): PinDef {
    return PINS.find((p) => p.id === id) ?? PINS[0];
  }

  function buildPolylinePoints(wire: GridWire): string {
    const start = getPin(wire.from);
    const end = getPin(wire.to);
    const pts = [start, ...wire.waypoints, end];
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

  function wireMidpoint(wire: GridWire): GridPoint {
    const start = getPin(wire.from);
    const end = getPin(wire.to);
    if (wire.waypoints.length > 0) {
      return wire.waypoints[Math.floor(wire.waypoints.length / 2)];
    }
    return {
      x: Math.round((start.x + end.x) / 2),
      y: Math.round((start.y + end.y) / 2),
    };
  }

  // Netlist graph analysis for short-circuit & polarity detection
  const analysis = $derived.by(() => {
    const adj = new Map<PinId, Set<PinId>>();
    for (const p of PINS) adj.set(p.id, new Set());
    for (const w of wires) {
      adj.get(w.from)?.add(w.to);
      adj.get(w.to)?.add(w.from);
    }

    const bfs = (start: PinId): Set<PinId> => {
      const visited = new Set<PinId>([start]);
      const queue: PinId[] = [start];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const nxt of adj.get(cur) ?? []) {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            queue.push(nxt);
          }
        }
      }
      return visited;
    };

    const vccNet = bfs('bat_vcc');
    const gndNet = bfs('bat_gnd');
    const sigNet = bfs('sensor_sig');

    // Direct or indirect short circuit: +5V net touches GND net, or LED shorted across itself
    const batShorted = vccNet.has('bat_gnd');
    const ledDirectShort = wires.some(
      (w) =>
        (w.from === 'led_anode' && w.to === 'led_cathode') ||
        (w.from === 'led_cathode' && w.to === 'led_anode'),
    );

    const shortWireIds = new Set<string>();
    const polarityWireIds = new Set<string>();

    for (const w of wires) {
      const a = getPin(w.from);
      const b = getPin(w.to);
      const touchesVcc = vccNet.has(w.from) || vccNet.has(w.to);
      const touchesGnd = gndNet.has(w.from) || gndNet.has(w.to);

      // Direct VCC-to-GND bridge anywhere or part of shorted net
      const directVccGnd =
        (a.role === 'vcc' && b.role === 'gnd') || (a.role === 'gnd' && b.role === 'vcc');

      if ((batShorted && touchesVcc && touchesGnd) || directVccGnd) {
        shortWireIds.add(w.id);
      } else if (
        ledDirectShort &&
        ((w.from === 'led_anode' && w.to === 'led_cathode') ||
          (w.from === 'led_cathode' && w.to === 'led_anode'))
      ) {
        shortWireIds.add(w.id);
      } else if (
        (vccNet.has(w.from) && a.role === 'gnd') ||
        (vccNet.has(w.to) && b.role === 'gnd') ||
        (gndNet.has(w.from) && a.role === 'vcc') ||
        (gndNet.has(w.to) && b.role === 'vcc')
      ) {
        polarityWireIds.add(w.id);
      }
    }

    const hasShortCircuit = shortWireIds.size > 0 || batShorted || ledDirectShort;
    const hasReversePolarity = polarityWireIds.size > 0;

    const sensorPowered = vccNet.has('sensor_vcc') && gndNet.has('sensor_gnd');
    const ledConnected =
      (sigNet.has('led_anode') || vccNet.has('led_anode')) && gndNet.has('led_cathode');
    const circuitComplete =
      !hasShortCircuit && !hasReversePolarity && sensorPowered && ledConnected;
    const ledLit = circuitComplete && (sensorTriggered || appState.isConditionTriggered);

    let status: 'short' | 'polarity' | 'ok' | 'open' = 'open';
    let headline = 'Circuit ouvert : reliez la batterie, le capteur et la LED sur la grille.';
    if (hasShortCircuit) {
      status = 'short';
      headline =
        'COURT-CIRCUIT DÉTECTÉ : le +5V est relié directement à la masse GND. Supprimez le fil rouge critique.';
    } else if (hasReversePolarity) {
      status = 'polarity';
      headline =
        'POLARITÉ INVERSÉE : une borne d’alimentation (+5V) ou de masse (GND) est inversée sur un composant.';
    } else if (circuitComplete) {
      status = 'ok';
      headline = ledLit
        ? 'Circuit conforme et alimenté : détection active, la LED s’allume sans court-circuit.'
        : 'Circuit conforme et alimenté : capteur au repos, la LED reste éteinte en veille.';
    }

    return {
      vccNet,
      gndNet,
      shortWireIds,
      polarityWireIds,
      hasShortCircuit,
      hasReversePolarity,
      circuitComplete,
      ledLit,
      status,
      headline,
    };
  });

  $effect(() => {
    appState.electronicGridShort = analysis.hasShortCircuit;
    appState.electronicGridValid = analysis.circuitComplete;
    appState.electronicGridResistorBypassed = !resistorEnabled;
    // Cache updated grid PNG snapshot whenever wiring changes
    if (svgEl) {
      const targetSvg = svgEl;
      void wires.length;
      void analysis.status;
      void analysis.ledLit;
      void resistorEnabled;
      svgElementToPngDataUrl(targetSvg, 1040, 470)
        .then((url) => {
          if (url) appState.labGridSnapshotUrl = url;
        })
        .catch(() => {});
    }
  });

  const multimeter = $derived.by(() => {
    if (analysis.hasShortCircuit) {
      return { voltage: '0.12 V', current: '> 2 500 mA (SURCHARGE)', stateLabel: 'COURT-CIRCUIT CRITIQUE', tone: 'rose' as const };
    }
    if (analysis.hasReversePolarity) {
      return { voltage: '-5.00 V', current: '0 mA (Bloqué)', stateLabel: 'POLARITÉ INVERSÉE', tone: 'amber' as const };
    }
    if (analysis.ledLit && !resistorEnabled) {
      return { voltage: '5.00 V', current: '145 mA (DANGER LED)', stateLabel: 'SANS RÉSISTANCE 220 Ω', tone: 'amber' as const };
    }
    if (analysis.ledLit) {
      return { voltage: '5.00 V', current: '18 mA (Nominal)', stateLabel: 'CIRCUIT ACTIF CONFORME', tone: 'emerald' as const };
    }
    if (analysis.circuitComplete) {
      return { voltage: '5.00 V', current: '2 mA (Veille capteur)', stateLabel: 'VEILLE CONFORME', tone: 'emerald' as const };
    }
    return { voltage: '5.00 V', current: '0 mA (Circuit ouvert)', stateLabel: 'CIRCUIT OUVERT', tone: 'slate' as const };
  });

  onMount(() => {
    appState.registerAsyncSnapshotCapturer('labGrid', async () => {
      if (!svgEl) return '';
      return svgElementToPngDataUrl(svgEl, 1040, 470);
    });
  });

  onDestroy(() => {
    appState.unregisterSnapshotCapturer('labGrid');
  });

  function wireStyle(wire: GridWire): { color: string; width: number; dashed: boolean; label: string } {
    if (analysis.shortWireIds.has(wire.id)) {
      return { color: '#ef4444', width: 5, dashed: true, label: 'COURT-CIRCUIT' };
    }
    if (analysis.polarityWireIds.has(wire.id)) {
      return { color: '#f97316', width: 4.5, dashed: true, label: 'POLARITÉ' };
    }
    const a = getPin(wire.from);
    const b = getPin(wire.to);
    if (a.role === 'vcc' || b.role === 'vcc' || analysis.vccNet.has(wire.from)) {
      return { color: '#dc2626', width: 3.5, dashed: false, label: '+5V' };
    }
    if (a.role === 'gnd' || b.role === 'gnd' || analysis.gndNet.has(wire.from)) {
      return { color: '#38bdf8', width: 3.5, dashed: false, label: 'GND' };
    }
    if (analysis.ledLit && (a.role === 'sig' || b.role === 'sig')) {
      return { color: '#10b981', width: 4, dashed: false, label: 'SIGNAL ACTIF' };
    }
    return { color: '#eab308', width: 3.5, dashed: false, label: 'SIG' };
  }

  function handlePinClick(pinId: PinId, e: MouseEvent) {
    e.stopPropagation();
    if (!activeStartPin) {
      activeStartPin = pinId;
      draftWaypoints = [];
      return;
    }
    if (activeStartPin === pinId) {
      activeStartPin = null;
      draftWaypoints = [];
      return;
    }
    const duplicate = wires.some(
      (w) =>
        (w.from === activeStartPin && w.to === pinId) ||
        (w.from === pinId && w.to === activeStartPin),
    );
    if (!duplicate) {
      wires = [
        ...wires,
        {
          id: `gw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          from: activeStartPin,
          to: pinId,
          waypoints: [...draftWaypoints],
        },
      ];
    }
    activeStartPin = null;
    draftWaypoints = [];
  }

  function handleGridClick(e: MouseEvent) {
    if (!activeStartPin || !svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const rawX = ((e.clientX - rect.left) / rect.width) * 840;
    const rawY = ((e.clientY - rect.top) / rect.height) * 380;
    const snappedX = Math.max(20, Math.min(820, Math.round(rawX / GRID_STEP) * GRID_STEP));
    const snappedY = Math.max(20, Math.min(360, Math.round(rawY / GRID_STEP) * GRID_STEP));
    draftWaypoints = [...draftWaypoints, { x: snappedX, y: snappedY }];
  }

  function removeWire(id: string, e: MouseEvent) {
    e.stopPropagation();
    wires = wires.filter((w) => w.id !== id);
  }

  function loadDefaultCircuit() {
    activeStartPin = null;
    draftWaypoints = [];
    wires = DEFAULT_CIRCUIT.map((w) => ({ ...w, waypoints: [...w.waypoints] }));
  }

  function injectShortCircuit() {
    activeStartPin = null;
    draftWaypoints = [];
    const withoutTest = wires.filter((w) => w.id !== 'gw-short');
    wires = [
      ...withoutTest,
      {
        id: 'gw-short',
        from: 'bat_vcc',
        to: 'bat_gnd',
        waypoints: [{ x: 100, y: 140 }, { x: 100, y: 260 }],
      },
    ];
  }

  function clearWires() {
    activeStartPin = null;
    draftWaypoints = [];
    wires = [];
  }
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
        Grille Électronique Interactive — Batterie, Capteur & LED
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Cliquez sur une borne puis sur la grille (points de passage optionnels) et sur une borne d’arrivée. Cliquez sur un fil pour le retirer.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2 no-print">
      <button
        type="button"
        onclick={() => (sensorTriggered = !sensorTriggered)}
        class="px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer {sensorTriggered
          ? 'bg-emerald-600 border-emerald-700 text-white'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}"
      >
        {sensorTriggered ? 'Capteur : Détection active' : 'Capteur : Au repos'}
      </button>
      <button
        type="button"
        onclick={() => (resistorEnabled = !resistorEnabled)}
        class="px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer {resistorEnabled
          ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-200'
          : 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200'}"
      >
        {resistorEnabled ? 'Résistance 220 Ω : Active' : 'Résistance 220 Ω : Court-circuitée'}
      </button>
      <button
        type="button"
        onclick={injectShortCircuit}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-rose-900 dark:text-rose-200 text-xs font-semibold cursor-pointer"
      >
        <Zap class="w-3.5 h-3.5" />
        Simuler court-circuit
      </button>
      <button
        type="button"
        onclick={loadDefaultCircuit}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        Montage conforme
      </button>
      <button
        type="button"
        onclick={clearWires}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
      >
        <Eraser class="w-3.5 h-3.5" />
        Tout effacer
      </button>
    </div>
  </div>

  <!-- Virtual Multimeter (Voltmeter / Ammeter) -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs tabular-nums">
    <div class="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <span class="text-slate-500 dark:text-slate-400 font-medium">Voltmètre (+5V / GND)</span>
      <span class="font-mono font-bold text-slate-900 dark:text-slate-100">{multimeter.voltage}</span>
    </div>
    <div class="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <span class="text-slate-500 dark:text-slate-400 font-medium">Ampèremètre (I)</span>
      <span class="font-mono font-bold {multimeter.tone === 'rose' ? 'text-rose-700 dark:text-rose-400' : multimeter.tone === 'amber' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}">{multimeter.current}</span>
    </div>
    <div class="px-3 py-2 rounded-lg border flex items-center justify-between {multimeter.tone === 'rose'
      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
      : multimeter.tone === 'amber'
        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        : multimeter.tone === 'emerald'
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}">
      <span class="font-medium">Protection</span>
      <span class="font-mono font-bold">{multimeter.stateLabel}</span>
    </div>
  </div>

  <!-- Live Diagnostic Status Bar -->
  <div
    class="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-xs font-medium {analysis.status === 'short'
      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
      : analysis.status === 'polarity'
        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        : analysis.status === 'ok'
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}"
  >
    {#if analysis.status === 'ok'}
      <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
    {:else if analysis.status === 'short' || analysis.status === 'polarity'}
      <AlertTriangle class="w-4 h-4 {analysis.status === 'short' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'} shrink-0" />
    {:else}
      <Zap class="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
    {/if}
    <span>{analysis.headline}</span>
    {#if activeStartPin}
      <span class="ml-auto font-mono font-bold text-sky-700 dark:text-sky-400">
        Câblage en cours depuis {activeStartPin}…
      </span>
    {/if}
  </div>

  <!-- Interactive SVG Snap Grid -->
  <div class="bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-x-auto">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <svg
      bind:this={svgEl}
      viewBox="0 0 840 380"
      onclick={handleGridClick}
      class="w-full h-auto min-w-[680px] select-none font-mono {activeStartPin ? 'cursor-crosshair' : 'cursor-default'}"
    >
      <defs>
        <pattern id="electronicLabGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1" />
          <circle cx="0" cy="0" r="1.2" fill="#334155" />
        </pattern>
        <radialGradient id="ledGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
          <stop offset="55%" stop-color="#eab308" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#eab308" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Grid Canvas -->
      <rect width="840" height="380" fill="#0f172a" rx="8" />
      <rect width="840" height="380" fill="url(#electronicLabGrid)" rx="8" />

      <!-- Component 1: Batterie 5V USB -->
      <g>
        <rect x="60" y="100" width="120" height="200" rx="10" fill="#1e293b" stroke="#475569" stroke-width="2" />
        <rect x="96" y="88" width="48" height="12" rx="3" fill="#64748b" />
        <text x="120" y="128" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">BATTERIE</text>
        <text x="120" y="146" fill="#94a3b8" font-size="10" text-anchor="middle">5 V USB</text>
        <text x="120" y="205" fill={analysis.hasShortCircuit ? '#f87171' : '#38bdf8'} font-size="11" font-weight="bold" text-anchor="middle">
          {analysis.hasShortCircuit ? 'SURCHARGE !' : '5.0 V DC'}
        </text>
      </g>

      <!-- Component 2: Capteur (Luminosité / Distance) -->
      <g>
        <rect
          x="360"
          y="70"
          width="140"
          height="180"
          rx="10"
          fill="#1e293b"
          stroke={sensorTriggered ? '#38bdf8' : '#475569'}
          stroke-width="2"
        />
        <text x="430" y="96" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">CAPTEUR</text>
        <text x="430" y="114" fill="#94a3b8" font-size="10" text-anchor="middle">
          {appState.labScenario === '5e' ? 'Luminosité' : 'Ultrason'}
        </text>
        <circle
          cx="430"
          cy="160"
          r="20"
          fill={sensorTriggered ? '#0284c7' : '#0f172a'}
          stroke="#38bdf8"
          stroke-width="2"
        />
        <text x="430" y="164" fill="#f8fafc" font-size="10" font-weight="bold" text-anchor="middle">
          {sensorTriggered ? 'ACTIF' : 'VEILLE'}
        </text>
      </g>

      <!-- Component 3: LED Blanche + Résistance -->
      <g>
        <rect
          x="640"
          y="100"
          width="140"
          height="200"
          rx="10"
          fill="#1e293b"
          stroke={analysis.ledLit ? '#fde047' : '#475569'}
          stroke-width={analysis.ledLit ? 2.5 : 2}
        />
        <text x="710" y="128" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">LED 5 mm</text>
        <text x="710" y="146" fill="#94a3b8" font-size="10" text-anchor="middle">+ Rés. 220 Ω</text>

        {#if analysis.ledLit}
          <circle cx="710" cy="200" r="42" fill="url(#ledGlowGrad)" />
        {/if}
        <circle
          cx="710"
          cy="200"
          r="18"
          fill={analysis.ledLit ? '#fef08a' : '#334155'}
          stroke={analysis.ledLit ? '#facc15' : '#64748b'}
          stroke-width="2.5"
        />
        <text x="710" y="242" fill={analysis.ledLit ? '#fde047' : '#94a3b8'} font-size="10" font-weight="bold" text-anchor="middle">
          {analysis.ledLit ? 'ALLUMÉE' : 'ÉTEINTE'}
        </text>
      </g>

      <!-- Routed Colored Wires -->
      {#each wires as wire (wire.id)}
        {@const st = wireStyle(wire)}
        {@const mid = wireMidpoint(wire)}
        <g
          onclick={(e) => removeWire(wire.id, e)}
          onkeydown={(e) => e.key === 'Enter' && (wires = wires.filter((x) => x.id !== wire.id))}
          role="button"
          tabindex="0"
          class="cursor-pointer"
        >
          <!-- Wide invisible hit target for easy click removal -->
          <polyline
            points={buildPolylinePoints(wire)}
            fill="none"
            stroke="transparent"
            stroke-width="14"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <polyline
            points={buildPolylinePoints(wire)}
            fill="none"
            stroke={st.color}
            stroke-width={st.width}
            stroke-dasharray={st.dashed ? '8,5' : 'none'}
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          {#if analysis.shortWireIds.has(wire.id) || analysis.polarityWireIds.has(wire.id)}
            <rect
              x={mid.x - 46}
              y={mid.y - 11}
              width="92"
              height="20"
              rx="4"
              fill={analysis.shortWireIds.has(wire.id) ? '#dc2626' : '#ea580c'}
            />
            <text x={mid.x} y={mid.y + 3} fill="#ffffff" font-size="9" font-weight="bold" text-anchor="middle">
              {st.label}
            </text>
          {/if}
          <title>Cliquer pour supprimer ce fil ({wire.from} ↔ {wire.to})</title>
        </g>
      {/each}

      <!-- Wire-in-progress preview -->
      {#if activeStartPin}
        {@const startPin = getPin(activeStartPin)}
        {@const pts = [startPin, ...draftWaypoints].map((p) => `${p.x},${p.y}`).join(' ')}
        <polyline
          points={pts}
          fill="none"
          stroke="#38bdf8"
          stroke-width="3"
          stroke-dasharray="5,4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        {#each draftWaypoints as wp}
          <circle cx={wp.x} cy={wp.y} r="4" fill="#38bdf8" />
        {/each}
      {/if}

      <!-- Clickable Terminal Pins -->
      {#each PINS as pin}
        {@const isSelected = activeStartPin === pin.id}
        {@const pinFill = pin.role === 'vcc' ? '#dc2626' : pin.role === 'gnd' ? '#0f172a' : '#eab308'}
        <g
          onclick={(e) => handlePinClick(pin.id, e)}
          onkeydown={(e) => e.key === 'Enter' && (activeStartPin = pin.id)}
          role="button"
          tabindex="0"
          class="cursor-pointer"
        >
          <circle
            cx={pin.x}
            cy={pin.y}
            r={isSelected ? 10 : 8}
            fill={pinFill}
            stroke={isSelected ? '#38bdf8' : '#f8fafc'}
            stroke-width={isSelected ? 3 : 2}
          />
          <text
            x={pin.x + (pin.id.startsWith('bat') || pin.id === 'sensor_sig' ? -14 : 14)}
            y={pin.y + 4}
            fill="#e2e8f0"
            font-size="10"
            font-weight="bold"
            text-anchor={pin.id.startsWith('bat') || pin.id === 'sensor_sig' ? 'end' : 'start'}
          >
            {pin.label}
          </text>
        </g>
      {/each}
    </svg>
  </div>

  <!-- Color Code Legend -->
  <div class="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-red-600 inline-block"></span> Alimentation +5V
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-sky-400 inline-block"></span> Masse GND (0V)
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-yellow-500 inline-block"></span> Signal Capteur
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-emerald-500 inline-block"></span> Signal Actif (LED allumée)
    </span>
    <span class="inline-flex items-center gap-1.5">
      <span class="w-4 h-1 rounded bg-orange-500 inline-block"></span> Erreur Polarité
    </span>
    <span class="inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
      <span class="w-4 h-1.5 rounded bg-rose-500 inline-block"></span> Court-circuit détecté
    </span>
  </div>
</section>
