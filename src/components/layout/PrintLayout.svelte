<script lang="ts">
  import { WORKSHEETS_BY_LEVEL } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';

  const questions = $derived(WORKSHEETS_BY_LEVEL[appState.studentInfo.niveau]);
</script>

<!-- Dedicated A4 Print-Only Report -->
<div class="print-only space-y-5 text-black">
  <!-- Persistent Student Banner at top of printed A4 copy -->
  <header class="border-b-2 border-slate-900 pb-3 flex justify-between items-start gap-4">
    <div>
      <h1 class="text-lg font-bold">Lunettes Connectées à l’IA — Dossier Élève Cycle 4</h1>
      <p class="text-xs text-slate-700">TechnoLOY Guadeloupe · Programme Technologie BO n° 9 (29 février 2024)</p>
    </div>
    <div class="text-right text-xs font-mono leading-snug">
      <div><strong>Élève :</strong> {appState.studentInfo.prenom || '---'} {appState.studentInfo.nom || '---'}</div>
      <div><strong>Niveau :</strong> {appState.studentInfo.niveau} · <strong>Classe :</strong> {appState.studentInfo.classe || '---'}</div>
      <div><strong>Groupe :</strong> {appState.studentInfo.groupe || '---'} · <strong>Date :</strong> {appState.studentInfo.date}</div>
    </div>
  </header>

  <!-- Captured 3D Model Snapshot + Flowchart / Topology Snapshots -->
  {#if appState.threeSnapshotUrl || appState.logigrammeSnapshotUrl || appState.networkSnapshotUrl}
    <section class="space-y-3 print-break-inside-avoid">
      <h2 class="text-sm font-bold border-b border-slate-300 pb-1">1. Captures Techniques (Maquette 3D, Logigramme & Réseau)</h2>
      <div class="grid grid-cols-2 gap-3">
        {#if appState.threeSnapshotUrl}
          <div class="border border-slate-300 rounded p-2">
            <div class="text-[10px] font-bold mb-1">Vue 3D PBR ({appState.viewMode3D === 'exploded' ? 'Éclatée' : 'Assemblage'})</div>
            <img src={appState.threeSnapshotUrl} alt="Capture 3D des lunettes" class="w-full h-44 object-contain" />
          </div>
        {/if}
        {#if appState.logigrammeSnapshotUrl}
          <div class="border border-slate-300 rounded p-2">
            <div class="text-[10px] font-bold mb-1">Logigramme actif (Seuil : {appState.activeThreshold})</div>
            <img src={appState.logigrammeSnapshotUrl} alt="Capture logigramme" class="w-full h-44 object-contain" />
          </div>
        {/if}
      </div>
      {#if appState.networkSnapshotUrl}
        <div class="border border-slate-300 rounded p-2">
          <div class="text-[10px] font-bold mb-1">Topologie Réseau MQTT ({appState.brokerIp} · {appState.topicBase}/*)</div>
          <img src={appState.networkSnapshotUrl} alt="Capture topologie réseau" class="w-full h-40 object-contain" />
        </div>
      {/if}
    </section>
  {/if}

  <!-- Lab Diagnostics & Blocks Summary -->
  <section class="space-y-2 print-break-inside-avoid">
    <h2 class="text-sm font-bold border-b border-slate-300 pb-1">2. Synthèse Laboratoire Électronique & Blocs ({appState.labScenario})</h2>
    <div class="text-xs space-y-1">
      {#each appState.electricalDiagnostics as d}
        <div><strong>[{d.code}]</strong> {d.message}</div>
      {/each}
      <div class="pt-1 font-mono">
        <strong>Blocs assemblés :</strong> {appState.blockProgram.map((b) => b.label).join(' -> ')}
      </div>
    </div>
  </section>

  <!-- Worksheet Answers -->
  <section class="space-y-3">
    <h2 class="text-sm font-bold border-b border-slate-300 pb-1">3. Réponses aux Activités Élève ({appState.studentInfo.niveau})</h2>
    {#each questions as q}
      <div class="border border-slate-300 rounded p-3 space-y-1.5 print-break-inside-avoid">
        <div class="text-xs font-bold">{q.code} — {q.title}</div>
        <div class="text-[11px] text-slate-700">{q.prompt}</div>
        {#if q.type === 'chain'}
          <div class="text-xs font-mono pt-1">
            Acquérir : {appState.worksheetAnswers[`${q.id}_acq`] || '___________'} |
            Traiter : {appState.worksheetAnswers[`${q.id}_trt`] || '___________'} |
            Communiquer : {appState.worksheetAnswers[`${q.id}_com`] || '___________'}
          </div>
        {:else}
          <div class="text-xs bg-slate-50 border border-slate-200 rounded p-2 min-h-[42px] whitespace-pre-wrap">
            {appState.worksheetAnswers[q.id] || '(Non renseigné)'}
          </div>
        {/if}
      </div>
    {/each}
  </section>

  <!-- 3e Protocol Matrix Summary if applicable -->
  {#if appState.studentInfo.niveau === '3e'}
    <section class="space-y-2 print-break-inside-avoid">
      <h2 class="text-sm font-bold border-b border-slate-300 pb-1">4. Protocole d’Essais Expérimentaux (3e)</h2>
      <table class="w-full text-[10px] border-collapse border border-slate-400 tabular-nums">
        <thead>
          <tr class="bg-slate-100">
            <th class="border border-slate-400 p-1">Essai</th>
            <th class="border border-slate-400 p-1">Distance (cm)</th>
            <th class="border border-slate-400 p-1">Attendu</th>
            <th class="border border-slate-400 p-1">Observé</th>
            <th class="border border-slate-400 p-1">Délai (s)</th>
            <th class="border border-slate-400 p-1">Conformité</th>
            <th class="border border-slate-400 p-1">Observation</th>
          </tr>
        </thead>
        <tbody>
          {#each appState.protocolRows as r, idx}
            <tr>
              <td class="border border-slate-400 p-1 text-center">{idx + 1}</td>
              <td class="border border-slate-400 p-1 text-center">{r.dist}</td>
              <td class="border border-slate-400 p-1 text-center">{r.exp}</td>
              <td class="border border-slate-400 p-1 text-center">{r.obs}</td>
              <td class="border border-slate-400 p-1 text-center">{r.delay}</td>
              <td class="border border-slate-400 p-1 text-center">{r.pass ? 'OUI' : 'NON'}</td>
              <td class="border border-slate-400 p-1">{r.note}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
</div>
