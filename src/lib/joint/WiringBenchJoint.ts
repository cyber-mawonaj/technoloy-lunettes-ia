import { dia, linkTools, shapes } from '@joint/core';
import type { GradeLevel } from '../data/curriculum';
import type { WireConnection } from '../stores/appState.svelte';

export interface WiringBenchLiveState {
  wires: WireConnection[];
  scenario: GradeLevel;
  luxValue: number;
  distValue: number;
  isLedActive: boolean;
  isBuzzerActive: boolean;
  isOledActive: boolean;
  buzzerFault: boolean;
  ihModeLabel: string;
  isDark: boolean;
}

export interface WiringBenchCallbacks {
  onConnect: (fromPort: string, toModule: string, toPin: string) => void;
  onRemoveWire: (wireId: string) => void;
}

interface PortSpec {
  id: string;
  label: string;
  color: string;
}

const CONTROLLER_PORTS: PortSpec[] = [
  { id: 'P0', label: 'P0 (Analog/Dig)', color: '#eab308' },
  { id: 'P1', label: 'P1 (Digital Out)', color: '#eab308' },
  { id: 'P2', label: 'P2 (PWM Buzzer)', color: '#eab308' },
  { id: 'I2C', label: 'I2C (SDA/SCL)', color: '#0284c7' },
  { id: '5V', label: 'Alim +5V / 3V', color: '#dc2626' },
  { id: 'GND', label: 'Masse GND (0V)', color: '#64748b' },
];

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  controller: { x: 30, y: 36 },
  lux: { x: 590, y: 24 },
  ultra: { x: 590, y: 106 },
  led: { x: 590, y: 188 },
  buzzer: { x: 590, y: 270 },
  oled: { x: 590, y: 366 },
};

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 456;

export class WiringBenchJointController {
  private container: HTMLElement;
  private callbacks: WiringBenchCallbacks;
  private graph: dia.Graph;
  private paper: dia.Paper;
  private elements: Record<string, shapes.standard.Rectangle> = {};
  private isSyncingFromStore = false;
  private currentScale = 1;
  private isDark = true;

  constructor(container: HTMLElement, callbacks: WiringBenchCallbacks, initialState: WiringBenchLiveState) {
    this.container = container;
    this.callbacks = callbacks;
    this.isDark = initialState.isDark;

    const namespace = shapes;
    this.graph = new dia.Graph({}, { cellNamespace: namespace });

    this.paper = new dia.Paper({
      el: container,
      model: this.graph,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      gridSize: 10,
      drawGrid: {
        name: 'dot',
        args: { color: this.isDark ? '#334155' : '#cbd5e1', thickness: 1.5 },
      },
      background: {
        color: this.isDark ? '#0b1220' : '#f8fafc',
      },
      cellViewNamespace: namespace,
      interactive: {
        elementMove: true,
        linkMove: false,
        labelMove: false,
      },
      linkPinning: false,
      markAvailable: true,
      snapLinks: { radius: 30 },
      defaultRouter: {
        name: 'manhattan',
        args: {
          padding: 16,
          step: 10,
          startDirections: ['right'],
          endDirections: ['left'],
        },
      },
      defaultConnector: {
        name: 'rounded',
        args: { radius: 8 },
      },
      defaultLink: () =>
        new shapes.standard.Link({
          attrs: {
            line: {
              stroke: '#38bdf8',
              strokeWidth: 3.5,
              strokeLinecap: 'round',
              targetMarker: {
                type: 'circle',
                r: 4,
                fill: '#38bdf8',
                stroke: '#0f172a',
                'stroke-width': 1.5,
              },
            },
          },
        }),
      validateConnection: (cellViewS, magnetS, cellViewT, magnetT) => {
        if (!magnetS || !magnetT) return false;
        if (cellViewS === cellViewT) return false;
        const srcId = String(cellViewS.model.id);
        const tgtId = String(cellViewT.model.id);
        // Only allow controller <-> module connections (in either drag direction)
        return (srcId === 'controller' && tgtId !== 'controller') || (tgtId === 'controller' && srcId !== 'controller');
      },
    });

    this.buildNodes();
    this.setupEvents();
    this.syncState(initialState);
  }

  private createControllerElement(): shapes.standard.Rectangle {
    const portItems = CONTROLLER_PORTS.map((p, idx) => ({
      id: p.id,
      group: 'out',
      args: { x: 250, y: 84 + idx * 50 },
      attrs: {
        portBody: {
          fill: p.color,
          stroke: '#f8fafc',
          strokeWidth: 2,
          r: 8,
          magnet: true,
          cursor: 'crosshair',
        },
        portBg: {
          fill: this.isDark ? '#0f172a' : '#f1f5f9',
          stroke: p.color,
          strokeWidth: 1.5,
        },
        portLabel: {
          text: p.label,
          fill: this.isDark ? '#f8fafc' : '#0f172a',
        },
      },
    }));

    const el = new shapes.standard.Rectangle({
      id: 'controller',
      position: { ...DEFAULT_POSITIONS.controller },
      size: { width: 250, height: 382 },
      attrs: {
        body: {
          fill: this.isDark ? '#1e293b' : '#ffffff',
          stroke: '#38bdf8',
          strokeWidth: 2.2,
          rx: 12,
          ry: 12,
        },
        label: {
          text: 'micro:bit V2 + Shield Grove\nCible programmable blocs',
          fill: this.isDark ? '#f8fafc' : '#0f172a',
          fontSize: 12.5,
          fontWeight: '700',
          fontFamily: 'IBM Plex Mono, monospace',
          refY: 28,
          textVerticalAnchor: 'middle',
        },
      },
      ports: {
        groups: {
          out: {
            position: { name: 'absolute' },
            markup: [
              {
                tagName: 'rect',
                selector: 'portBg',
                attributes: { x: -222, y: -14, width: 210, height: 28, rx: 6 },
              },
              {
                tagName: 'text',
                selector: 'portLabel',
                attributes: {
                  x: -210,
                  y: 4,
                  'font-size': 11,
                  'font-weight': 'bold',
                  'font-family': 'IBM Plex Mono, monospace',
                  'pointer-events': 'none',
                },
              },
              {
                tagName: 'circle',
                selector: 'portBody',
                attributes: { cx: 0, cy: 0, r: 8 },
              },
            ],
          },
        },
        items: portItems,
      },
    });
    return el;
  }

  private createModuleElement(
    id: string,
    title: string,
    subtitle: string,
    height: number,
    ports: Array<{ id: string; label: string; y: number; color: string }>,
  ): shapes.standard.Rectangle {
    const portItems = ports.map((p) => ({
      id: p.id,
      group: 'in',
      args: { x: 0, y: p.y },
      attrs: {
        portBody: {
          fill: p.color,
          stroke: '#38bdf8',
          strokeWidth: 2.2,
          r: 8,
          magnet: true,
          cursor: 'crosshair',
        },
        portLabel: {
          text: p.label,
          fill: this.isDark ? '#cbd5e1' : '#334155',
        },
      },
    }));

    return new shapes.standard.Rectangle({
      id,
      position: { ...DEFAULT_POSITIONS[id] },
      size: { width: 270, height },
      attrs: {
        body: {
          fill: this.isDark ? '#1e293b' : '#ffffff',
          stroke: this.isDark ? '#475569' : '#94a3b8',
          strokeWidth: 2,
          rx: 10,
          ry: 10,
        },
        label: {
          text: `${title}\n${subtitle}`,
          fill: this.isDark ? '#f8fafc' : '#0f172a',
          fontSize: 11.5,
          fontWeight: '700',
          fontFamily: 'IBM Plex Mono, monospace',
          refX: 54,
          refY: height / 2,
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
        },
      },
      ports: {
        groups: {
          in: {
            position: { name: 'absolute' },
            markup: [
              {
                tagName: 'circle',
                selector: 'portBody',
                attributes: { cx: 0, cy: 0, r: 8 },
              },
              {
                tagName: 'text',
                selector: 'portLabel',
                attributes: {
                  x: 13,
                  y: 4,
                  'font-size': 9.5,
                  'font-weight': 'bold',
                  'font-family': 'IBM Plex Mono, monospace',
                  'pointer-events': 'none',
                },
              },
            ],
          },
        },
        items: portItems,
      },
    });
  }

  private buildNodes(): void {
    this.elements.controller = this.createControllerElement();
    this.elements.lux = this.createModuleElement('lux', '04 · Capteur Luminosité', '40 lux', 64, [
      { id: 'SIG', label: 'SIG', y: 32, color: '#eab308' },
    ]);
    this.elements.ultra = this.createModuleElement('ultra', '05 · Capteur Ultrason', '15 cm · 40 kHz', 64, [
      { id: 'SIG', label: 'SIG', y: 32, color: '#eab308' },
    ]);
    this.elements.led = this.createModuleElement('led', '07 · LED Blanche 5 mm', 'ÉTAT : ÉTEINTE', 64, [
      { id: 'SIG', label: 'SIG', y: 32, color: '#fef08a' },
    ]);
    this.elements.buzzer = this.createModuleElement('buzzer', '06 · Buzzer Piézo', 'SILENCIEUX', 78, [
      { id: 'SIG', label: 'SIG', y: 24, color: '#eab308' },
      { id: 'GND', label: 'GND', y: 56, color: '#0f172a' },
    ]);
    this.elements.oled = this.createModuleElement('oled', '08 · Afficheur OLED I2C', 'HUD : VEILLE', 64, [
      { id: 'SDA/SCL', label: 'I2C', y: 32, color: '#0284c7' },
    ]);

    this.graph.addCells(Object.values(this.elements));
  }

  private setupEvents(): void {
    // When user finishes dragging a new link between two ports
    this.paper.on('link:connect', (linkView: dia.LinkView) => {
      if (this.isSyncingFromStore) return;
      const link = linkView.model;
      const source = link.source();
      const target = link.target();
      // Remove the raw temporary JointJS link; Svelte store sync will recreate the canonical styled link
      link.remove();

      if (!source.id || !target.id || !source.port || !target.port) return;
      const srcId = String(source.id);
      const tgtId = String(target.id);

      if (srcId === 'controller' && tgtId !== 'controller') {
        this.callbacks.onConnect(String(source.port), tgtId, String(target.port));
      } else if (tgtId === 'controller' && srcId !== 'controller') {
        this.callbacks.onConnect(String(target.port), srcId, String(source.port));
      }
    });

    // Show clean remove button on link hover
    this.paper.on('link:mouseenter', (linkView: dia.LinkView) => {
      const removeButton = new linkTools.Remove({
        distance: '50%',
        markup: [
          {
            tagName: 'circle',
            selector: 'button',
            attributes: {
              r: 10,
              fill: '#dc2626',
              stroke: '#ffffff',
              'stroke-width': 1.8,
              cursor: 'pointer',
            },
          },
          {
            tagName: 'path',
            selector: 'icon',
            attributes: {
              d: 'M -3.5 -3.5 3.5 3.5 M -3.5 3.5 3.5 -3.5',
              fill: 'none',
              stroke: '#ffffff',
              'stroke-width': 2,
              'stroke-linecap': 'round',
              'pointer-events': 'none',
            },
          },
        ],
        action: () => {
          const wireId = linkView.model.get('wireId') as string | undefined;
          if (wireId) {
            this.callbacks.onRemoveWire(wireId);
          }
        },
      });
      const toolsView = new dia.ToolsView({ tools: [removeButton] });
      linkView.addTools(toolsView);
    });

    this.paper.on('link:mouseleave', (linkView: dia.LinkView) => {
      linkView.removeTools();
    });

    // Also allow direct click on a wire to remove it quickly (accessible on touchscreens)
    this.paper.on('link:pointerclick', (linkView: dia.LinkView) => {
      const wireId = linkView.model.get('wireId') as string | undefined;
      if (wireId) {
        this.callbacks.onRemoveWire(wireId);
      }
    });

    // Re-route orthogonal manhattan wires cleanly after moving any component
    this.paper.on('element:pointermove', () => {
      for (const link of this.graph.getLinks()) {
        const view = this.paper.findViewByModel(link) as dia.LinkView | null;
        view?.requestConnectionUpdate();
      }
    });
  }

  private resolveWireVisual(
    wire: WireConnection,
    state: WiringBenchLiveState,
  ): { stroke: string; strokeWidth: number; dasharray: string; badgeText: string | null; badgeFill: string } {
    const isShort = (wire.fromPort === '5V' || wire.fromPort === '3V') && wire.toPin === 'GND';
    const isPolarity = wire.fromPort === 'GND' && (wire.toPin === '5V' || wire.toPin === '3V');
    const isBusError = wire.toModule === 'oled' && wire.fromPort !== 'I2C';
    const isBrokenBuzzer = wire.toModule === 'buzzer' && wire.toPin === 'SIG' && state.buzzerFault;

    if (isShort) {
      return {
        stroke: '#ef4444',
        strokeWidth: 5,
        dasharray: '8 4',
        badgeText: 'COURT-CIRCUIT 5V/GND',
        badgeFill: '#dc2626',
      };
    }
    if (isPolarity) {
      return {
        stroke: '#f97316',
        strokeWidth: 4.5,
        dasharray: '6 4',
        badgeText: 'POLARITÉ INVERSÉE',
        badgeFill: '#ea580c',
      };
    }
    if (isBusError) {
      return {
        stroke: '#f97316',
        strokeWidth: 4.5,
        dasharray: '6 4',
        badgeText: 'BUS I2C REQUIS',
        badgeFill: '#ea580c',
      };
    }
    if (isBrokenBuzzer) {
      return {
        stroke: '#f43f5e',
        strokeWidth: 4,
        dasharray: '6 5',
        badgeText: 'FIL DÉBRANCHÉ (5e S4)',
        badgeFill: '#e11d48',
      };
    }

    // Active signal feedback
    const isActiveSignal =
      (wire.toModule === 'led' && state.isLedActive) ||
      (wire.toModule === 'buzzer' && state.isBuzzerActive) ||
      (wire.toModule === 'oled' && state.isOledActive);

    if (isActiveSignal && wire.wireColor !== 'blue') {
      return {
        stroke: '#10b981',
        strokeWidth: 4,
        dasharray: 'none',
        badgeText: null,
        badgeFill: '#059669',
      };
    }

    const colorHex =
      wire.wireColor === 'red'
        ? '#dc2626'
        : wire.wireColor === 'black'
          ? '#64748b'
          : wire.wireColor === 'blue'
            ? '#0ea5e9'
            : '#eab308';

    return {
      stroke: colorHex,
      strokeWidth: 3.5,
      dasharray: 'none',
      badgeText: null,
      badgeFill: colorHex,
    };
  }

  public syncState(state: WiringBenchLiveState): void {
    this.isSyncingFromStore = true;
    try {
      this.isDark = state.isDark;

      // Update canvas background & grid colors
      this.paper.drawBackground({ color: this.isDark ? '#0b1220' : '#f8fafc' });
      this.paper.setGrid({
        name: 'dot',
        args: { color: this.isDark ? '#334155' : '#cbd5e1', thickness: 1.5 },
      });

      // Update Controller node label & theme colors
      const ctrl = this.elements.controller;
      if (ctrl) {
        ctrl.attr({
          body: {
            fill: this.isDark ? '#1e293b' : '#ffffff',
            stroke: '#38bdf8',
          },
          label: {
            text: `micro:bit V2 + Shield Grove\n${state.scenario === '5e' ? 'Cible programmable blocs' : 'Maquette + Nœuds Wi-Fi T6–T8'}`,
            fill: this.isDark ? '#f8fafc' : '#0f172a',
          },
        });
        for (const p of CONTROLLER_PORTS) {
          ctrl.portProp(p.id, 'attrs/portBg/fill', this.isDark ? '#0f172a' : '#f1f5f9');
          ctrl.portProp(p.id, 'attrs/portLabel/fill', this.isDark ? '#f8fafc' : '#0f172a');
        }
      }

      // Update all 5 Grove module cards with live sensor/actuator states
      const moduleUpdates: Array<{
        id: string;
        title: string;
        sub: string;
        active: boolean;
        fault?: boolean;
        glow?: boolean;
      }> = [
        {
          id: 'lux',
          title: '04 · Capteur Luminosité',
          sub: `${state.luxValue} lux · Analog P0`,
          active: state.scenario === '5e',
        },
        {
          id: 'ultra',
          title: '05 · Capteur Ultrason',
          sub: `${state.distValue} cm · 40 kHz`,
          active: state.scenario !== '5e',
        },
        {
          id: 'led',
          title: '07 · LED Blanche 5 mm',
          sub: state.isLedActive ? 'ÉTAT : ALLUMÉE (5V)' : 'ÉTAT : ÉTEINTE',
          active: state.isLedActive,
          glow: state.isLedActive,
        },
        {
          id: 'buzzer',
          title: '06 · Buzzer Piézo',
          sub: state.buzzerFault ? 'PANNE FIL DÉBRANCHÉ' : state.isBuzzerActive ? 'BIP 2 kHz ACTIF' : 'SILENCIEUX',
          active: state.isBuzzerActive,
          fault: state.buzzerFault,
        },
        {
          id: 'oled',
          title: '08 · Afficheur OLED I2C',
          sub: state.isOledActive ? `HUD : ${state.ihModeLabel}` : 'NON CÂBLÉ / VEILLE',
          active: state.isOledActive,
        },
      ];

      for (const m of moduleUpdates) {
        const el = this.elements[m.id];
        if (!el) continue;
        const borderStroke = m.fault
          ? '#ef4444'
          : m.glow
            ? '#facc15'
            : m.active
              ? '#10b981'
              : this.isDark
                ? '#475569'
                : '#94a3b8';

        el.attr({
          body: {
            fill: this.isDark ? '#1e293b' : '#ffffff',
            stroke: borderStroke,
            strokeWidth: m.active || m.fault ? 2.6 : 1.8,
          },
          label: {
            text: `${m.title}\n${m.sub}`,
            fill: m.fault
              ? '#f87171'
              : m.glow
                ? this.isDark
                  ? '#fde047'
                  : '#b45309'
                : this.isDark
                  ? '#f8fafc'
                  : '#0f172a',
          },
        });
        for (const port of el.getPorts()) {
          if (port.id) {
            el.portProp(port.id, 'attrs/portLabel/fill', this.isDark ? '#cbd5e1' : '#334155');
          }
        }
      }

      // Rebuild canonical orthogonal links matching appState.wires
      this.graph.removeCells(this.graph.getLinks());
      for (const w of state.wires) {
        const targetEl = this.elements[w.toModule];
        if (!targetEl) continue;
        const vis = this.resolveWireVisual(w, state);
        const link = new shapes.standard.Link({
          source: { id: 'controller', port: w.fromPort },
          target: { id: w.toModule, port: w.toPin },
          router: {
            name: 'manhattan',
            args: {
              padding: 16,
              step: 10,
              startDirections: ['right'],
              endDirections: ['left'],
            },
          },
          connector: {
            name: 'rounded',
            args: { radius: 8 },
          },
          attrs: {
            line: {
              stroke: vis.stroke,
              strokeWidth: vis.strokeWidth,
              strokeDasharray: vis.dasharray,
              strokeLinecap: 'round',
              targetMarker: {
                type: 'circle',
                r: 4,
                fill: vis.stroke,
                stroke: this.isDark ? '#0b1220' : '#ffffff',
                'stroke-width': 1.5,
              },
            },
          },
        });
        link.set('wireId', w.id);

        if (vis.badgeText) {
          link.appendLabel({
            position: { distance: 0.5 },
            attrs: {
              text: {
                text: vis.badgeText,
                fill: '#ffffff',
                fontSize: 9.5,
                fontWeight: 'bold',
                fontFamily: 'IBM Plex Mono, monospace',
              },
              rect: {
                fill: vis.badgeFill,
                stroke: '#ffffff',
                strokeWidth: 1,
                rx: 4,
                ry: 4,
                refWidth: 14,
                refHeight: 8,
                refX: -7,
                refY: -4,
              },
            },
          });
        }

        link.addTo(this.graph);
      }
    } finally {
      this.isSyncingFromStore = false;
    }
  }

  public resetLayout(): void {
    for (const [id, pos] of Object.entries(DEFAULT_POSITIONS)) {
      this.elements[id]?.position(pos.x, pos.y);
    }
    this.setZoom(1);
    for (const link of this.graph.getLinks()) {
      const view = this.paper.findViewByModel(link) as dia.LinkView | null;
      view?.requestConnectionUpdate();
    }
  }

  public setZoom(scale: number): number {
    this.currentScale = Math.max(0.75, Math.min(1.3, Math.round(scale * 100) / 100));
    this.paper.scale(this.currentScale, this.currentScale);
    return this.currentScale;
  }

  public getZoom(): number {
    return this.currentScale;
  }

  public getSvgElement(): SVGSVGElement | null {
    const svg = this.paper.svg as SVGSVGElement | undefined;
    if (!svg) return null;
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', `0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`);
    }
    return svg;
  }

  public destroy(): void {
    this.paper.remove();
    this.graph.clear();
  }
}
