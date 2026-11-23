<script lang="ts">
  import { Download, FolderUp, Trash2 } from 'lucide-svelte';
  import { QUIZ_QUESTIONS } from '../../lib/data/pedagogyPlus';
  import { appState } from '../../lib/stores/appState.svelte';

  interface CollectedRow {
    id: string;
    nom: string;
    prenom: string;
    classe: string;
    niveau: string;
    groupe: string;
    cablageOk: boolean;
    blocksCount: number;
    quizScore: string;
    protocolPass: string;
    exportedAt: string;
  }

  let rows = $state<CollectedRow[]>([]);
  let fileInput: HTMLInputElement | undefined = $state();

  async function handleFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;

    const added: CollectedRow[] = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const info = data.studentInfo ?? {};
        const level = String(info.niveau ?? data.labScenario ?? '3e');
        const diags = Array.isArray(data.electricalDiagnostics) ? data.electricalDiagnostics : [];
        const hasErr = diags.some((d: { severity?: string }) => d.severity === 'error');
        const blocksCount = Array.isArray(data.blockProgram) ? data.blockProgram.length : 0;

        // Quiz score computation
        const quizAns = data.quizAnswers ?? {};
        const lvlQs = QUIZ_QUESTIONS.filter((q) => q.level === level);
        let good = 0;
        for (const q of lvlQs) {
          if (quizAns[q.id] === q.correctIndex) good += 1;
        }

        const pRows = Array.isArray(data.protocolRows) ? data.protocolRows : [];
        const pOk = pRows.filter((r: { pass?: boolean }) => r.pass).length;

        added.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          nom: String(info.nom || '---'),
          prenom: String(info.prenom || '---'),
          classe: String(info.classe || '---'),
          niveau: level,
          groupe: String(info.groupe || '---'),
          cablageOk: !hasErr,
          blocksCount,
          quizScore: lvlQs.length > 0 ? `${good}/${lvlQs.length}` : '---',
          protocolPass: pRows.length > 0 ? `${pOk}/${pRows.length}` : '---',
          exportedAt: data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('fr-FR') : '---',
        });
      } catch {
        appState.showToast(`Fichier ignoré (JSON invalide) : ${file.name}`, 'error');
      }
    }

    rows = [...rows, ...added];
    input.value = '';
    if (added.length > 0) {
      appState.showToast(`${added.length} dossier(s) élève importé(s) dans le collecteur.`, 'success');
    }
  }

  function exportCsv() {
    if (rows.length === 0) return;
    const header = ['Nom', 'Prenom', 'Classe', 'Niveau', 'Groupe', 'CablageConforme', 'NbBlocs', 'ScoreQuiz', 'Essais3e', 'DateExport'];
    const lines = [
      header.join(';'),
      ...rows.map((r) =>
        [
          r.nom,
          r.prenom,
          r.classe,
          r.niveau,
          r.groupe,
          r.cablageOk ? 'OUI' : 'ERREUR',
          r.blocksCount,
          r.quizScore,
          r.protocolPass,
          r.exportedAt,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(';'),
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthese_classe_lunettes_ia.csv`;
    a.click();
    URL.revokeObjectURL(url);
    appState.showToast('Tableau récapitulatif CSV exporté pour Pronote / tableur.', 'success');
  }
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
        Collecteur de Dossiers Élèves (Import JSON Multiple & Export CSV)
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Déposez simultanément les fichiers <code>.json</code> remis par les binômes sur l’ENT pour obtenir le bilan de classe.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onclick={() => fileInput?.click()}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
      >
        <FolderUp class="w-3.5 h-3.5" /> Importer dossiers (.json)
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json"
        multiple
        onchange={handleFiles}
        class="hidden"
      />
      {#if rows.length > 0}
        <button
          type="button"
          onclick={exportCsv}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
        >
          <Download class="w-3.5 h-3.5" /> Export CSV
        </button>
        <button
          type="button"
          onclick={() => (rows = [])}
          class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" /> Vider
        </button>
      {/if}
    </div>
  </div>

  {#if rows.length === 0}
    <div class="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
      Aucun dossier élève importé pour le moment. Cliquez sur <strong>Importer dossiers (.json)</strong> pour sélectionner plusieurs copies.
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse tabular-nums">
        <thead>
          <tr class="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
            <th class="p-2 font-semibold">Élève</th>
            <th class="p-2 font-semibold">Classe</th>
            <th class="p-2 font-semibold">Niveau</th>
            <th class="p-2 font-semibold">Poste</th>
            <th class="p-2 font-semibold">Câblage</th>
            <th class="p-2 font-semibold">Blocs</th>
            <th class="p-2 font-semibold">Quiz</th>
            <th class="p-2 font-semibold">Essais 3e</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          {#each rows as r (r.id)}
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="p-2 font-semibold text-slate-900 dark:text-slate-100">{r.nom} {r.prenom}</td>
              <td class="p-2 dark:text-slate-300">{r.classe}</td>
              <td class="p-2 font-mono dark:text-slate-300">{r.niveau}</td>
              <td class="p-2 dark:text-slate-300">{r.groupe}</td>
              <td class="p-2 font-semibold {r.cablageOk ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}">
                {r.cablageOk ? 'Conforme' : 'Erreur'}
              </td>
              <td class="p-2 font-mono dark:text-slate-300">{r.blocksCount}</td>
              <td class="p-2 font-mono font-semibold text-sky-700 dark:text-sky-400">{r.quizScore}</td>
              <td class="p-2 font-mono dark:text-slate-300">{r.protocolPass}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
