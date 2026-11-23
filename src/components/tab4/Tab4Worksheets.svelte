<script lang="ts">
  import { Download, FileDown, KeyRound, Volume2 } from 'lucide-svelte';
  import { WORKSHEETS_BY_LEVEL } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import { generateStudentSheetPdf } from '../../lib/utils/pdfExport';
  import { isSpeechAvailable, speakFrench } from '../../lib/utils/speech';

  let isGeneratingPdf = $state(false);
  const questions = $derived(WORKSHEETS_BY_LEVEL[appState.studentInfo.niveau]);

  async function handleGeneratePdf() {
    if (isGeneratingPdf) return;
    isGeneratingPdf = true;
    try {
      await generateStudentSheetPdf();
    } finally {
      isGeneratingPdf = false;
    }
  }

  const RUBRIC_CRITERIA = [
    { id: 'c1', label: 'Identifier les fonctions techniques et les flux (énergie / information)' },
    { id: 'c2', label: 'Concevoir ou modifier un algorithme par blocs (sans erreur de câblage)' },
    { id: 'c3', label: 'Expliquer les échanges réseau MQTT et l’esprit critique face à la règle T14' },
  ];
</script>

<div class="space-y-6">
  <!-- Header Bar -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">
        Fiches d’Activités Élèves — Niveau {appState.studentInfo.niveau}
      </h2>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Toutes vos réponses sont sauvegardées automatiquement hors ligne dans le navigateur et exportables pour l’ENT.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2 no-print">
      <button
        type="button"
        onclick={() => (appState.profMode = !appState.profMode)}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer {appState.profMode
          ? 'bg-amber-500 border-amber-600 text-slate-950'
          : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60'}"
      >
        <KeyRound class="w-3.5 h-3.5" />
        {appState.profMode ? 'Masquer Corrigés Professeur' : 'Mode Professeur : Afficher Corrigés'}
      </button>

      <button
        type="button"
        onclick={handleGeneratePdf}
        disabled={isGeneratingPdf}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
      >
        <FileDown class="w-3.5 h-3.5" />
        {isGeneratingPdf ? 'Génération…' : 'Générer Fiche Élève'}
      </button>

      <button
        type="button"
        onclick={() => appState.exportStudentJSON()}
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-semibold cursor-pointer"
      >
        <Download class="w-3.5 h-3.5" />
        Exporter Dossier JSON
      </button>
    </div>
  </section>

  <!-- Active Level Questions -->
  <div class="space-y-5">
    {#each questions as q (q.id)}
      <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3 print-break-inside-avoid">
        <div class="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">{q.title}</h3>
          <div class="flex items-center gap-2 shrink-0">
            {#if isSpeechAvailable()}
              <button
                type="button"
                onclick={() => speakFrench(`${q.title}. ${q.prompt}`)}
                title="Lire la consigne à voix haute (EBEP)"
                aria-label="Écouter la consigne"
                class="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer no-print"
              >
                <Volume2 class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Écouter
              </button>
            {/if}
            <span class="text-xs font-mono text-slate-500 dark:text-slate-400">{q.code}</span>
          </div>
        </div>

        <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.prompt}</p>

        {#if q.type === 'chain'}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label for={`${q.id}_acq`} class="block font-semibold text-slate-800 dark:text-slate-200">1. Acquérir</label>
              <input
                id={`${q.id}_acq`}
                type="text"
                bind:value={appState.worksheetAnswers[`${q.id}_acq`]}
                oninput={() => appState.saveToStorage()}
                placeholder="ex : Capteur ultrason..."
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label for={`${q.id}_trt`} class="block font-semibold text-slate-800 dark:text-slate-200">2. Traiter</label>
              <input
                id={`${q.id}_trt`}
                type="text"
                bind:value={appState.worksheetAnswers[`${q.id}_trt`]}
                oninput={() => appState.saveToStorage()}
                placeholder="ex : micro:bit / ESP32-C3..."
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <label for={`${q.id}_com`} class="block font-semibold text-slate-800 dark:text-slate-200">3. Communiquer / Restituer</label>
              <input
                id={`${q.id}_com`}
                type="text"
                bind:value={appState.worksheetAnswers[`${q.id}_com`]}
                oninput={() => appState.saveToStorage()}
                placeholder="ex : OLED HUD + Buzzer..."
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        {:else}
          <textarea
            rows="4"
            bind:value={appState.worksheetAnswers[q.id]}
            oninput={() => appState.saveToStorage()}
            placeholder={q.placeholder || 'Saisissez votre réponse...'}
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          ></textarea>
        {/if}

        {#if appState.profMode}
          <div class="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
            <strong>Corrigé Enseignant :</strong> {q.solution}
          </div>
        {/if}
      </section>
    {/each}
  </div>

  <!-- Self-Evaluation Rubric -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 print-break-inside-avoid">
    <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
      Auto-évaluation de fin de séance
    </h3>
    <div class="space-y-3">
      {#each RUBRIC_CRITERIA as crit}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs py-1">
          <span class="text-slate-700 dark:text-slate-300 font-medium">{crit.label}</span>
          <div class="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1 shrink-0">
            {#each [
              { key: 'maitrise', label: 'Maîtrisé' },
              { key: 'encours', label: 'En cours' },
              { key: 'revoir', label: 'À revoir' },
            ] as opt}
              <button
                type="button"
                onclick={() => {
                  appState.selfEval[crit.id] = opt.key as 'maitrise' | 'encours' | 'revoir';
                  appState.saveToStorage();
                }}
                class="px-2.5 py-1 rounded-md font-semibold cursor-pointer {appState.selfEval[crit.id] === opt.key
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}"
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>
