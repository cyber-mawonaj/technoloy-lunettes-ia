<script lang="ts">
  import { onDestroy } from 'svelte';
  import { flip } from 'svelte/animate';
  import {
    dndzone,
    SHADOW_ITEM_MARKER_PROPERTY_NAME,
    TRIGGERS,
    type DndEvent,
  } from 'svelte-dnd-action';
  import {
    ArrowDown,
    ArrowUp,
    BookmarkPlus,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Play,
    Plus,
    RotateCcw,
    Square,
    Trash2,
  } from 'lucide-svelte';
  import { appState, getDefaultBlocks, type BlockNode } from '../../lib/stores/appState.svelte';

  interface PaletteBlockItem extends BlockNode {
    colorClass: string;
    isDndShadowItem?: boolean;
  }

  interface WorkspaceBlockItem extends BlockNode {
    isDndShadowItem?: boolean;
  }

  const flipDurationMs = 160;
  let seqCounter = 0;

  const PALETTE_TEMPLATES: Array<{
    kind: BlockNode['kind'];
    label: string;
    colorClass: string;
    defaults: Partial<BlockNode>;
  }> = [
    {
      kind: 'read_sensor',
      label: 'Lire capteur Grove (P0)',
      colorClass: 'bg-emerald-600 text-white',
      defaults: { port: 'P0' },
    },
    {
      kind: 'if_below',
      label: 'Si détection (< seuil)',
      colorClass: 'bg-amber-600 text-white',
      defaults: { threshold: 50 },
    },
    {
      kind: 'else_branch',
      label: 'Sinon (branche RAS / Veille)',
      colorClass: 'bg-amber-700 text-white',
      defaults: {},
    },
    {
      kind: 'on_button_a',
      label: 'Si Bouton A (Mode Fabrication)',
      colorClass: 'bg-teal-600 text-white',
      defaults: {},
    },
    {
      kind: 'on_button_b',
      label: 'Si Bouton B (Mode Réparation)',
      colorClass: 'bg-teal-700 text-white',
      defaults: {},
    },
    {
      kind: 'set_led',
      label: 'Allumer LED (P1)',
      colorClass: 'bg-rose-600 text-white',
      defaults: { port: 'P1', state: 'ON' },
    },
    {
      kind: 'set_buzzer',
      label: 'Activer Buzzer piézo (P2)',
      colorClass: 'bg-purple-600 text-white',
      defaults: { port: 'P2', state: 'ON' },
    },
    {
      kind: 'set_oled',
      label: 'Afficher sur OLED I2C',
      colorClass: 'bg-sky-600 text-white',
      defaults: { port: 'I2C', text: 'ALERTE OBSTACLE' },
    },
    {
      kind: 'send_mqtt',
      label: 'Publier MQTT atelier/poste1',
      colorClass: 'bg-indigo-600 text-white',
      defaults: { text: 'DISTANCE' },
    },
  ];

  function makePaletteItem(tpl: (typeof PALETTE_TEMPLATES)[number]): PaletteBlockItem {
    seqCounter += 1;
    return {
      id: `tpl-${tpl.kind}-${seqCounter}`,
      kind: tpl.kind,
      label: tpl.label,
      colorClass: tpl.colorClass,
      ...tpl.defaults,
    };
  }

  let showPython = $state(false);
  let paletteItems = $state<PaletteBlockItem[]>(PALETTE_TEMPLATES.map(makePaletteItem));
  let shouldIgnorePaletteDnd = $state(false);
  let isDraggingWorkspace = $state(false);
  let workspaceItems = $state<WorkspaceBlockItem[]>(appState.blockProgram.map((b) => ({ ...b })));
  let draftName = $state('');
  let isStepping = $state(false);
  let stepTimer: number | null = null;

  onDestroy(() => {
    stopStepExecution();
  });

  // Synchronize local DnD workspace list when scenario/reset/import mutates appState.blockProgram externally
  $effect(() => {
    const external = appState.blockProgram;
    if (!isDraggingWorkspace) {
      workspaceItems = external.map((b) => ({ ...b }));
    }
  });

  function blockColor(kind: BlockNode['kind']): string {
    return PALETTE_TEMPLATES.find((p) => p.kind === kind)?.colorClass ?? 'bg-slate-700 text-white';
  }

  function sanitizeBlock(item: WorkspaceBlockItem): BlockNode {
    const { isDndShadowItem: _shadow, ...rest } = item;
    return {
      id: rest.id,
      kind: rest.kind,
      label: rest.label,
      ...(rest.port ? { port: rest.port } : {}),
      ...(rest.threshold !== undefined ? { threshold: rest.threshold } : {}),
      ...(rest.state ? { state: rest.state } : {}),
      ...(rest.text ? { text: rest.text } : {}),
    };
  }

  function commitWorkspace(items: WorkspaceBlockItem[]) {
    const clean = items
      .filter((item) => !(item as Record<string, unknown>)[SHADOW_ITEM_MARKER_PROPERTY_NAME])
      .map(sanitizeBlock);
    appState.blockProgram = clean;
    appState.saveToStorage();
  }

  function handlePaletteConsider(e: CustomEvent<DndEvent<PaletteBlockItem>>) {
    const { trigger, id } = e.detail.info;
    if (trigger === TRIGGERS.DRAG_STARTED) {
      const idx = paletteItems.findIndex((item) => item.id === id);
      const source = idx >= 0 ? paletteItems[idx] : undefined;
      const tpl = PALETTE_TEMPLATES.find((p) => p.kind === source?.kind);
      const cleanItems = e.detail.items.filter(
        (item) => !(item as Record<string, unknown>)[SHADOW_ITEM_MARKER_NAME],
      );
      if (tpl && idx >= 0) {
        cleanItems.splice(idx, 0, makePaletteItem(tpl));
      }
      paletteItems = cleanItems;
      shouldIgnorePaletteDnd = true;
    } else if (!shouldIgnorePaletteDnd) {
      paletteItems = e.detail.items;
    } else {
      paletteItems = [...paletteItems];
    }
  }

  // Keep constant reference compatible with shadow filter
  const SHADOW_ITEM_MARKER_NAME = SHADOW_ITEM_MARKER_PROPERTY_NAME;

  function handlePaletteFinalize(e: CustomEvent<DndEvent<PaletteBlockItem>>) {
    if (!shouldIgnorePaletteDnd) {
      paletteItems = e.detail.items;
    } else {
      paletteItems = [...paletteItems];
      shouldIgnorePaletteDnd = false;
    }
  }

  function handleWorkspaceConsider(e: CustomEvent<DndEvent<WorkspaceBlockItem>>) {
    isDraggingWorkspace = true;
    workspaceItems = e.detail.items;
  }

  function handleWorkspaceFinalize(e: CustomEvent<DndEvent<WorkspaceBlockItem>>) {
    isDraggingWorkspace = false;
    workspaceItems = e.detail.items;
    commitWorkspace(e.detail.items);
  }

  function addBlock(tpl: (typeof PALETTE_TEMPLATES)[number]) {
    seqCounter += 1;
    const newBlock: BlockNode = {
      id: `blk-${Date.now()}-${seqCounter}`,
      kind: tpl.kind,
      label: tpl.label,
      ...tpl.defaults,
    };
    const next = [...appState.blockProgram, newBlock];
    appState.blockProgram = next;
    workspaceItems = next.map((b) => ({ ...b }));
    appState.saveToStorage();
  }

  function removeBlock(id: string) {
    const next = appState.blockProgram.filter((b) => b.id !== id);
    appState.blockProgram = next;
    workspaceItems = next.map((b) => ({ ...b }));
    appState.saveToStorage();
  }

  function moveBlock(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= appState.blockProgram.length) return;
    const copy = [...appState.blockProgram];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    appState.blockProgram = copy;
    workspaceItems = copy.map((b) => ({ ...b }));
    appState.saveToStorage();
  }

  function updateThreshold(id: string, value: string) {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    const next = appState.blockProgram.map((b) => (b.id === id ? { ...b, threshold: num } : b));
    appState.blockProgram = next;
    workspaceItems = next.map((b) => ({ ...b }));
    if (appState.labScenario === '5e') appState.luxThreshold = num;
    else appState.distThreshold = num;
    appState.saveToStorage();
  }

  function resetBlocks() {
    stopStepExecution();
    const defaults = getDefaultBlocks(appState.labScenario);
    appState.blockProgram = defaults;
    workspaceItems = defaults.map((b) => ({ ...b }));
    appState.saveToStorage();
  }

  function mapBlockToCyNode(kind: BlockNode['kind']): string {
    if (kind === 'read_sensor') return 'read';
    if (kind === 'if_below' || kind === 'on_button_a' || kind === 'on_button_b') return 'test';
    if (kind === 'else_branch') return 'act_false';
    if (appState.hasElectricalError || appState.electronicGridShort) return 'fault';
    return appState.isConditionTriggered ? 'act_true' : 'act_false';
  }

  function stopStepExecution() {
    if (stepTimer !== null) {
      window.clearInterval(stepTimer);
      stepTimer = null;
    }
    isStepping = false;
    appState.activeStepBlockId = null;
    appState.activeStepCyNode = null;
  }

  function toggleStepExecution() {
    if (isStepping) {
      stopStepExecution();
      return;
    }
    if (appState.blockProgram.length === 0) return;

    if (appState.electronicGridShort || appState.hasElectricalError) {
      appState.showToast('Débogage bloqué : corrigez d’abord l’erreur électrique / court-circuit.', 'error');
      appState.activeStepCyNode = 'fault';
      return;
    }

    isStepping = true;
    let idx = 0;
    const applyStep = () => {
      const blocks = appState.blockProgram;
      if (idx >= blocks.length) {
        stopStepExecution();
        return;
      }
      const cur = blocks[idx];
      appState.activeStepBlockId = cur.id;
      appState.activeStepCyNode = mapBlockToCyNode(cur.kind);
      idx += 1;
    };

    applyStep();
    stepTimer = window.setInterval(applyStep, 850);
  }

  const readOnlyMicroPython = $derived.by(() => {
    const seuil = appState.activeThreshold;
    const lines = [
      '# Lecture seule Enseignant — Équivalent MicroPython micro:bit V2',
      '# Les élèves programment exclusivement par blocs (mBlock / MakeCode).',
      'from microbit import *',
      'import music',
      '',
      `SEUIL = ${seuil}`,
      '',
      'while True:',
    ];
    const hasCond = appState.blockProgram.some((b) => b.kind === 'if_below');
    lines.push('    mesure = pin0.read_analog()');
    if (hasCond) {
      lines.push('    if mesure < SEUIL:');
      if (appState.blockProgram.some((b) => b.kind === 'set_led')) {
        lines.push('        pin1.write_digital(1)');
      }
      if (appState.blockProgram.some((b) => b.kind === 'set_buzzer')) {
        lines.push('        music.pitch(2000, 120)');
      }
      if (appState.blockProgram.some((b) => b.kind === 'set_oled')) {
        lines.push('        display.scroll("ALERTE")');
      }
      lines.push('    else:');
      lines.push('        pin1.write_digital(0)');
      lines.push('        display.show(Image.YES)');
    }
    lines.push('    sleep(100)');
    return lines.join('\n');
  });
</script>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Interactive Drag-and-Drop Block Editor (svelte-dnd-action) -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Éditeur de Blocs Visuels (Glisser-Déposer mBlock)
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Glissez les fonctions logiques vers la zone d’assemblage ou exécutez pas à pas avec le logigramme.
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onclick={toggleStepExecution}
          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer {isStepping
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
        >
          {#if isStepping}
            <Square class="w-3.5 h-3.5" /> Arrêter
          {:else}
            <Play class="w-3.5 h-3.5" /> Pas à pas
          {/if}
        </button>
        <button
          type="button"
          onclick={resetBlocks}
          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>
    </div>

    <!-- Draggable Block Palette (Clone-on-Drag via svelte-dnd-action) -->
    <div class="space-y-1.5">
      <div class="text-xs font-semibold text-slate-600 dark:text-slate-400">Palette de fonctions logiques :</div>
      <div
        use:dndzone={{
          items: paletteItems,
          flipDurationMs,
          dropFromOthersDisabled: true,
          type: 'logic-blocks',
          morphDisabled: true,
        }}
        onconsider={handlePaletteConsider}
        onfinalize={handlePaletteFinalize}
        aria-label="Palette de blocs à glisser"
        class="flex flex-wrap gap-1.5 min-h-[42px]"
      >
        {#each paletteItems as tpl (tpl.id)}
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold shadow-xs cursor-grab active:cursor-grabbing select-none {tpl.colorClass}"
          >
            <GripVertical class="w-3 h-3 opacity-80" />
            <span>{tpl.label}</span>
            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation();
                const match = PALETTE_TEMPLATES.find((p) => p.kind === tpl.kind);
                if (match) addBlock(match);
              }}
              title="Ajouter à la fin du programme"
              aria-label={`Ajouter ${tpl.label}`}
              class="ml-0.5 p-0.5 rounded bg-black/20 hover:bg-black/35 cursor-pointer"
            >
              <Plus class="w-3 h-3" />
            </button>
          </div>
        {/each}
      </div>
    </div>

    <!-- Assembly Workspace -->
    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-dashed border-slate-300 dark:border-slate-700 space-y-2 font-mono text-xs">
      <div class="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold">
        quand la carte micro:bit V2 démarre
      </div>
      <div class="px-3 py-2 rounded-lg bg-sky-700 text-white font-bold ml-3">
        répéter indéfiniment
      </div>

      <div class="relative">
        {#if workspaceItems.length === 0}
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400 font-sans text-xs">
            Déposez des blocs ici (ex : Si détection, Allumer LED).
          </div>
        {/if}

        <div
          use:dndzone={{
            items: workspaceItems,
            flipDurationMs,
            type: 'logic-blocks',
            dropTargetStyle: { outline: '2px dashed #0284c7', borderRadius: '0.5rem' },
          }}
          onconsider={handleWorkspaceConsider}
          onfinalize={handleWorkspaceFinalize}
          aria-label="Zone d'assemblage des blocs"
          class="min-h-[120px] space-y-2"
        >
          {#each workspaceItems as blk, i (blk.id)}
            {@const indented =
              blk.kind !== 'read_sensor' &&
              blk.kind !== 'if_below' &&
              blk.kind !== 'else_branch' &&
              blk.kind !== 'on_button_a' &&
              blk.kind !== 'on_button_b'}
            {@const isStepActive = appState.activeStepBlockId === blk.id}
            <div
              animate:flip={{ duration: flipDurationMs }}
              class="flex items-center justify-between gap-2 px-3 py-2 rounded-lg font-semibold cursor-grab active:cursor-grabbing select-none transition-all {blockColor(blk.kind)} {indented ? 'ml-9' : 'ml-6'} {isStepActive ? 'ring-4 ring-yellow-300 scale-[1.01]' : ''}"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <GripVertical class="w-3.5 h-3.5 opacity-80 shrink-0" />
                <span>{blk.label}</span>
                {#if blk.kind === 'if_below'}
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={blk.threshold ?? 50}
                    oninput={(e) => updateThreshold(blk.id, (e.target as HTMLInputElement).value)}
                    aria-label="Seuil de déclenchement"
                    class="w-16 bg-white text-slate-900 rounded px-1.5 py-0.5 text-center font-bold tabular-nums"
                  />
                  <span>{appState.labScenario === '5e' ? 'lux' : 'cm'}</span>
                {/if}
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onclick={() => moveBlock(i, -1)}
                  title="Monter"
                  aria-label="Monter le bloc"
                  class="p-1 rounded bg-black/20 hover:bg-black/35 cursor-pointer"
                >
                  <ArrowUp class="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onclick={() => moveBlock(i, 1)}
                  title="Descendre"
                  aria-label="Descendre le bloc"
                  class="p-1 rounded bg-black/20 hover:bg-black/35 cursor-pointer"
                >
                  <ArrowDown class="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onclick={() => removeBlock(blk.id)}
                  title="Supprimer le bloc"
                  aria-label="Supprimer le bloc"
                  class="p-1 rounded bg-black/20 hover:bg-black/35 cursor-pointer"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Local Multi-Version Draft Manager -->
    <div class="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
      <div class="flex flex-wrap items-center gap-2">
        <input
          type="text"
          bind:value={draftName}
          placeholder="Nom de version (ex : Essai seuil 20cm)"
          class="flex-grow min-w-[180px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          onclick={() => {
            appState.saveProgramDraft(draftName);
            draftName = '';
          }}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white font-semibold cursor-pointer"
        >
          <BookmarkPlus class="w-3.5 h-3.5" /> Enregistrer version
        </button>
      </div>

      {#if appState.programDrafts.length > 0}
        <div class="flex flex-wrap gap-1.5">
          {#each appState.programDrafts as draft (draft.id)}
            <button
              type="button"
              onclick={() => appState.restoreProgramDraft(draft.id)}
              class="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:border-sky-300 dark:hover:border-sky-700 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              {draft.name} ({draft.scenario} · {draft.savedAt})
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  <!-- Read-only Teacher MicroPython Panel -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Équivalent MicroPython (Lecture Enseignant Uniquement)
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Généré automatiquement en lecture seule à partir des blocs assemblés à gauche.
        </p>
      </div>
      <button
        type="button"
        onclick={() => (showPython = !showPython)}
        class="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 cursor-pointer whitespace-nowrap"
      >
        {showPython ? 'Masquer' : 'Afficher'}
        {#if showPython}
          <ChevronUp class="w-4 h-4" />
        {:else}
          <ChevronDown class="w-4 h-4" />
        {/if}
      </button>
    </div>

    {#if showPython}
      <pre class="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">{readOnlyMicroPython}</pre>
    {:else}
      <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <strong>Rappel pédagogique du kit :</strong> Les élèves de Cycle 4 travaillent uniquement par blocs dans
        <strong>mBlock 5</strong> (ou <strong>MakeCode</strong> en plan B). Ce panneau reste replié par défaut afin
        de ne pas surcharger la lecture.
      </div>
    {/if}

    <!-- Live Evaluation Summary -->
    <div class="grid grid-cols-2 gap-3 pt-2 text-xs">
      <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
        <div class="text-slate-500 dark:text-slate-400">Seuil actif dans le bloc SI</div>
        <div class="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
          {appState.activeThreshold} {appState.labScenario === '5e' ? 'lux' : 'cm'}
        </div>
      </div>
      <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
        <div class="text-slate-500 dark:text-slate-400">Décision algorithmique</div>
        <div class="text-base font-bold font-mono mt-0.5 {appState.hasElectricalError || appState.electronicGridShort ? 'text-rose-600 dark:text-rose-400' : appState.isConditionTriggered ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}">
          {appState.hasElectricalError || appState.electronicGridShort
            ? 'ERREUR CÂBLAGE'
            : appState.isConditionTriggered
              ? 'CONDITION VRAIE'
              : 'CONDITION FAUSSE'}
        </div>
      </div>
    </div>
  </section>
</div>
