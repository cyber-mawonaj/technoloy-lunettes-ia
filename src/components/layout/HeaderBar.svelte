<script lang="ts">
  import { Accessibility, Download, FileDown, FolderUp, Moon, Printer, Sun } from 'lucide-svelte';
  import type { GradeLevel } from '../../lib/data/curriculum';
  import { appState } from '../../lib/stores/appState.svelte';
  import { generateStudentSheetPdf } from '../../lib/utils/pdfExport';
  import PWAControls from '../pwa/PWAControls.svelte';
  import PwaStatus from '../pwa/PwaStatus.svelte';

  let fileInputEl: HTMLInputElement | undefined = $state();
  let isGeneratingPdf = $state(false);

  const TABS = [
    { id: 1, label: '1. Découverte 3D' },
    { id: 2, label: '2. Labo & Blocs' },
    { id: 3, label: '3. Réseau MQTT' },
    { id: 4, label: '4. Fiches Élèves' },
    { id: 5, label: '5. Comparatifs' },
    { id: 6, label: '6. Guide Prof' },
    { id: 7, label: '7. Révision Cycle 4' },
  ];

  function handleLevelChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as GradeLevel;
    appState.syncNiveau(val);
  }

  function handlePrint() {
    appState.capturePrintSnapshots();
    window.setTimeout(() => window.print(), 80);
  }

  async function handleGeneratePdf() {
    if (isGeneratingPdf) return;
    isGeneratingPdf = true;
    try {
      await generateStudentSheetPdf();
    } finally {
      isGeneratingPdf = false;
    }
  }

  function handleImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      appState.importStudentJSON(file);
      input.value = '';
    }
  }
</script>

<!-- Top Bar Contract: 3 zones cleanly separated, single-line controls -->
<header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 no-print">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
    <!-- Zone 1: Brand Wordmark -->
    <button
      type="button"
      onclick={() => (appState.activeTab = 1)}
      class="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
    >
      Lunettes Connectées IA
    </button>

    <!-- Zone 2: Clean Single-Line Navigation Links -->
    <nav aria-label="Navigation principale" class="hidden xl:flex items-center gap-5 text-xs font-medium">
      {#each TABS as tab}
        <button
          type="button"
          onclick={() => (appState.activeTab = tab.id)}
          class="py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer {appState.activeTab === tab.id
            ? 'border-sky-600 dark:border-sky-400 text-sky-700 dark:text-sky-300 font-semibold'
            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}"
        >
          {tab.label}
        </button>
      {/each}
    </nav>

    <!-- Zone 3: Primary Action & PWA -->
    <div class="flex items-center gap-2.5 shrink-0">
      <PwaStatus />
      <PWAControls />
      <button
        type="button"
        onclick={handlePrint}
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Printer class="w-3.5 h-3.5" />
        Imprimer A4
      </button>
    </div>
  </div>

  <!-- Responsive Tab Bar for tablet / mobile / standard laptops -->
  <div class="xl:hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
    <div class="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto">
      {#each TABS as tab}
        <button
          type="button"
          onclick={() => (appState.activeTab = tab.id)}
          class="px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer {appState.activeTab === tab.id
            ? 'bg-sky-600 text-white'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </div>
</header>

<!-- Student Identification & Accessibility Workspace Toolbar (below header, non-sticky) -->
<section class="bg-slate-100 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 no-print">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 flex-grow text-xs">
      <div>
        <label for="stuNom" class="block text-slate-600 dark:text-slate-300 font-medium mb-1">Nom</label>
        <input
          id="stuNom"
          type="text"
          bind:value={appState.studentInfo.nom}
          oninput={() => appState.saveToStorage()}
          placeholder="ex : MONDÉSIR"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <div>
        <label for="stuPrenom" class="block text-slate-600 dark:text-slate-300 font-medium mb-1">Prénom</label>
        <input
          id="stuPrenom"
          type="text"
          bind:value={appState.studentInfo.prenom}
          oninput={() => appState.saveToStorage()}
          placeholder="ex : Kélyan"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <div>
        <label for="stuNiveau" class="block text-slate-600 dark:text-slate-300 font-medium mb-1">Niveau scolaire</label>
        <select
          id="stuNiveau"
          value={appState.studentInfo.niveau}
          onchange={handleLevelChange}
          class="w-full bg-white dark:bg-slate-950 border border-sky-300 dark:border-sky-700 rounded-md px-2 py-1.5 text-sky-900 dark:text-sky-200 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="5e">5e · Lumière & Sécurité</option>
          <option value="4e">4e · Obstacle & OLED</option>
          <option value="3e">3e · IHM & MQTT T14</option>
        </select>
      </div>
      <div>
        <label for="stuClasse" class="block text-slate-600 dark:text-slate-300 font-medium mb-1">Classe</label>
        <input
          id="stuClasse"
          type="text"
          bind:value={appState.studentInfo.classe}
          oninput={() => appState.saveToStorage()}
          placeholder="ex : 3e B"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <div>
        <label for="stuGroupe" class="block text-slate-600 dark:text-slate-300 font-medium mb-1">Groupe / Binôme</label>
        <input
          id="stuGroupe"
          type="text"
          bind:value={appState.studentInfo.groupe}
          oninput={() => appState.saveToStorage()}
          placeholder="ex : Poste 1"
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
      <div>
        <label for="stuDate" class="block text-slate-600 dark:text-slate-300 font-medium mb-1">Date</label>
        <input
          id="stuDate"
          type="date"
          bind:value={appState.studentInfo.date}
          oninput={() => appState.saveToStorage()}
          class="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-slate-900 dark:text-slate-100 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
    </div>

    <!-- Workspace Utility Actions: Theme + EBEP + PDF + JSON Export/Import -->
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <button
        type="button"
        onclick={() => appState.toggleTheme()}
        aria-label={appState.theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
      >
        {#if appState.theme === 'dark'}
          <Sun class="w-3.5 h-3.5 text-amber-400" />
          Clair
        {:else}
          <Moon class="w-3.5 h-3.5 text-sky-600" />
          Sombre
        {/if}
      </button>

      <button
        type="button"
        onclick={() => appState.toggleEbep()}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer {appState.ebepMode
          ? 'bg-amber-500 border-amber-600 text-slate-950'
          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}"
      >
        <Accessibility class="w-3.5 h-3.5" />
        {appState.ebepMode ? 'Mode EBEP actif' : 'Mode EBEP (Dys/TSA)'}
      </button>

      <button
        type="button"
        onclick={handleGeneratePdf}
        disabled={isGeneratingPdf}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        <FileDown class="w-3.5 h-3.5" />
        {isGeneratingPdf ? 'Génération…' : 'Générer Fiche Élève'}
      </button>

      <button
        type="button"
        onclick={() => appState.exportStudentJSON()}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        <Download class="w-3.5 h-3.5" />
        Export JSON
      </button>

      <button
        type="button"
        onclick={() => fileInputEl?.click()}
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap cursor-pointer"
      >
        <FolderUp class="w-3.5 h-3.5" />
        Importer
      </button>
      <input
        bind:this={fileInputEl}
        type="file"
        accept="application/json"
        onchange={handleImportFile}
        class="hidden"
      />

      {#if appState.lastSavedAt}
        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap">
          Enregistré {appState.lastSavedAt}
        </span>
      {/if}
    </div>
  </div>
</section>
