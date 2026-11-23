<script lang="ts">
  import { BrainCircuit, Scale } from 'lucide-svelte';

  interface AtelierCase {
    id: string;
    title: string;
    distanceCm: number;
    context: string;
    t14Result: 'ALERTE' | 'RAS';
    t14Reason: string;
    visionLabel: string;
    visionConfidence: number;
    limitation: string;
  }

  const CASES: AtelierCase[] = [
    {
      id: 'wing',
      title: 'Ouvrier proche d’une aile en composite',
      distanceCm: 14,
      context: 'Distance mesurée : 14 cm · Éclairage atelier normal.',
      t14Result: 'ALERTE',
      t14Reason: '14 < 20 cm : le seuil fixe déclenche immédiatement.',
      visionLabel: 'Obstacle structurel détecté',
      visionConfidence: 94,
      limitation: 'Règle T14 efficace sans apprentissage, mais ignore si c’est une pièce fragile ou un mur.',
    },
    {
      id: 'dark',
      title: 'Zone sombre sans obstacle proche',
      distanceCm: 48,
      context: 'Distance mesurée : 48 cm · Luminosité très faible (15 lux).',
      t14Result: 'RAS',
      t14Reason: '48 >= 20 cm : la règle distance T14 ne détecte rien.',
      visionLabel: 'Image sous-exposée (bruit capteur OV2640)',
      visionConfidence: 41,
      limitation: 'Un modèle de vision échoue dans le noir sans la LED blanche d’assistance (5e).',
    },
    {
      id: 'glare',
      title: 'Reflet brillant sur tôle d’aluminium',
      distanceCm: 17,
      context: 'Distance mesurée : 17 cm · Fort contre-jour sur métal poli.',
      t14Result: 'ALERTE',
      t14Reason: '17 < 20 cm : l’ultrason ignore l’éblouissement visuel.',
      visionLabel: 'Faux positif : reflet confondu avec étincelle',
      visionConfidence: 62,
      limitation: 'Complémentarité multi-capteurs : l’ultrason complète la caméra face aux biais optiques.',
    },
    {
      id: 'tool',
      title: 'Clé dynamométrique oubliée à 26 cm',
      distanceCm: 26,
      context: 'Distance mesurée : 26 cm · Outil posé dans la zone d’assemblage.',
      t14Result: 'RAS',
      t14Reason: '26 >= 20 cm : la règle de seuil ne déclenche pas (faux négatif potentiel).',
      visionLabel: 'Objet identifié : clé outil hors rangement',
      visionConfidence: 88,
      limitation: 'Seule une classification entraînée peut reconnaître la nature d’un objet au-delà du seuil fixe.',
    },
  ];

  let selectedId = $state(CASES[0].id);
  const current = $derived(CASES.find((c) => c.id === selectedId) ?? CASES[0]);
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div class="flex items-center gap-2">
      <Scale class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
          Atelier Esprit Critique : Règle à Seuil T14 vs IA de Vision (Simulée)
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Comparez le script déterministe utilisé en salle (<code>ia_atelier.py</code>) avec un modèle de reconnaissance visuelle simulé pour analyser biais et limites.
        </p>
      </div>
    </div>
  </div>

  <div class="flex flex-wrap gap-2 text-xs">
    {#each CASES as c (c.id)}
      <button
        type="button"
        onclick={() => (selectedId = c.id)}
        class="px-3 py-1.5 rounded-lg border font-semibold cursor-pointer {selectedId === c.id
          ? 'bg-sky-600 border-sky-700 text-white'
          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}"
      >
        {c.title}
      </button>
    {/each}
  </div>

  <div class="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2">
    <strong>Situation observée :</strong> {current.context}
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
    <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-2">
      <div class="font-bold text-slate-900 dark:text-slate-100">1. Règle déterministe T14 (<code>distance &lt; 20 cm</code>)</div>
      <div class="font-mono font-bold text-sm {current.t14Result === 'ALERTE' ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}">
        Décision : {current.t14Result}
      </div>
      <p class="text-slate-700 dark:text-slate-300 leading-relaxed">{current.t14Reason}</p>
    </div>

    <div class="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 space-y-2">
      <div class="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
        <BrainCircuit class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        2. Modèle IA de vision simulé (OV2640)
      </div>
      <div class="font-mono font-bold text-sm text-indigo-800 dark:text-indigo-300">
        {current.visionLabel} · Confiance : {current.visionConfidence} %
      </div>
      <p class="text-slate-700 dark:text-slate-300 leading-relaxed">{current.limitation}</p>
    </div>
  </div>
</section>
