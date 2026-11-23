<script lang="ts">
  import { CheckCircle2, HelpCircle, RotateCcw, Volume2, XCircle } from 'lucide-svelte';
  import type { GradeLevel } from '../../lib/data/curriculum';
  import { QUIZ_QUESTIONS } from '../../lib/data/pedagogyPlus';
  import { appState } from '../../lib/stores/appState.svelte';
  import { isSpeechAvailable, speakFrench } from '../../lib/utils/speech';

  let selectedLevel = $state<GradeLevel | 'Tous'>('Tous');

  const visibleQuestions = $derived(
    selectedLevel === 'Tous'
      ? QUIZ_QUESTIONS
      : QUIZ_QUESTIONS.filter((q) => q.level === selectedLevel),
  );

  const scoreStats = $derived.by(() => {
    let answered = 0;
    let correct = 0;
    for (const q of visibleQuestions) {
      const choice = appState.quizAnswers[q.id];
      if (choice !== undefined) {
        answered += 1;
        if (choice === q.correctIndex) correct += 1;
      }
    }
    return { answered, correct, total: visibleQuestions.length };
  });

  function selectChoice(qid: string, idx: number) {
    appState.quizAnswers = { ...appState.quizAnswers, [qid]: idx };
    appState.saveToStorage();
  }

  function resetQuiz() {
    appState.quizAnswers = {};
    appState.saveToStorage();
  }
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div class="flex items-center gap-2">
      <HelpCircle class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Quiz Interactif Auto-Corrigé — Cycle 4</h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Vérifiez vos connaissances avant l’évaluation ou le DNB (résultats sauvegardés hors ligne et intégrés à la Fiche Élève).
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <div class="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1 text-xs">
        {#each ['Tous', '5e', '4e', '3e'] as lvl}
          <button
            type="button"
            onclick={() => (selectedLevel = lvl as GradeLevel | 'Tous')}
            class="px-2.5 py-1 rounded-md font-semibold cursor-pointer {selectedLevel === lvl
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}"
          >
            {lvl}
          </button>
        {/each}
      </div>

      <span class="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 tabular-nums">
        Score : {scoreStats.correct} / {scoreStats.total}
      </span>

      <button
        type="button"
        onclick={resetQuiz}
        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5" /> Effacer
      </button>
    </div>
  </div>

  <div class="space-y-4">
    {#each visibleQuestions as q (q.id)}
      {@const picked = appState.quizAnswers[q.id]}
      {@const isCorrect = picked === q.correctIndex}
      <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[11px] font-mono font-bold text-sky-700 dark:text-sky-400">{q.level} · {q.competency}</span>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{q.question}</h4>
          </div>
          {#if isSpeechAvailable()}
            <button
              type="button"
              onclick={() => speakFrench(`${q.question}. ${q.choices.join('. ')}`)}
              title="Lire la question à voix haute (EBEP)"
              class="p-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
              aria-label="Écouter la question"
            >
              <Volume2 class="w-3.5 h-3.5" />
            </button>
          {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {#each q.choices as choice, idx}
            {@const chosen = picked === idx}
            {@const showRight = picked !== undefined && idx === q.correctIndex}
            {@const showWrong = chosen && idx !== q.correctIndex}
            <button
              type="button"
              onclick={() => selectChoice(q.id, idx)}
              class="text-left p-2.5 rounded-lg border font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 {showRight
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-semibold'
                : showWrong
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-600 text-slate-800 dark:text-slate-200'}"
            >
              <span>{choice}</span>
              {#if showRight}
                <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {:else if showWrong}
                <XCircle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              {/if}
            </button>
          {/each}
        </div>

        {#if picked !== undefined}
          <div class="text-xs px-3 py-2 rounded-lg border {isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'}">
            <strong>{isCorrect ? 'Bonne réponse :' : 'Correction :'}</strong> {q.explanation}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>
