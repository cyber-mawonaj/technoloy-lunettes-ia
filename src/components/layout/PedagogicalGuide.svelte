<script lang="ts">
  import {
    ArrowRight,
    BookOpenCheck,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Square,
    Volume2,
  } from 'lucide-svelte';
  import { PEDAGOGICAL_GUIDE_STEPS, type GuideStep } from '../../lib/data/pedagogyPlus';
  import { appState } from '../../lib/stores/appState.svelte';
  import { isSpeechAvailable, speakFrench } from '../../lib/utils/speech';

  let mobileExpanded = $state(false);
  const canSpeak = isSpeechAvailable();

  const currentLevel = $derived(appState.studentInfo.niveau);
  const steps = $derived(PEDAGOGICAL_GUIDE_STEPS[currentLevel]);
  const completedCount = $derived(
    steps.filter((s) => Boolean(appState.guideCompletedSteps[s.id])).length,
  );
  const progressPct = $derived(
    steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0,
  );

  const nextPendingStepId = $derived(
    steps.find((s) => !appState.guideCompletedSteps[s.id])?.id ?? null,
  );

  function toggleDesktopSidebar() {
    appState.guideSidebarOpen = !appState.guideSidebarOpen;
    appState.saveToStorage();
  }

  function goToStepTab(step: GuideStep) {
    appState.activeTab = step.tab;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      mobileExpanded = false;
    }
  }

  function resetCurrentLevel() {
    const prefix = currentLevel === '5e' ? 'g5_' : currentLevel === '4e' ? 'g4_' : 'g3_';
    appState.resetGuideSteps(prefix);
  }

  function isAutoVerifiedInLab(stepId: string): boolean {
    switch (stepId) {
      case 'g5_2':
        return appState.viewMode3D === 'exploded' || appState.isolateElectronics3D;
      case 'g5_3':
        return !appState.hasElectricalError && appState.electronicGridValid && !appState.electronicGridShort;
      case 'g5_4':
        return appState.isLedActive && appState.isBuzzerActive;
      case 'g5_5':
        return !appState.buzzerFault && !appState.hasElectricalError;
      case 'g4_1':
        return appState.arOverlay;
      case 'g4_3':
        return appState.isOledActive && !appState.electronicGridShort && !appState.electronicGridResistorBypassed;
      case 'g4_4':
        return appState.isConditionTriggered && appState.isOledActive && appState.isBuzzerActive;
      case 'g4_5':
        return appState.mqttSentCount > 0 || appState.terminalLogs.length > 1;
      case 'g3_2':
        return appState.showEnergyFlows3D && !appState.hasElectricalError && !appState.electronicGridShort;
      case 'g3_3':
        return appState.programDrafts.length > 0;
      case 'g3_4':
        return appState.mqttSentCount > 0;
      case 'g3_5':
        return appState.protocolRows.every((r) => r.pass);
      default:
        return false;
    }
  }
</script>

<!-- Mobile / Tablet Collapsible Bar (non-sticky to preserve viewport space) -->
<div class="lg:hidden mb-4 no-print">
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
    <button
      type="button"
      onclick={() => (mobileExpanded = !mobileExpanded)}
      aria-expanded={mobileExpanded}
      class="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <BookOpenCheck class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
        <div class="min-w-0">
          <p class="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
            Guide pas à pas · Niveau {currentLevel}
          </p>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {completedCount} / {steps.length} étapes cochées ({progressPct} %)
          </p>
        </div>
      </div>
      <span class="text-xs font-semibold text-sky-700 dark:text-sky-400 whitespace-nowrap shrink-0">
        {mobileExpanded ? 'Masquer' : 'Afficher'}
      </span>
    </button>

    {#if mobileExpanded}
      <div class="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/60">
        <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-sky-600 dark:bg-sky-500 transition-all duration-200"
            style="width: {progressPct}%"
          ></div>
        </div>

        <ol class="space-y-2">
          {#each steps as step (step.id)}
            {@const checked = Boolean(appState.guideCompletedSteps[step.id])}
            {@const isNext = nextPendingStepId === step.id}
            {@const labVerified = isAutoVerifiedInLab(step.id)}
            <li
              class="rounded-lg border p-3 transition-colors {checked
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70'
                : isNext
                  ? 'bg-sky-50/60 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}"
            >
              <div class="flex items-start gap-2.5">
                <button
                  type="button"
                  onclick={() => appState.toggleGuideStep(step.id)}
                  aria-label="Marquer l’étape {step.order} comme {checked ? 'non terminée' : 'terminée'}"
                  class="mt-0.5 p-1 -m-1 rounded text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer shrink-0"
                >
                  {#if checked}
                    <CheckSquare class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {:else}
                    <Square class="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {/if}
                </button>
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">{step.order}</span>
                    <span aria-hidden="true">·</span>
                    <span>{step.tabLabel}</span>
                    {#if checked}
                      <span aria-hidden="true">·</span>
                      <span class="font-semibold text-emerald-700 dark:text-emerald-400">Validé</span>
                    {:else if labVerified}
                      <span aria-hidden="true">·</span>
                      <span class="font-medium text-sky-700 dark:text-sky-400">Prêt en labo</span>
                    {/if}
                  </div>
                  <p class="text-xs font-semibold {checked ? 'text-emerald-950 dark:text-emerald-200 line-through decoration-emerald-400/70' : 'text-slate-900 dark:text-slate-100'}">
                    {step.title}
                  </p>
                  <p class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step.instruction}</p>
                  <div class="pt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onclick={() => goToStepTab(step)}
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 cursor-pointer"
                    >
                      Ouvrir l’onglet
                      <ArrowRight class="w-3 h-3" />
                    </button>
                    {#if canSpeak}
                      <button
                        type="button"
                        onclick={() => speakFrench(`${step.title}. ${step.instruction}`)}
                        class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      >
                        <Volume2 class="w-3 h-3" />
                        Écouter
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            </li>
          {/each}
        </ol>

        <div class="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Conforme BO n° 9 · Cycle 4</span>
          <button
            type="button"
            onclick={resetCurrentLevel}
            class="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <RotateCcw class="w-3 h-3" />
            Réinitialiser
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Desktop Interactive Sidebar -->
<aside
  aria-label="Guide pédagogique pas à pas"
  class="hidden lg:block shrink-0 transition-all duration-200 no-print {appState.guideSidebarOpen ? 'w-80' : 'w-12'}"
>
  <div class="sticky top-18 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-5.5rem)]">
    {#if !appState.guideSidebarOpen}
      <div class="p-2 flex flex-col items-center gap-4 py-4">
        <button
          type="button"
          onclick={toggleDesktopSidebar}
          title="Ouvrir le guide pédagogique pas à pas"
          aria-label="Ouvrir le guide pédagogique pas à pas"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 transition-colors cursor-pointer"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
        <div class="flex flex-col items-center gap-1 text-center">
          <BookOpenCheck class="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span class="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {completedCount}/{steps.length}
          </span>
        </div>
      </div>
    {:else}
      <!-- Sidebar Header -->
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
              <BookOpenCheck class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <h2 class="text-sm font-bold tracking-tight truncate">Guide Pas à Pas</h2>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Programme {currentLevel} · BO n° 9 (2024)
            </p>
          </div>
          <button
            type="button"
            onclick={toggleDesktopSidebar}
            title="Réduire la barre latérale"
            aria-label="Réduire la barre latérale"
            class="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-600 dark:text-slate-300 font-medium">Avancement du montage</span>
            <span class="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {completedCount} / {steps.length} ({progressPct} %)
            </span>
          </div>
          <div class="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              class="h-full transition-all duration-200 {completedCount === steps.length ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-sky-600 dark:bg-sky-500'}"
              style="width: {progressPct}%"
            ></div>
          </div>
        </div>
      </div>

      <!-- Scrollable Steps List -->
      <div class="p-3 overflow-y-auto space-y-2 flex-1">
        <ol class="space-y-2">
          {#each steps as step (step.id)}
            {@const checked = Boolean(appState.guideCompletedSteps[step.id])}
            {@const isNext = nextPendingStepId === step.id}
            {@const labVerified = isAutoVerifiedInLab(step.id)}
            {@const isActiveTab = appState.activeTab === step.tab}
            <li
              class="rounded-lg border p-3 transition-colors {checked
                ? 'bg-emerald-50/60 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/70'
                : isNext
                  ? 'bg-sky-50/50 dark:bg-sky-950/35 border-sky-300 dark:border-sky-700'
                  : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}"
            >
              <div class="flex items-start gap-2.5">
                <button
                  type="button"
                  onclick={() => appState.toggleGuideStep(step.id)}
                  aria-label="Cocher l’étape {step.order} : {step.title}"
                  aria-pressed={checked}
                  class="mt-0.5 p-1 -m-1 rounded text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer shrink-0"
                >
                  {#if checked}
                    <CheckSquare class="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  {:else}
                    <Square class="w-4.5 h-4.5 {isNext ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}" />
                  {/if}
                </button>

                <div class="min-w-0 flex-1 space-y-1.5">
                  <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span class="font-mono font-bold text-slate-700 dark:text-slate-300">{step.order}</span>
                    <span aria-hidden="true">·</span>
                    <span class={isActiveTab ? 'font-semibold text-sky-700 dark:text-sky-400' : ''}>{step.tabLabel}</span>
                    {#if checked}
                      <span aria-hidden="true">·</span>
                      <span class="font-semibold text-emerald-700 dark:text-emerald-400">Validé</span>
                    {:else if labVerified}
                      <span aria-hidden="true">·</span>
                      <span class="font-semibold text-sky-700 dark:text-sky-400">Vérifié en labo</span>
                    {/if}
                  </div>

                  <button
                    type="button"
                    onclick={() => appState.toggleGuideStep(step.id)}
                    class="text-left block w-full cursor-pointer"
                  >
                    <span
                      class="text-xs font-semibold leading-snug block {checked
                        ? 'text-emerald-950 dark:text-emerald-200 line-through decoration-emerald-400/80'
                        : 'text-slate-900 dark:text-slate-100'}"
                    >
                      {step.title}
                    </span>
                  </button>

                  <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.instruction}
                  </p>

                  <div class="pt-0.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onclick={() => goToStepTab(step)}
                      class="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer {isActiveTab
                        ? 'text-slate-500 dark:text-slate-400'
                        : 'text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300'}"
                    >
                      {isActiveTab ? 'Onglet actif' : 'Ouvrir l’étape'}
                      {#if !isActiveTab}
                        <ArrowRight class="w-3 h-3" />
                      {/if}
                    </button>

                    {#if canSpeak}
                      <button
                        type="button"
                        onclick={() => speakFrench(`${step.title}. ${step.instruction}`)}
                        title="Lire cette étape à voix haute"
                        class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                      >
                        <Volume2 class="w-3 h-3" />
                        Écouter
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            </li>
          {/each}
        </ol>
      </div>

      <!-- Sidebar Footer -->
      <div class="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between gap-2 text-[11px] shrink-0">
        <span class="text-slate-500 dark:text-slate-400 truncate">Sauvegarde auto locale</span>
        <button
          type="button"
          onclick={resetCurrentLevel}
          class="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white whitespace-nowrap cursor-pointer"
        >
          <RotateCcw class="w-3 h-3" />
          Réinitialiser
        </button>
      </div>
    {/if}
  </div>
</aside>
