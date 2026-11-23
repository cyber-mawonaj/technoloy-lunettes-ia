<script lang="ts">
  import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-svelte';
  import { TEACHER_FICHES } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import ClassCollector from './ClassCollector.svelte';

  let phaseFilter = $state<'Toutes' | 'Serveur & Réseau' | 'Nœuds Wi-Fi' | 'Classe & Sécurité'>('Toutes');
  let openIds = $state<Record<string, boolean>>({ T1: true, T3bis: true, T14: true });
  let copiedId = $state<string | null>(null);

  const T13_ITEMS = [
    'Point d’accès ReseauAtelier actif sur la bande 2,4 GHz forcée (10.42.0.1)',
    'Service Mosquitto démarré avec allow_anonymous false et port 1883 local uniquement',
    'Script serveur T14 (ia_atelier.py) lancé dans un terminal PuTTY enseignant',
    'Nœuds Wi-Fi (ESP32-C3 / Pico W / ESP32-CAM) flashés et testés sur le SSID atelier',
    'Postes élèves connectés à http://10.42.0.1:8080 ou PWA installée hors ligne',
  ];

  const filteredFiches = $derived(
    phaseFilter === 'Toutes' ? TEACHER_FICHES : TEACHER_FICHES.filter((f) => f.phase === phaseFilter),
  );

  function toggleCard(id: string) {
    openIds[id] = !openIds[id];
  }

  async function copyCommands(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedId = id;
      appState.showToast(`Bloc ${id} copié dans le presse-papiers.`, 'success');
      window.setTimeout(() => {
        if (copiedId === id) copiedId = null;
      }, 2000);
    } catch {
      appState.showToast('Copie manuelle requise dans cet environnement.', 'error');
    }
  }
</script>

<div class="space-y-6">
  <!-- Header & Phase Filter -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div>
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
        Guide Enseignant — Fiches Techniques T1 à T15
      </h2>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Procédures d’installation Windows 11 / PuTTY / Raspberry Pi 400 réservées à l’enseignant. Aucun mot de passe réel n’est exposé aux élèves.
      </p>
    </div>

    <div class="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
      {#each ['Toutes', 'Serveur & Réseau', 'Nœuds Wi-Fi', 'Classe & Sécurité'] as phase}
        <button
          type="button"
          onclick={() => (phaseFilter = phase as typeof phaseFilter)}
          class="px-2.5 py-1.5 rounded-md font-medium whitespace-nowrap cursor-pointer {phaseFilter === phase
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}"
        >
          {phase}
        </button>
      {/each}
    </div>
  </section>

  <!-- Interactive T13 Pre-Session Checklist -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">Checklist Préparation Séance T13 (10 min avant cours)</h3>
      <span class="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
        {Object.values(appState.t13Checklist).filter(Boolean).length} / {T13_ITEMS.length} validés
      </span>
    </div>
    <div class="space-y-2">
      {#each T13_ITEMS as item, idx}
        <label class="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!appState.t13Checklist[idx]}
            onchange={(e) => {
              appState.t13Checklist[idx] = (e.target as HTMLInputElement).checked;
              appState.saveToStorage();
            }}
            class="w-4 h-4 accent-sky-600 dark:accent-sky-400 rounded cursor-pointer"
          />
          <span class={appState.t13Checklist[idx] ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium'}>{item}</span>
        </label>
      {/each}
    </div>
  </section>

  <!-- Batch Class JSON Collector + CSV Export -->
  <ClassCollector />

  <!-- Fiches Accordion T1 - T15 -->
  <div class="space-y-3">
    {#each filteredFiches as fiche (fiche.id)}
      <section class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <button
          type="button"
          onclick={() => toggleCard(fiche.id)}
          class="w-full px-5 py-3.5 text-left flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="font-mono text-xs font-bold text-sky-700 dark:text-sky-400 shrink-0">{fiche.id}</span>
            <div class="min-w-0">
              <div class="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{fiche.title}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400 truncate">{fiche.phase} · {fiche.summary}</div>
            </div>
          </div>
          {#if openIds[fiche.id]}
            <ChevronUp class="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          {:else}
            <ChevronDown class="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          {/if}
        </button>

        {#if openIds[fiche.id]}
          <div class="px-5 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            {#if fiche.note}
              <p class="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                {fiche.note}
              </p>
            {/if}

            <div class="bg-slate-900 dark:bg-slate-950 rounded-lg p-3.5 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span>Commandes / Script de référence</span>
                <button
                  type="button"
                  onclick={() => copyCommands(fiche.id, fiche.commands)}
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold cursor-pointer"
                >
                  {#if copiedId === fiche.id}
                    <Check class="w-3 h-3" /> Copié
                  {:else}
                    <Copy class="w-3 h-3" /> Copier
                  {/if}
                </button>
              </div>
              <pre class="font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">{fiche.commands}</pre>
            </div>
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>
