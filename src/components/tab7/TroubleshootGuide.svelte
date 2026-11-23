<script lang="ts">
  import { Wrench } from 'lucide-svelte';
  import { TROUBLESHOOT_CASES } from '../../lib/data/pedagogyPlus';

  let selectedId = $state(TROUBLESHOOT_CASES[0].id);
  const current = $derived(TROUBLESHOOT_CASES.find((t) => t.id === selectedId) ?? TROUBLESHOOT_CASES[0]);
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
    <Wrench class="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Assistant de Dépannage Méthodique Élève</h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Sélectionnez le symptôme observé sur votre prototype pour identifier la cause et corriger la panne.
      </p>
    </div>
  </div>

  <div class="flex flex-wrap gap-2 text-xs">
    {#each TROUBLESHOOT_CASES as tc (tc.id)}
      <button
        type="button"
        onclick={() => (selectedId = tc.id)}
        class="px-3 py-1.5 rounded-lg border font-semibold cursor-pointer {selectedId === tc.id
          ? 'bg-amber-500 border-amber-600 text-slate-950'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}"
      >
        {tc.symptom}
      </button>
    {/each}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
    <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
      <div class="font-bold text-slate-900 dark:text-slate-100">Points de contrôle dans l’ordre :</div>
      <ul class="list-disc pl-4 space-y-1.5 text-slate-700 dark:text-slate-300">
        {#each current.checks as chk}
          <li>{chk}</li>
        {/each}
      </ul>
    </div>
    <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-2">
      <div class="font-bold text-emerald-950 dark:text-emerald-200">Action corrective recommandée :</div>
      <p class="text-emerald-900 dark:text-emerald-300 leading-relaxed font-medium">{current.fix}</p>
    </div>
  </div>
</section>
