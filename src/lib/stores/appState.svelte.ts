import type { GradeLevel } from '../data/curriculum';

export interface StudentInfo {
  nom: string;
  prenom: string;
  niveau: GradeLevel;
  classe: string;
  groupe: string;
  date: string;
}

export interface WireConnection {
  id: string;
  fromPort: string; // e.g. 'P0', 'P1', 'P2', 'I2C', '3V', 'GND'
  toModule: string; // e.g. 'lux', 'ultra', 'led', 'buzzer', 'oled'
  toPin: string;    // e.g. 'SIG', '5V', 'GND'
  wireColor: 'yellow' | 'red' | 'black' | 'blue';
}

export interface ElectricalDiagnostic {
  severity: 'ok' | 'warning' | 'error';
  code: string;
  message: string;
}

export interface BlockNode {
  id: string;
  kind:
    | 'read_sensor'
    | 'if_below'
    | 'else_branch'
    | 'set_led'
    | 'set_buzzer'
    | 'set_oled'
    | 'send_mqtt'
    | 'on_button_a'
    | 'on_button_b';
  label: string;
  port?: 'P0' | 'P1' | 'P2' | 'I2C';
  threshold?: number;
  state?: 'ON' | 'OFF' | 'AUTO';
  text?: string;
}

export interface ProgramDraftSnapshot {
  id: string;
  name: string;
  savedAt: string;
  scenario: GradeLevel;
  blocks: BlockNode[];
  wires: WireConnection[];
}

export interface ProtocolRow {
  id: number;
  dist: number;
  exp: 'ALERTE' | 'RAS';
  obs: 'ALERTE' | 'RAS';
  delay: number;
  pass: boolean;
  note: string;
}

export interface TerminalLogEntry {
  id: string;
  time: string;
  text: string;
  tone: 'info' | 'cmd' | 'alert' | 'ok' | 'ws';
}

const STORAGE_KEY = 'technoloy_lunettes_pwa_v3';

function defaultDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDefaultWires(scenario: GradeLevel): WireConnection[] {
  if (scenario === '5e') {
    return [
      { id: 'w1', fromPort: 'P0', toModule: 'lux', toPin: 'SIG', wireColor: 'yellow' },
      { id: 'w2', fromPort: 'P1', toModule: 'led', toPin: 'SIG', wireColor: 'yellow' },
      { id: 'w3', fromPort: 'P2', toModule: 'buzzer', toPin: 'SIG', wireColor: 'yellow' },
    ];
  }
  if (scenario === '4e') {
    return [
      { id: 'w1', fromPort: 'P0', toModule: 'ultra', toPin: 'SIG', wireColor: 'yellow' },
      { id: 'w2', fromPort: 'I2C', toModule: 'oled', toPin: 'SDA/SCL', wireColor: 'blue' },
      { id: 'w3', fromPort: 'P2', toModule: 'buzzer', toPin: 'SIG', wireColor: 'yellow' },
    ];
  }
  return [
    { id: 'w1', fromPort: 'P0', toModule: 'ultra', toPin: 'SIG', wireColor: 'yellow' },
    { id: 'w2', fromPort: 'I2C', toModule: 'oled', toPin: 'SDA/SCL', wireColor: 'blue' },
    { id: 'w3', fromPort: 'P1', toModule: 'led', toPin: 'SIG', wireColor: 'yellow' },
    { id: 'w4', fromPort: 'P2', toModule: 'buzzer', toPin: 'SIG', wireColor: 'yellow' },
  ];
}

export function getDefaultBlocks(scenario: GradeLevel): BlockNode[] {
  if (scenario === '5e') {
    return [
      { id: 'b1', kind: 'read_sensor', label: 'Lire capteur luminosité (lux)', port: 'P0' },
      { id: 'b2', kind: 'if_below', label: 'SI valeur capteur < seuil', threshold: 50 },
      { id: 'b3', kind: 'set_led', label: 'Allumer LED blanche', port: 'P1', state: 'ON' },
      { id: 'b4', kind: 'set_buzzer', label: 'Activer Buzzer piézo (2 kHz)', port: 'P2', state: 'ON' },
    ];
  }
  if (scenario === '4e') {
    return [
      { id: 'b1', kind: 'read_sensor', label: 'Lire distance ultrason (cm)', port: 'P0' },
      { id: 'b2', kind: 'if_below', label: 'SI distance < seuil sécurité', threshold: 20 },
      { id: 'b3', kind: 'set_oled', label: 'Afficher sur OLED : ALERTE OBSTACLE', port: 'I2C', text: 'ALERTE OBSTACLE' },
      { id: 'b4', kind: 'set_buzzer', label: 'Activer Buzzer piézo', port: 'P2', state: 'ON' },
    ];
  }
  return [
    { id: 'b1', kind: 'read_sensor', label: 'Lire distance ultrason (cm)', port: 'P0' },
    { id: 'b2', kind: 'if_below', label: 'SI distance < seuil sécurité', threshold: 20 },
    { id: 'b3', kind: 'send_mqtt', label: 'Publier MQTT atelier/poste1/distance', text: 'DISTANCE' },
    { id: 'b4', kind: 'set_oled', label: 'Restituer décision T14 sur OLED', port: 'I2C', text: 'ALERTE / RAS' },
    { id: 'b5', kind: 'set_buzzer', label: 'Activer Buzzer sur ALERTE', port: 'P2', state: 'ON' },
  ];
}

class AppStateStore {
  activeTab = $state<number>(1);
  theme = $state<'dark' | 'light'>('dark');
  ebepMode = $state<boolean>(false);
  profMode = $state<boolean>(false);
  lastSavedAt = $state<string>('');
  toastMessage = $state<string | null>(null);
  toastTone = $state<'info' | 'success' | 'error'>('info');

  studentInfo = $state<StudentInfo>({
    nom: '',
    prenom: '',
    niveau: '3e',
    classe: '',
    groupe: '',
    date: defaultDateStr(),
  });

  // Tab 1 3D & Technical Drawings
  viewMode3D = $state<'assembled' | 'exploded'>('assembled');
  explodeFactor = $state<number>(0);
  arOverlay = $state<boolean>(false);
  showEnergyFlows3D = $state<boolean>(false);
  isolateElectronics3D = $state<boolean>(false);
  arSimDistanceCm = $state<number>(18);
  selected3DPart = $state<string>('ensemble');
  techDrawMode = $state<string>('ortho3');

  // Tab 2 Lab, Wiring & Blocks
  labScenario = $state<GradeLevel>('3e');
  luxValue = $state<number>(40);
  luxThreshold = $state<number>(50);
  distValue = $state<number>(15);
  distThreshold = $state<number>(20);
  btnAPressed = $state<boolean>(false);
  btnBPressed = $state<boolean>(false);
  buzzerFault = $state<boolean>(false);
  wires = $state<WireConnection[]>(getDefaultWires('3e'));
  blockProgram = $state<BlockNode[]>(getDefaultBlocks('3e'));
  activeStepBlockId = $state<string | null>(null);
  activeStepCyNode = $state<string | null>(null);
  programDrafts = $state<ProgramDraftSnapshot[]>([]);

  // Tab 3 Network, MQTT & Protocol
  netArch = $state<'ap' | 'lan'>('ap');
  topicConvention = $state<'v21' | 'v10'>('v21');
  wsEnabled = $state<boolean>(false);
  wsStatus = $state<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  mqttSimLatencyMs = $state<number>(40);
  mqttSimLossPct = $state<number>(0);
  mqttSentCount = $state<number>(0);
  lastMqttJsonPayload = $state<string>('');
  terminalLogs = $state<TerminalLogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString('fr-FR'),
      text: 'Simulateur PuTTY SSH / CMD Windows prêt. Règle serveur T14 (ia_atelier.py) active en mode simulation.',
      tone: 'info',
    },
  ]);
  protocolRows = $state<ProtocolRow[]>([
    { id: 1, dist: 12, exp: 'ALERTE', obs: 'ALERTE', delay: 0.12, pass: true, note: 'Détection immédiate' },
    { id: 2, dist: 35, exp: 'RAS', obs: 'RAS', delay: 0.10, pass: true, note: 'Aucun faux positif' },
    { id: 3, dist: 18, exp: 'ALERTE', obs: 'ALERTE', delay: 0.15, pass: true, note: 'Seuil 20 cm respecté' },
    { id: 4, dist: 24, exp: 'RAS', obs: 'RAS', delay: 0.11, pass: true, note: 'Zone dégagée' },
    { id: 5, dist: 9, exp: 'ALERTE', obs: 'ALERTE', delay: 0.14, pass: true, note: 'Proximité critique validée' },
  ]);

  // Tab 4 Worksheets & Self-eval & Tab 7 Quiz
  worksheetAnswers = $state<Record<string, string>>({});
  selfEval = $state<Record<string, 'maitrise' | 'encours' | 'revoir'>>({});
  quizAnswers = $state<Record<string, number>>({});

  // Tab 6 T13 Checklist & Student Pedagogical Guide Checklist
  t13Checklist = $state<Record<number, boolean>>({});
  guideCompletedSteps = $state<Record<string, boolean>>({});
  guideSidebarOpen = $state<boolean>(true);

  // Print & PDF Snapshots
  threeSnapshotUrl = $state<string>('');
  threeExplodedSnapshotUrl = $state<string>('');
  logigrammeSnapshotUrl = $state<string>('');
  networkSnapshotUrl = $state<string>('');
  schematicSnapshotUrl = $state<string>('');
  labGridSnapshotUrl = $state<string>('');
  electronicGridShort = $state<boolean>(false);
  electronicGridValid = $state<boolean>(true);
  electronicGridResistorBypassed = $state<boolean>(false);

  private snapshotCapturers: {
    three?: () => string;
    logigramme?: () => string;
    network?: () => string;
    schematic?: () => Promise<string>;
    labGrid?: () => Promise<string>;
  } = {};

  private toastTimeout: number | null = null;

  constructor() {
    this.loadFromStorage();
    this.applyThemeClass();
  }

  get brokerIp(): string {
    return this.netArch === 'ap' ? '10.42.0.1' : '192.168.1.50';
  }

  get topicBase(): string {
    return this.topicConvention === 'v21' ? 'atelier/poste1' : 'atelier/lunettes';
  }

  // Electrical validation of user-routed wires
  get electricalDiagnostics(): ElectricalDiagnostic[] {
    const diags: ElectricalDiagnostic[] = [];

    if (this.buzzerFault) {
      diags.push({
        severity: 'error',
        code: 'FIL_DEBRANCHE',
        message: 'Panne détectée (Séance 4 de 5e) : fil signal du Buzzer P2 débranché.',
      });
    }

    for (const w of this.wires) {
      if ((w.fromPort === '3V' || w.fromPort === '5V') && w.toPin === 'GND') {
        diags.push({
          severity: 'error',
          code: 'COURT_CIRCUIT_ALIM',
          message: `Court-circuit critique : alimentation ${w.fromPort} reliée à la masse GND du module ${w.toModule}.`,
        });
      } else if (w.fromPort === 'GND' && (w.toPin === '5V' || w.toPin === '3V')) {
        diags.push({
          severity: 'error',
          code: 'POLARITE_INVERSEE',
          message: `Polarité inversée sur ${w.toModule} : masse GND branchée sur l'alimentation.`,
        });
      } else if (w.toModule === 'oled' && w.fromPort !== 'I2C') {
        diags.push({
          severity: 'error',
          code: 'PORT_INCOMPATIBLE',
          message: `Bus incompatible : l’afficheur OLED doit être câblé sur le port I2C (et non ${w.fromPort}).`,
        });
      } else if (w.toModule === 'lux' && w.fromPort !== 'P0') {
        diags.push({
          severity: 'warning',
          code: 'PORT_ANALOGIQUE',
          message: `Le capteur de luminosité analogique est attendu sur P0 (actuellement sur ${w.fromPort}).`,
        });
      }
    }

    const hasSensor =
      this.labScenario === '5e'
        ? this.wires.some((w) => w.toModule === 'lux' && w.toPin === 'SIG')
        : this.wires.some((w) => w.toModule === 'ultra' && w.toPin === 'SIG');
    if (!hasSensor) {
      diags.push({
        severity: 'error',
        code: 'CAPTEUR_MANQUANT',
        message: 'Aucun câble signal relié au capteur principal du scénario actif.',
      });
    }

    if (diags.length === 0) {
      diags.push({
        severity: 'ok',
        code: 'CABLAGE_CONFORME',
        message: 'Câblage électrique conforme : continuité vérifiée sans court-circuit.',
      });
    }

    return diags;
  }

  get hasElectricalError(): boolean {
    return this.electricalDiagnostics.some((d) => d.severity === 'error');
  }

  get activeThreshold(): number {
    const cond = this.blockProgram.find((b) => b.kind === 'if_below');
    if (cond?.threshold !== undefined) return cond.threshold;
    return this.labScenario === '5e' ? this.luxThreshold : this.distThreshold;
  }

  get isConditionTriggered(): boolean {
    if (this.labScenario === '5e') {
      return this.luxValue < this.activeThreshold;
    }
    if (this.labScenario === '4e') {
      return this.distValue < this.activeThreshold;
    }
    return this.distValue < this.activeThreshold || this.btnAPressed || this.btnBPressed;
  }

  get isLedActive(): boolean {
    const ledWired = this.wires.some((w) => w.toModule === 'led' && w.fromPort === 'P1');
    const hasLedBlock = this.blockProgram.some((b) => b.kind === 'set_led' && b.state !== 'OFF');
    return ledWired && hasLedBlock && this.isConditionTriggered && !this.hasElectricalError;
  }

  get isBuzzerActive(): boolean {
    const buzzWired = this.wires.some((w) => w.toModule === 'buzzer' && w.fromPort === 'P2');
    const hasBuzzBlock = this.blockProgram.some((b) => b.kind === 'set_buzzer' && b.state !== 'OFF');
    return buzzWired && hasBuzzBlock && this.isConditionTriggered && !this.buzzerFault && !this.hasElectricalError;
  }

  get isOledActive(): boolean {
    const oledWired = this.wires.some((w) => w.toModule === 'oled' && w.fromPort === 'I2C');
    const hasOledBlock = this.blockProgram.some((b) => b.kind === 'set_oled');
    return oledWired && hasOledBlock && !this.hasElectricalError;
  }

  get ihModeLabel(): string {
    if (this.btnAPressed) return 'FABRICATION';
    if (this.btnBPressed) return 'REPARATION';
    if (this.isConditionTriggered) return 'ALERTE';
    return 'VEILLE / RAS';
  }

  showToast(msg: string, tone: 'info' | 'success' | 'error' = 'info'): void {
    this.toastMessage = msg;
    this.toastTone = tone;
    if (typeof window !== 'undefined') {
      if (this.toastTimeout !== null) window.clearTimeout(this.toastTimeout);
      this.toastTimeout = window.setTimeout(() => {
        this.toastMessage = null;
      }, 4000);
    }
  }

  syncNiveau(niveau: GradeLevel): void {
    this.studentInfo.niveau = niveau;
    this.labScenario = niveau;
    this.wires = getDefaultWires(niveau);
    this.blockProgram = getDefaultBlocks(niveau);
    this.buzzerFault = false;
    this.btnAPressed = false;
    this.btnBPressed = false;
    this.saveToStorage();
  }

  setScenario(scenario: GradeLevel): void {
    this.labScenario = scenario;
    this.wires = getDefaultWires(scenario);
    this.blockProgram = getDefaultBlocks(scenario);
    this.buzzerFault = false;
    this.btnAPressed = false;
    this.btnBPressed = false;
    this.saveToStorage();
  }

  applyThemeClass(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', this.theme === 'dark');
    }
  }

  toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyThemeClass();
    this.saveToStorage();
  }

  toggleEbep(): void {
    this.ebepMode = !this.ebepMode;
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('ebep-mode', this.ebepMode);
    }
    this.saveToStorage();
  }

  pushTerminalLog(text: string, tone: TerminalLogEntry['tone'] = 'info'): void {
    const entry: TerminalLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toLocaleTimeString('fr-FR'),
      text,
      tone,
    };
    this.terminalLogs = [...this.terminalLogs.slice(-80), entry];
  }

  registerSnapshotCapturer(key: 'three' | 'logigramme' | 'network', fn: () => string): void {
    this.snapshotCapturers[key] = fn;
  }

  registerAsyncSnapshotCapturer(key: 'schematic' | 'labGrid', fn: () => Promise<string>): void {
    this.snapshotCapturers[key] = fn;
  }

  unregisterSnapshotCapturer(key: 'three' | 'logigramme' | 'network' | 'schematic' | 'labGrid'): void {
    delete this.snapshotCapturers[key];
  }

  capturePrintSnapshots(): void {
    try {
      if (this.snapshotCapturers.three) {
        const url = this.snapshotCapturers.three();
        if (url) this.threeSnapshotUrl = url;
      }
      if (this.snapshotCapturers.logigramme) {
        const url = this.snapshotCapturers.logigramme();
        if (url) this.logigrammeSnapshotUrl = url;
      }
      if (this.snapshotCapturers.network) {
        const url = this.snapshotCapturers.network();
        if (url) this.networkSnapshotUrl = url;
      }
    } catch {
      // Non-fatal if an inactive tab graph has zero size
    }
  }

  async captureAllSnapshots(): Promise<void> {
    this.capturePrintSnapshots();
    try {
      if (this.snapshotCapturers.schematic) {
        const url = await this.snapshotCapturers.schematic();
        if (url) this.schematicSnapshotUrl = url;
      }
      if (this.snapshotCapturers.labGrid) {
        const url = await this.snapshotCapturers.labGrid();
        if (url) this.labGridSnapshotUrl = url;
      }
    } catch {
      // Ignore if SVG capture fails in background
    }
  }

  saveProgramDraft(name: string): void {
    const cleanName = name.trim() || `Essai ${this.programDrafts.length + 1}`;
    const draft: ProgramDraftSnapshot = {
      id: `draft-${Date.now()}`,
      name: cleanName,
      savedAt: new Date().toLocaleTimeString('fr-FR'),
      scenario: this.labScenario,
      blocks: this.blockProgram.map((b) => ({ ...b })),
      wires: this.wires.map((w) => ({ ...w })),
    };
    this.programDrafts = [draft, ...this.programDrafts.slice(0, 7)];
    this.saveToStorage();
    this.showToast(`Version « ${cleanName} » enregistrée localement.`, 'success');
  }

  restoreProgramDraft(id: string): void {
    const found = this.programDrafts.find((d) => d.id === id);
    if (!found) return;
    this.labScenario = found.scenario;
    this.blockProgram = found.blocks.map((b) => ({ ...b }));
    this.wires = found.wires.map((w) => ({ ...w }));
    this.saveToStorage();
    this.showToast(`Version « ${found.name} » restaurée.`, 'info');
  }

  toggleGuideStep(stepId: string): void {
    this.guideCompletedSteps = {
      ...this.guideCompletedSteps,
      [stepId]: !this.guideCompletedSteps[stepId],
    };
    this.saveToStorage();
  }

  resetGuideSteps(prefix: string): void {
    const next: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(this.guideCompletedSteps)) {
      if (!k.startsWith(prefix)) next[k] = v;
    }
    this.guideCompletedSteps = next;
    this.saveToStorage();
    this.showToast('Progression du guide réinitialisée pour ce niveau.', 'info');
  }

  saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload = {
        studentInfo: this.studentInfo,
        theme: this.theme,
        ebepMode: this.ebepMode,
        labScenario: this.labScenario,
        luxValue: this.luxValue,
        luxThreshold: this.luxThreshold,
        distValue: this.distValue,
        distThreshold: this.distThreshold,
        wires: this.wires,
        blockProgram: this.blockProgram,
        programDrafts: this.programDrafts,
        netArch: this.netArch,
        topicConvention: this.topicConvention,
        protocolRows: this.protocolRows,
        worksheetAnswers: this.worksheetAnswers,
        selfEval: this.selfEval,
        quizAnswers: this.quizAnswers,
        t13Checklist: this.t13Checklist,
        guideCompletedSteps: this.guideCompletedSteps,
        guideSidebarOpen: this.guideSidebarOpen,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      this.lastSavedAt = new Date().toLocaleTimeString('fr-FR');
    } catch {
      // Ignore storage quota issues
    }
  }

  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.studentInfo) this.studentInfo = { ...this.studentInfo, ...data.studentInfo };
      if (data.theme === 'dark' || data.theme === 'light') {
        this.theme = data.theme;
      }
      if (typeof data.ebepMode === 'boolean') {
        this.ebepMode = data.ebepMode;
        if (typeof document !== 'undefined') {
          document.body.classList.toggle('ebep-mode', this.ebepMode);
        }
      }
      if (data.labScenario) this.labScenario = data.labScenario;
      if (typeof data.luxValue === 'number') this.luxValue = data.luxValue;
      if (typeof data.luxThreshold === 'number') this.luxThreshold = data.luxThreshold;
      if (typeof data.distValue === 'number') this.distValue = data.distValue;
      if (typeof data.distThreshold === 'number') this.distThreshold = data.distThreshold;
      if (Array.isArray(data.wires)) this.wires = data.wires;
      if (Array.isArray(data.blockProgram)) this.blockProgram = data.blockProgram;
      if (Array.isArray(data.programDrafts)) this.programDrafts = data.programDrafts;
      if (data.netArch) this.netArch = data.netArch;
      if (data.topicConvention) this.topicConvention = data.topicConvention;
      if (Array.isArray(data.protocolRows)) this.protocolRows = data.protocolRows;
      if (data.worksheetAnswers) this.worksheetAnswers = data.worksheetAnswers;
      if (data.selfEval) this.selfEval = data.selfEval;
      if (data.quizAnswers) this.quizAnswers = data.quizAnswers;
      if (data.t13Checklist) this.t13Checklist = data.t13Checklist;
      if (data.guideCompletedSteps) this.guideCompletedSteps = data.guideCompletedSteps;
      if (typeof data.guideSidebarOpen === 'boolean') this.guideSidebarOpen = data.guideSidebarOpen;
    } catch {
      // Ignore malformed storage
    }
  }

  exportStudentJSON(): void {
    const dossier = {
      schemaVersion: 'technoloy-lunettes-ia-2.3',
      exportedAt: new Date().toISOString(),
      studentInfo: this.studentInfo,
      labScenario: this.labScenario,
      wires: this.wires,
      electricalDiagnostics: this.electricalDiagnostics,
      blockProgram: this.blockProgram,
      protocolRows: this.protocolRows,
      worksheetAnswers: this.worksheetAnswers,
      selfEval: this.selfEval,
      quizAnswers: this.quizAnswers,
      guideCompletedSteps: this.guideCompletedSteps,
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = `${this.studentInfo.niveau}_${this.studentInfo.nom || 'eleve'}_${this.studentInfo.prenom || 'dossier'}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Dossier élève exporté en JSON pour dépôt ENT / Pronote.', 'success');
  }

  importStudentJSON(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.studentInfo) this.studentInfo = { ...this.studentInfo, ...parsed.studentInfo };
        if (parsed.labScenario) this.labScenario = parsed.labScenario;
        if (Array.isArray(parsed.wires)) this.wires = parsed.wires;
        if (Array.isArray(parsed.blockProgram)) this.blockProgram = parsed.blockProgram;
        if (Array.isArray(parsed.protocolRows)) this.protocolRows = parsed.protocolRows;
        if (parsed.worksheetAnswers) this.worksheetAnswers = parsed.worksheetAnswers;
        if (parsed.selfEval) this.selfEval = parsed.selfEval;
        if (parsed.quizAnswers) this.quizAnswers = parsed.quizAnswers;
        if (parsed.guideCompletedSteps) this.guideCompletedSteps = parsed.guideCompletedSteps;
        this.saveToStorage();
        this.showToast('Dossier élève importé avec succès.', 'success');
      } catch {
        this.showToast('Fichier JSON invalide.', 'error');
      }
    };
    reader.readAsText(file);
  }
}

export const appState = new AppStateStore();
