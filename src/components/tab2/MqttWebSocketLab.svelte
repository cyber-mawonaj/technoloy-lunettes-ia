<script lang="ts">
  import mqtt, { type MqttClient } from 'mqtt';
  import { onDestroy } from 'svelte';
  import { Copy, Play, Plug, Radio, Send, Trash2, Unplug, Users } from 'lucide-svelte';
  import { appState } from '../../lib/stores/appState.svelte';

  interface JsonMqttMessage {
    id: string;
    time: string;
    topic: string;
    mode: 'simulated' | 'live';
    status: 'delivered' | 'dropped';
    latencyMs: number;
    payload: string;
  }

  let wsUrl = $state(`ws://localhost:9001`);
  let topicPath = $state(`${appState.topicBase}/telemetrie`);
  let clientId = $state('lunettes-eleve-poste1');
  let mode = $state<'simulated' | 'live'>('simulated');
  let autoPublish = $state(true);
  let showClassMonitor = $state(false);

  let connected = $state(false);
  let connecting = $state(false);
  let statusMessage = $state('Non connecté · Prêt à simuler ou connecter un broker WebSocket local.');
  let messages = $state<JsonMqttMessage[]>([]);
  let mqttClient: MqttClient | null = null;
  let lastAutoSignature = '';

  const liveJsonObject = $derived({
    device: clientId || 'lunettes-eleve-poste1',
    niveau: appState.studentInfo.niveau,
    poste: appState.studentInfo.groupe || 'Poste 1',
    timestamp: new Date().toISOString(),
    capteurs: {
      scenario: appState.labScenario,
      luminosite_lux: appState.luxValue,
      distance_cm: appState.distValue,
      seuil_actif: appState.activeThreshold,
      bouton_A: appState.btnAPressed,
      bouton_B: appState.btnBPressed,
    },
    actionneurs: {
      led_blanche: appState.isLedActive,
      buzzer_2khz: appState.isBuzzerActive,
      oled_hud: appState.isOledActive ? appState.ihModeLabel : 'OFF',
    },
    securite_electrique: {
      court_circuit_grille: appState.electronicGridShort,
      erreur_shield_grove: appState.hasElectricalError,
      cablage_conforme: !appState.hasElectricalError && !appState.electronicGridShort,
    },
    decision_t14: appState.isConditionTriggered ? 'ALERTE' : 'RAS',
  });

  const liveJsonPreview = $derived(JSON.stringify(liveJsonObject, null, 2));

  // Class supervision view: Poste 1 reflects live student setup; Postes 2-8 represent classroom peers
  const classStations = $derived([
    {
      poste: appState.studentInfo.groupe || 'Poste 1 (Votre montage)',
      dist: appState.distValue,
      led: appState.isLedActive,
      fault: appState.hasElectricalError || appState.electronicGridShort,
      decision: appState.isConditionTriggered ? 'ALERTE' : 'RAS',
    },
    { poste: 'Poste 2 · Îlot A', dist: 34, led: false, fault: false, decision: 'RAS' },
    { poste: 'Poste 3 · Îlot A', dist: 14, led: true, fault: false, decision: 'ALERTE' },
    { poste: 'Poste 4 · Îlot B', dist: 28, led: false, fault: false, decision: 'RAS' },
    { poste: 'Poste 5 · Îlot B', dist: 11, led: false, fault: true, decision: 'PANNE FIL' },
    { poste: 'Poste 6 · Îlot C', dist: 42, led: false, fault: false, decision: 'RAS' },
    { poste: 'Poste 7 · Îlot C', dist: 17, led: true, fault: false, decision: 'ALERTE' },
    { poste: 'Poste 8 · Îlot D', dist: 25, led: false, fault: false, decision: 'RAS' },
  ]);

  onDestroy(() => {
    mqttClient?.end(true);
    mqttClient = null;
  });

  function appendMessage(payloadObj: Record<string, unknown>, msgMode: 'simulated' | 'live') {
    const formatted = JSON.stringify(payloadObj, null, 2);
    const lossRoll = Math.random() * 100;
    const dropped = appState.mqttSimLossPct > 0 && lossRoll < appState.mqttSimLossPct;
    const latency = appState.mqttSimLatencyMs;

    const deliver = () => {
      const entry: JsonMqttMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: new Date().toLocaleTimeString('fr-FR'),
        topic: topicPath || `${appState.topicBase}/telemetrie`,
        mode: msgMode,
        status: dropped ? 'dropped' : 'delivered',
        latencyMs: latency,
        payload: dropped ? '// Paquet perdu sur Wi-Fi simulé (QoS 0)' : formatted,
      };
      messages = [entry, ...messages.slice(0, 19)];
      if (!dropped) {
        appState.mqttSentCount += 1;
        appState.lastMqttJsonPayload = formatted;
      }
    };

    if (latency > 0) {
      window.setTimeout(deliver, Math.min(latency, 900));
    } else {
      deliver();
    }
  }

  function connectBroker() {
    if (connected) {
      disconnectBroker();
      return;
    }

    if (mode === 'simulated') {
      connected = true;
      connecting = false;
      appState.wsStatus = 'connected';
      statusMessage = `Broker MQTT local simulé actif sur ${wsUrl} (client: ${clientId})`;
      appState.pushTerminalLog(`[WS SIMULÉ] Connexion établie avec ${wsUrl} (${topicPath})`, 'ws');
      publishCurrentJson();
      return;
    }

    connecting = true;
    appState.wsStatus = 'connecting';
    statusMessage = `Connexion WebSocket en cours vers ${wsUrl}...`;

    try {
      mqttClient = mqtt.connect(wsUrl, {
        clientId: clientId || undefined,
        reconnectPeriod: 0,
        connectTimeout: 4000,
      });

      mqttClient.on('connect', () => {
        connecting = false;
        connected = true;
        appState.wsStatus = 'connected';
        statusMessage = `Connecté au broker WebSocket réel : ${wsUrl}`;
        mqttClient?.subscribe(topicPath);
        appState.pushTerminalLog(`[WS RÉEL] Connecté à ${wsUrl}`, 'ok');
        publishCurrentJson();
      });

      mqttClient.on('error', (err) => {
        connecting = false;
        connected = false;
        appState.wsStatus = 'error';
        statusMessage = `Broker inaccessible (${err.message}). Basculez en mode « Simulateur Local » hors ligne.`;
        mqttClient?.end(true);
        mqttClient = null;
      });
    } catch {
      connecting = false;
      connected = false;
      appState.wsStatus = 'error';
      statusMessage = 'URL WebSocket invalide ou bloquée. Utilisez ws://localhost:9001 ou le mode Simulateur Local.';
    }
  }

  function disconnectBroker() {
    mqttClient?.end(true);
    mqttClient = null;
    connected = false;
    connecting = false;
    appState.wsStatus = 'disconnected';
    statusMessage = 'Déconnecté du broker MQTT WebSocket.';
  }

  function publishCurrentJson() {
    const payload = {
      ...liveJsonObject,
      timestamp: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(payload);
    if (mode === 'live' && mqttClient && connected) {
      mqttClient.publish(topicPath, jsonStr);
    }
    appendMessage(payload, mode);
    appState.pushTerminalLog(
      `[MQTT JSON] ${topicPath} -> LED=${payload.actionneurs.led_blanche ? 'ON' : 'OFF'} | Décision=${payload.decision_t14}`,
      payload.decision_t14 === 'ALERTE' ? 'alert' : 'ok',
    );
  }

  $effect(() => {
    const sig = JSON.stringify({
      s: appState.labScenario,
      l: appState.luxValue,
      d: appState.distValue,
      t: appState.activeThreshold,
      a: appState.btnAPressed,
      b: appState.btnBPressed,
      led: appState.isLedActive,
      buz: appState.isBuzzerActive,
      err: appState.hasElectricalError,
      gridShort: appState.electronicGridShort,
    });
    if (connected && autoPublish && sig !== lastAutoSignature) {
      lastAutoSignature = sig;
      publishCurrentJson();
    } else if (!connected) {
      lastAutoSignature = sig;
    }
  });

  function copyJson(payload: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(payload).then(() => {
        appState.showToast('Trame JSON copiée dans le presse-papiers.', 'success');
      });
    }
  }
</script>

<section class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900 dark:text-slate-100">
        Passerelle WebSocket MQTT Locale — Flux JSON, Perturbations & Supervision Classe
      </h3>
      <p class="text-xs text-slate-600 dark:text-slate-400">
        Configurez la connexion WebSocket vers un broker MQTT local, simulez la latence Wi-Fi et visualisez les trames JSON envoyées par le montage.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onclick={() => (showClassMonitor = !showClassMonitor)}
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold cursor-pointer {showClassMonitor
          ? 'bg-indigo-600 border-indigo-700 text-white'
          : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}"
      >
        <Users class="w-3.5 h-3.5" />
        {showClassMonitor ? 'Masquer Postes 1–8' : 'Vue Classe (Postes 1–8)'}
      </button>

      <div class="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-xs">
        <button
          type="button"
          onclick={() => {
            if (connected) disconnectBroker();
            mode = 'simulated';
          }}
          class="px-2.5 py-1 rounded-md font-semibold cursor-pointer {mode === 'simulated'
            ? 'bg-sky-600 text-white'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}"
        >
          Simulateur Local
        </button>
        <button
          type="button"
          onclick={() => {
            if (connected) disconnectBroker();
            mode = 'live';
          }}
          class="px-2.5 py-1 rounded-md font-semibold cursor-pointer {mode === 'live'
            ? 'bg-sky-600 text-white'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}"
        >
          Broker Réel (:9001)
        </button>
      </div>
    </div>
  </div>

  <!-- WebSocket Configuration Bar -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
    <div>
      <label for="labWsUrl" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">URL WebSocket MQTT</label>
      <input
        id="labWsUrl"
        type="text"
        bind:value={wsUrl}
        placeholder="ws://localhost:9001"
        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
      <div class="flex gap-1.5 mt-1 text-[10px]">
        <button
          type="button"
          onclick={() => (wsUrl = 'ws://localhost:9001')}
          class="text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
        >
          localhost:9001
        </button>
        <span class="text-slate-300 dark:text-slate-600">|</span>
        <button
          type="button"
          onclick={() => (wsUrl = 'ws://10.42.0.1:9001')}
          class="text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
        >
          10.42.0.1:9001
        </button>
      </div>
    </div>

    <div>
      <label for="labWsTopic" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Topic JSON cible</label>
      <input
        id="labWsTopic"
        type="text"
        bind:value={topicPath}
        placeholder="atelier/poste1/telemetrie"
        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>

    <div>
      <label for="labWsClient" class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Identifiant client (Client ID)</label>
      <input
        id="labWsClient"
        type="text"
        bind:value={clientId}
        class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-2.5 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>

    <div class="flex flex-col justify-between gap-2">
      <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
        <input type="checkbox" bind:checked={autoPublish} class="accent-sky-600 dark:accent-sky-400 cursor-pointer" />
        <span>Publier auto à chaque changement</span>
      </label>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={connectBroker}
          disabled={connecting}
          class="flex-grow inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-semibold cursor-pointer {connected
            ? 'bg-rose-600 hover:bg-rose-700 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'}"
        >
          {#if connected}
            <Unplug class="w-3.5 h-3.5" /> Déconnecter
          {:else}
            <Plug class="w-3.5 h-3.5" /> {connecting ? 'Connexion…' : 'Connecter WS'}
          {/if}
        </button>

        <button
          type="button"
          onclick={publishCurrentJson}
          title="Envoyer la trame JSON actuelle"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer"
        >
          <Send class="w-3.5 h-3.5" /> Émettre
        </button>
      </div>
    </div>
  </div>

  <!-- Network Latency & Packet Loss Simulation Controls (3e Experimental Protocol) -->
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
    <label class="flex items-center justify-between gap-3">
      <span class="font-medium text-slate-700 dark:text-slate-300">Latence réseau simulée : <strong class="font-mono text-sky-700 dark:text-sky-400">{appState.mqttSimLatencyMs} ms</strong></span>
      <input
        type="range"
        min="0"
        max="800"
        step="20"
        bind:value={appState.mqttSimLatencyMs}
        class="w-36 accent-sky-600 dark:accent-sky-400 cursor-pointer"
      />
    </label>
    <label class="flex items-center justify-between gap-3">
      <span class="font-medium text-slate-700 dark:text-slate-300">Perte paquets QoS 0 : <strong class="font-mono text-amber-700 dark:text-amber-400">{appState.mqttSimLossPct} %</strong></span>
      <input
        type="range"
        min="0"
        max="30"
        step="5"
        bind:value={appState.mqttSimLossPct}
        class="w-36 accent-amber-600 dark:accent-amber-400 cursor-pointer"
      />
    </label>
  </div>

  <!-- Optional Classroom Multi-Station Monitor (Postes 1 to 8) -->
  {#if showClassMonitor}
    <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800 space-y-2.5">
      <div class="text-xs font-bold text-indigo-950 dark:text-indigo-200">
        Supervision Atelier TechnoLOY — Postes 1 à 8 ({appState.brokerIp}:1883)
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
        {#each classStations as st}
          <div
            class="p-2.5 rounded-lg border space-y-1 {st.fault
              ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/50'
              : st.decision === 'ALERTE'
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/50'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}"
          >
            <div class="font-semibold text-slate-900 dark:text-slate-100 truncate">{st.poste}</div>
            <div class="font-mono text-[11px] text-slate-600 dark:text-slate-400">Dist : {st.dist} cm · LED : {st.led ? 'ON' : 'OFF'}</div>
            <div class="font-mono text-[11px] font-bold {st.fault ? 'text-rose-700 dark:text-rose-400' : st.decision === 'ALERTE' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}">
              {st.decision}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Connection Status Strip -->
  <div
    class="flex items-center justify-between gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium {connected
      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}"
  >
    <div class="flex items-center gap-2">
      <Radio class="w-4 h-4 {connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} shrink-0" />
      <span>{statusMessage}</span>
    </div>
    <span class="font-mono text-[11px] font-semibold">
      {messages.length} trame(s)
    </span>
  </div>

  <!-- Dual View: Live Payload Preview + Stream of Sent JSON Messages -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div class="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-sky-300 font-mono">Trame JSON en temps réel ({topicPath})</span>
        <button
          type="button"
          onclick={() => copyJson(liveJsonPreview)}
          class="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white cursor-pointer"
        >
          <Copy class="w-3 h-3" /> Copier
        </button>
      </div>
      <pre class="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-60 leading-relaxed">{liveJsonPreview}</pre>
    </div>

    <div class="bg-slate-950 rounded-xl p-3.5 border border-slate-800 space-y-2 flex flex-col">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-amber-300 font-mono flex items-center gap-1.5">
          <Play class="w-3 h-3" /> Journal des messages JSON reçus par le broker
        </span>
        <button
          type="button"
          onclick={() => (messages = [])}
          class="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
        >
          <Trash2 class="w-3 h-3" /> Effacer
        </button>
      </div>

      <div class="overflow-y-auto max-h-60 space-y-2 pr-1">
        {#if messages.length === 0}
          <div class="text-xs text-slate-400 py-8 text-center">
            Cliquez sur <strong>Connecter WS</strong> ou <strong>Émettre</strong> pour observer les messages JSON envoyés par le montage.
          </div>
        {:else}
          {#each messages as msg (msg.id)}
            <div class="rounded-lg border p-2.5 space-y-1 {msg.status === 'dropped' ? 'bg-rose-950/40 border-rose-800' : 'bg-slate-900 border-slate-800'}">
              <div class="flex items-center justify-between text-[10px] font-mono">
                <span class="text-sky-400 font-semibold">{msg.topic}</span>
                <span class={msg.status === 'dropped' ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  {msg.time} · {msg.latencyMs} ms · {msg.status === 'dropped' ? 'PERDU' : msg.mode === 'live' ? 'WS Réel' : 'Simulé'}
                </span>
              </div>
              <pre class="text-[11px] font-mono text-slate-200 overflow-x-auto leading-snug">{msg.payload}</pre>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</section>
