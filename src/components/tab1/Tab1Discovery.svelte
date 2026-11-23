<script lang="ts">
  import { CheckCircle2, MapPin, ShieldCheck, XCircle } from 'lucide-svelte';
  import {
    EQUIPMENT_RATIONALE_PILLARS,
    POSTER_COMPONENTS,
    type ComponentSpec,
  } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import Scene3D from './Scene3D.svelte';
  import TechnicalDrawingsSVG from './TechnicalDrawingsSVG.svelte';

  let viewportRef: Scene3D | undefined = $state();

  const subProblemText = $derived.by(() => {
    if (appState.studentInfo.niveau === '5e') {
      return '5e · Faire fonctionner un premier prototype et alerter l’ouvrier (luminosité, LED, buzzer).';
    }
    if (appState.studentInfo.niveau === '4e') {
      return '4e · Ajouter une alerte de proximité automatique et relier le prototype au réseau Wi-Fi / MQTT.';
    }
    return '3e · Faire dialoguer les lunettes avec le service décisionnel simulé T14 et valider les 5 essais.';
  });

  const activeComponentSpec = $derived(
    POSTER_COMPONENTS.find((c) => c.threeTarget === appState.selected3DPart) ?? POSTER_COMPONENTS[1],
  );

  function inspectComponent(comp: ComponentSpec) {
    viewportRef?.focusComponent(comp.threeTarget, comp.zoomPreset);
  }
</script>

<div class="space-y-6">
  <!-- Fil Rouge Situation-Problème M. Loyalle -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
    <div class="space-y-1.5 max-w-3xl">
      <div class="text-xs font-medium text-sky-700 dark:text-sky-400">
        Situation-problème · Entreprise Loyalle (Usine d’automobiles volantes hybrides)
      </div>
      <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
        Assistance visuelle et auditive pour l’ouvrier de maintenance
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Monsieur Loyalle confie aux élèves la conception d’un prototype de lunettes connectées pour ses équipes de
        fabrication et de réparation. La maquette fonctionne exclusivement en 5 V USB et constitue un outil
        pédagogique non certifié EPI.
      </p>
    </div>

    <div class="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 lg:max-w-sm shrink-0 space-y-1">
      <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Sous-problématique active ({appState.studentInfo.niveau})</div>
      <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{subProblemText}</p>
    </div>
  </section>

  <!-- 3D PBR Interactive Viewport -->
  <Scene3D
    bind:this={viewportRef}
    selectedPart={appState.selected3DPart}
    explodeFactor={appState.explodeFactor}
    arOverlay={appState.arOverlay}
  />

  <!-- Poster des 8 Fonctions Intégrées + Justification détaillée du composant sélectionné -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Nomenclature du Teardown — 8 Fonctions Intégrées & Implantation Réelle
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Cliquez sur un composant pour orienter la caméra 3D sur son emplacement réel et consulter la justification de son choix.
        </p>
      </div>
      <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Cible élèves : micro:bit V2 + Shield Grove</span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {#each POSTER_COMPONENTS as comp}
        {@const isSelected = activeComponentSpec.id === comp.id}
        <button
          type="button"
          onclick={() => inspectComponent(comp)}
          class="text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between gap-2 {isSelected
            ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/50'
            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70'}"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold text-sky-700 dark:text-sky-400 font-mono tabular-nums">{comp.index}.</span>
              <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{comp.bus}</span>
            </div>
            <div class="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{comp.name}</div>
            <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{comp.role}</p>
          </div>
          <div class="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <MapPin class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <span class="line-clamp-2">{comp.placement}</span>
          </div>
        </button>
      {/each}
    </div>

    <!-- Fiche détaillée du composant actif -->
    <div class="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-slate-950/80 p-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div>
          <span class="text-[11px] font-mono font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide">
            Fiche d’analyse matérielle · Composant {activeComponentSpec.index}
          </span>
          <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">
            {activeComponentSpec.name}
          </h4>
        </div>
        <div class="flex items-center gap-2 text-[11px] font-mono text-slate-700 dark:text-slate-300">
          <span class="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            {activeComponentSpec.voltage}
          </span>
          <span class="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            {activeComponentSpec.bus}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div class="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <div class="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <MapPin class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            Implantation & Ergonomie
          </div>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeComponentSpec.placement}
          </p>
        </div>

        <div class="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <div class="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 class="w-3.5 h-3.5 shrink-0" />
            Pourquoi cet équipement ?
          </div>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeComponentSpec.whyChosen}
          </p>
        </div>

        <div class="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <div class="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <XCircle class="w-3.5 h-3.5 shrink-0" />
            Alternative écartée
          </div>
          <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
            {activeComponentSpec.alternativeRejected}
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Pourquoi ces équipements ? — 4 Piliers de Justification Technique & Pédagogique -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="border-b border-slate-200 dark:border-slate-800 pb-3">
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <ShieldCheck class="w-4 h-4 text-sky-600 dark:text-sky-400" />
        Pourquoi ces équipements ? — Justification Technique & Pédagogique (Cycle 4)
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
        Synthèse des critères d’ergonomie, de sécurité électrique, de programmabilité et d’architecture réseau ayant guidé le choix du kit.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each EQUIPMENT_RATIONALE_PILLARS as pillar}
        <div class="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div>
            <div class="text-[11px] font-mono font-semibold text-sky-700 dark:text-sky-400">{pillar.code}</div>
            <h4 class="text-sm font-bold text-slate-900 dark:text-slate-100">{pillar.title}</h4>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{pillar.summary}</p>
          <ul class="space-y-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
            {#each pillar.choices as item}
              <li class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5"></span>
                <span>{item}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </section>

  <!-- Dessins Techniques Normalisés -->
  <TechnicalDrawingsSVG />
</div>
