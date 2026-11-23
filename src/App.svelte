<script lang="ts">
  import { CheckCircle2, Info, XCircle } from 'lucide-svelte';
  import HeaderBar from './components/layout/HeaderBar.svelte';
  import PedagogicalGuide from './components/layout/PedagogicalGuide.svelte';
  import PrintLayout from './components/layout/PrintLayout.svelte';
  import Tab1Discovery from './components/tab1/Tab1Discovery.svelte';
  import Tab2ElectronicsLab from './components/tab2/Tab2ElectronicsLab.svelte';
  import Tab3NetworkMqtt from './components/tab3/Tab3NetworkMqtt.svelte';
  import Tab4Worksheets from './components/tab4/Tab4Worksheets.svelte';
  import Tab5Comparisons from './components/tab5/Tab5Comparisons.svelte';
  import Tab6TeacherGuide from './components/tab6/Tab6TeacherGuide.svelte';
  import Tab7Revision from './components/tab7/Tab7Revision.svelte';
  import { appState } from './lib/stores/appState.svelte';
</script>

<div class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
  <HeaderBar />

  <div class="flex-grow max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row lg:items-start gap-6 no-print">
    <PedagogicalGuide />

    <main class="flex-1 min-w-0">
      {#if appState.activeTab === 1}
        <Tab1Discovery />
      {:else if appState.activeTab === 2}
        <Tab2ElectronicsLab />
      {:else if appState.activeTab === 3}
        <Tab3NetworkMqtt />
      {:else if appState.activeTab === 4}
        <Tab4Worksheets />
      {:else if appState.activeTab === 5}
        <Tab5Comparisons />
      {:else if appState.activeTab === 6}
        <Tab6TeacherGuide />
      {:else if appState.activeTab === 7}
        <Tab7Revision />
      {/if}
    </main>
  </div>

  <PrintLayout />

  <footer class="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 mt-8 no-print">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span>Kit Pédagogique « Lunettes Connectées IA » · Cycle 4 Technologie (5e / 4e / 3e)</span>
      <span>TechnoLOY Guadeloupe · Conforme BO n° 9 du 29 février 2024 · Alimentation 5 V USB non EPI</span>
    </div>
  </footer>

  {#if appState.toastMessage}
    <div
      role="status"
      class="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-start gap-2.5 no-print"
    >
      {#if appState.toastTone === 'success'}
        <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
      {:else if appState.toastTone === 'error'}
        <XCircle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      {:else}
        <Info class="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
      {/if}
      <span class="leading-relaxed">{appState.toastMessage}</span>
    </div>
  {/if}
</div>
