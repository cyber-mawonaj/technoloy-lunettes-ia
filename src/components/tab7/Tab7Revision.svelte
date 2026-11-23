<script lang="ts">
  import { ExternalLink, Search } from 'lucide-svelte';
  import { GLOSSARY_ITEMS } from '../../lib/data/curriculum';
  import RevisionQuiz from './RevisionQuiz.svelte';
  import TroubleshootGuide from './TroubleshootGuide.svelte';

  let searchQuery = $state('');
  let categoryFilter = $state<'Toutes' | 'Architecture' | 'Réseau & MQTT' | 'Pédagogie & IA'>('Toutes');

  const filteredGlossary = $derived(
    GLOSSARY_ITEMS.filter((item) => {
      const matchCat = categoryFilter === 'Toutes' || item.category === categoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchText = !q || item.term.toLowerCase().includes(q) || item.def.toLowerCase().includes(q);
      return matchCat && matchText;
    }),
  );
</script>

<div class="space-y-6">
  <!-- Official STI Bordeaux Link -->
  <section class="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
    <div class="space-y-1.5 max-w-2xl">
      <div class="text-xs font-medium text-sky-300">
        Ressources officielles Éducation Nationale · Programme BO n° 9 du 29 février 2024
      </div>
      <h2 class="text-xl font-bold tracking-tight">
        Plateforme de Révision & Séquences STI — Académie de Bordeaux
      </h2>
      <p class="text-xs text-slate-300 leading-relaxed">
        Accédez aux fiches de connaissances nationales et aux synthèses du Cycle 4 (5e, 4e, 3e) pour consolider vos révisions.
      </p>
    </div>

    <a
      href="https://sequences.sti-ac-bordeaux.fr/#ressources"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
    >
      Ouvrir STI Bordeaux
      <ExternalLink class="w-4 h-4" />
    </a>
  </section>

  <!-- BO 2024 3 Themes -->
  <section class="grid grid-cols-1 md:grid-cols-3 gap-5">
    <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-2">
      <div class="text-xs font-mono font-bold text-sky-700 dark:text-sky-400">Thème 1 · BO 2024</div>
      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
        Les objets techniques, les services et les changements sociétaux
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        Analyse du besoin dans l’usine de M. Loyalle, ergonomie mains libres, sécurité au travail (non-EPI) et esprit critique sur l’automatisation et les biais.
      </p>
    </div>
    <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-2">
      <div class="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">Thème 2 · BO 2024</div>
      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
        Modélisation et comportement des systèmes techniques
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        Chaînes d’information et d’énergie, capteurs analogiques/numériques, logigrammes normalisés, programmation par blocs et protocoles de communication MQTT.
      </p>
    </div>
    <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-2">
      <div class="text-xs font-mono font-bold text-purple-700 dark:text-purple-400">Thème 3 · BO 2024</div>
      <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
        Démarche de création, conception et réalisation
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        Représentation 3D, dessins normalisés ISO E, montage Grove sans soudure, dépannage méthodique et validation expérimentale (5 essais 3e).
      </p>
    </div>
  </section>

  <!-- Searchable Glossary -->
  <section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">Glossaire Interactif Cycle 4</h3>

      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1 text-xs">
          {#each ['Toutes', 'Architecture', 'Réseau & MQTT', 'Pédagogie & IA'] as cat}
            <button
              type="button"
              onclick={() => (categoryFilter = cat as typeof categoryFilter)}
              class="px-2.5 py-1 rounded-md font-medium cursor-pointer {categoryFilter === cat
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}"
            >
              {cat}
            </button>
          {/each}
        </div>

        <div class="relative w-full sm:w-60">
          <Search class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Filtrer un terme..."
            aria-label="Rechercher dans le glossaire"
            class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {#each filteredGlossary as item (item.term)}
        <article class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-bold text-sky-800 dark:text-sky-300">{item.term}</h4>
            <span class="text-[11px] text-slate-500 dark:text-slate-400">{item.category}</span>
          </div>
          <p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.def}</p>
        </article>
      {/each}
    </div>
  </section>

  <!-- Auto-Graded Cycle 4 Quiz -->
  <RevisionQuiz />

  <!-- Interactive Student Troubleshooting Assistant -->
  <TroubleshootGuide />
</div>
