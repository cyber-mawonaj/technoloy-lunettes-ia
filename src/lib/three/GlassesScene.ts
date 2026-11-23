import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export type CameraPresetKey = 'ensemble' | 'microbit' | 'jst' | 'sensors' | 'camera' | 'oled' | 'buzzer';

export interface GlassesSceneCallbacks {
  onSelectPart?: (partKey: string) => void;
  onContextLost?: (lost: boolean) => void;
}

const CAMERA_PRESETS: Record<CameraPresetKey, { pos: [number, number, number]; target: [number, number, number] }> = {
  ensemble: { pos: [13.5, 8.2, 22.0], target: [0, 0.25, -1.6] },
  microbit: { pos: [-16.8, 3.0, -1.4], target: [-8.7, 0.85, -4.4] },
  jst: { pos: [-15.2, -0.3, -1.2], target: [-8.55, -0.45, -4.4] },
  sensors: { pos: [-3.2, 4.4, 11.8], target: [-2.2, 1.75, 1.35] },
  camera: { pos: [15.8, 2.8, 4.8], target: [8.5, 0.65, -0.7] },
  oled: { pos: [9.8, 1.6, 8.2], target: [6.0, 0.22, 1.95] },
  buzzer: { pos: [14.8, 1.8, -8.5], target: [8.25, 0.45, -6.2] },
};

// Pre-allocated math helpers (zero GC in render loop)
const _vec3 = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GlassesSceneController {
  private container: HTMLElement;
  private callbacks: GlassesSceneCallbacks;
  private isSoftwareGl: boolean;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;

  private rootGroup = new THREE.Group();
  private partGroups: Record<string, { group: THREE.Group; basePos: THREE.Vector3; explodeOffset: THREE.Vector3 }> = {};
  private clickableMeshes: THREE.Object3D[] = [];
  private disposableResources: Array<{ dispose: () => void }> = [];

  private matrixLeds: THREE.Mesh[] = [];
  private projectorLedMesh: THREE.Mesh | null = null;
  private projectorPointLight: THREE.PointLight | null = null;
  private tableMat: THREE.MeshStandardMaterial | null = null;
  private stageGridMat: THREE.Material | null = null;
  private flowGroup = new THREE.Group();
  private flowParticles: Array<{ mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number; speed: number }> = [];
  private oledCanvas: HTMLCanvasElement;
  private oledCtx: CanvasRenderingContext2D | null;
  private oledTexture: THREE.CanvasTexture;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private lastHoverCheck = 0;

  private targetExplode = 0;
  private currentExplode = 0;
  private alertActive = false;
  private alertTimer = 0;

  private camTargetPos = new THREE.Vector3(...CAMERA_PRESETS.ensemble.pos);
  private camLookTarget = new THREE.Vector3(...CAMERA_PRESETS.ensemble.target);
  private isCameraTransitioning = false;

  private frameId = 0;
  private clock = new THREE.Clock();
  private resizeObserver: ResizeObserver;
  private disposed = false;

  constructor(container: HTMLElement, callbacks: GlassesSceneCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeef3f8);
    this.scene.fog = new THREE.FogExp2(0xeef3f8, 0.012);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    this.camera.position.set(...CAMERA_PRESETS.ensemble.pos);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Studio IBL environment
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = this.pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    this.disposableResources.push(this.envRT);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 48;
    this.controls.maxPolarAngle = Math.PI * 0.56;
    this.controls.target.set(...CAMERA_PRESETS.ensemble.target);
    this.controls.update();

    this.controls.addEventListener('start', () => {
      this.isCameraTransitioning = false;
    });

    // Dynamic OLED 0.96" SSD1306 HUD CanvasTexture (authentic yellow top zone + cyan main zone)
    this.oledCanvas = document.createElement('canvas');
    this.oledCanvas.width = 256;
    this.oledCanvas.height = 128;
    this.oledCtx = this.oledCanvas.getContext('2d');
    this.oledTexture = new THREE.CanvasTexture(this.oledCanvas);
    this.oledTexture.colorSpace = THREE.SRGBColorSpace;
    this.oledTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.disposableResources.push(this.oledTexture);
    this.updateOledScreen('VEILLE', 'LUNETTES IA PRETES', false);

    this.setupLighting();
    this.setupStudioStage();
    this.buildSmartGlassesAssembly();
    this.buildFlowVisualizers();

    this.scene.add(this.rootGroup);
    this.flowGroup.visible = false;
    this.rootGroup.add(this.flowGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Event Listeners
    this.renderer.domElement.addEventListener('click', this.handleClick);
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.startLoop();
  }

  private setupLighting(): void {
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.2);
    keyLight.position.set(16, 24, 18);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(2048, 2048);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 65;
      const d = 16;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x94a3b8, 0.95);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 1.3);
    rimLight.position.set(-16, 12, -14);
    this.scene.add(rimLight);

    if (!this.isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softboxTop = new THREE.RectAreaLight(0xffffff, 2.4, 18, 6);
      softboxTop.position.set(0, 14, 6);
      softboxTop.lookAt(0, 0, -2);
      this.scene.add(softboxTop);
    }
  }

  private setupStudioStage(): void {
    const tableGeo = new THREE.CircleGeometry(36, 64);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.88,
      metalness: 0.04,
    });
    this.tableMat = tableMat;
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -4.05;
    table.receiveShadow = !this.isSoftwareGl;
    this.scene.add(table);
    this.disposableResources.push(tableGeo, tableMat);

    const grid = new THREE.GridHelper(32, 32, 0x94a3b8, 0xcbd5e1);
    grid.position.y = -4.02;
    const gridMat = grid.material as THREE.Material;
    gridMat.transparent = true;
    gridMat.opacity = 0.45;
    gridMat.polygonOffset = true;
    gridMat.polygonOffsetFactor = -1;
    gridMat.polygonOffsetUnits = -1;
    this.stageGridMat = gridMat;
    this.scene.add(grid);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 18, 128, 128, 124);
      grad.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
      grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.14)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactGeo = new THREE.PlaneGeometry(24, 18);
    const contactMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const contactPlane = new THREE.Mesh(contactGeo, contactMat);
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.set(0, -4.0, -2.5);
    this.scene.add(contactPlane);
    this.disposableResources.push(shadowTex, contactGeo, contactMat);
  }

  private makeCanvasTexture(
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawFn(ctx, width, height);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.disposableResources.push(tex);
    return tex;
  }

  /**
   * Builds a Seeed Studio Grove PCB profile with rounded corners & signature semicircular
   * jigsaw mounting notches on the left/right edges (matches real 20x20 or 42x24 Grove modules).
   */
  private createGrovePcbGeometry(w: number, h: number, depth: number): THREE.ExtrudeGeometry {
    const hw = w / 2;
    const hh = h / 2;
    const r = Math.min(0.18, hw * 0.2);
    const notchR = Math.min(0.16, hh * 0.22);

    const shape = new THREE.Shape();
    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    // Right edge with Grove semicircular jigsaw notch
    shape.lineTo(hw, -notchR);
    shape.absarc(hw, 0, notchR, -Math.PI / 2, Math.PI / 2, true);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    // Left edge with Grove semicircular jigsaw notch
    shape.lineTo(-hw, notchR);
    shape.absarc(-hw, 0, notchR, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    geo.center();
    this.disposableResources.push(geo);
    return geo;
  }

  /**
   * Creates an authentic white 4-pin Seeed Grove JST-PH 2.0mm buckled socket
   * facing along +Z in its local coordinate frame.
   */
  private createGroveJstSocket(
    housingMat: THREE.Material,
    cavityMat: THREE.Material,
    goldMat: THREE.Material,
  ): THREE.Group {
    const g = new THREE.Group();
    const outerGeo = new THREE.BoxGeometry(0.76, 0.44, 0.56);
    const cavityGeo = new THREE.BoxGeometry(0.62, 0.30, 0.14);
    const latchGeo = new THREE.BoxGeometry(0.24, 0.08, 0.48);
    const pinGeo = new THREE.BoxGeometry(0.05, 0.05, 0.34);

    const outer = new THREE.Mesh(outerGeo, housingMat);
    const cavity = new THREE.Mesh(cavityGeo, cavityMat);
    cavity.position.set(0, 0, 0.24);
    const latch = new THREE.Mesh(latchGeo, housingMat);
    latch.position.set(0, 0.25, 0.02);

    g.add(outer, cavity, latch);
    for (let i = -1.5; i <= 1.5; i += 1) {
      const pin = new THREE.Mesh(pinGeo, goldMat);
      pin.position.set(i * 0.15, 0, 0.12);
      g.add(pin);
    }

    this.disposableResources.push(outerGeo, cavityGeo, latchGeo, pinGeo);
    return g;
  }

  /**
   * Builds a small 3D-printed dark-slate clamp collar hugging a temple or brow bar.
   */
  private createMountingClip(
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    this.disposableResources.push(geo);
    return new THREE.Mesh(geo, mat);
  }

  private registerPart(key: string, group: THREE.Group, explodeOffset: [number, number, number]): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData.partKey = key;
        if (!this.isSoftwareGl) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
        this.clickableMeshes.push(child);
      }
    });
    this.partGroups[key] = {
      group,
      basePos: group.position.clone(),
      explodeOffset: new THREE.Vector3(...explodeOffset),
    };
    this.rootGroup.add(group);
  }

  private buildSmartGlassesAssembly(): void {
    // Shared calibrated PBR materials
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.32,
      metalness: 0.22,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    });
    const clip3dMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.62,
      metalness: 0.08,
    });
    const rubberTipMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.78,
      metalness: 0.05,
    });
    const brushedMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xd1d5db,
      metalness: 0.92,
      roughness: 0.22,
      anisotropy: 0.75,
    });
    const brushedGoldMat = new THREE.MeshPhysicalMaterial({
      color: 0xeab308,
      metalness: 0.94,
      roughness: 0.18,
      anisotropy: 0.8,
    });
    const groveBlueMat = new THREE.MeshStandardMaterial({
      color: 0x0b57a4,
      roughness: 0.36,
      metalness: 0.12,
    });
    const darkPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.52,
      metalness: 0.08,
    });
    const jstWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.42,
      metalness: 0.02,
    });
    const jstCavityMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
    });
    const kaptonMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.25,
    });
    const lensGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      metalness: 0,
      roughness: 0.05,
      transmission: this.isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.32 : 1,
      ior: 1.52,
      thickness: 0.4,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const prismGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      metalness: 0.05,
      roughness: 0.04,
      transmission: this.isSoftwareGl ? 0 : 0.82,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.45 : 1,
      ior: 1.58,
      thickness: 0.85,
      clearcoat: 1.0,
      depthWrite: false,
    });

    this.disposableResources.push(
      frameMat,
      clip3dMat,
      rubberTipMat,
      brushedMetalMat,
      brushedGoldMat,
      groveBlueMat,
      darkPlasticMat,
      jstWhiteMat,
      jstCavityMat,
      kaptonMat,
      lensGlassMat,
      prismGlassMat,
    );

    // ---------------------------------------------------------
    // 1. FRAME, OPTICAL LENSES & CONNECTED NOSE-BRIDGE DISPLAY STAND
    // ---------------------------------------------------------
    const frameGroup = new THREE.Group();

    const frameShape = new THREE.Shape();
    frameShape.moveTo(-7.6, 1.35);
    frameShape.lineTo(7.6, 1.35);
    frameShape.quadraticCurveTo(8.1, 1.35, 8.1, 0.75);
    frameShape.lineTo(7.7, -1.85);
    frameShape.quadraticCurveTo(7.5, -2.55, 6.4, -2.55);
    frameShape.lineTo(2.1, -2.55);
    frameShape.quadraticCurveTo(1.2, -2.55, 0.95, -1.35);
    frameShape.quadraticCurveTo(0, -0.55, -0.95, -1.35);
    frameShape.quadraticCurveTo(-1.2, -2.55, -2.1, -2.55);
    frameShape.lineTo(-6.4, -2.55);
    frameShape.quadraticCurveTo(-7.5, -2.55, -7.7, -1.85);
    frameShape.lineTo(-8.1, 0.75);
    frameShape.quadraticCurveTo(-8.1, 1.35, -7.6, 1.35);

    const leftEyeHole = new THREE.Path();
    leftEyeHole.moveTo(-7.1, 0.7);
    leftEyeHole.lineTo(-1.55, 0.7);
    leftEyeHole.lineTo(-1.45, -1.7);
    leftEyeHole.quadraticCurveTo(-1.7, -2.0, -2.25, -2.0);
    leftEyeHole.lineTo(-6.25, -2.0);
    leftEyeHole.quadraticCurveTo(-6.95, -2.0, -7.05, -1.5);
    leftEyeHole.closePath();

    const rightEyeHole = new THREE.Path();
    rightEyeHole.moveTo(1.55, 0.7);
    rightEyeHole.lineTo(7.1, 0.7);
    rightEyeHole.lineTo(7.05, -1.5);
    rightEyeHole.quadraticCurveTo(6.95, -2.0, 6.25, -2.0);
    rightEyeHole.lineTo(2.25, -2.0);
    rightEyeHole.quadraticCurveTo(1.7, -2.0, 1.45, -1.7);
    rightEyeHole.closePath();

    frameShape.holes.push(leftEyeHole, rightEyeHole);

    const frontFrameGeo = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.45,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 3,
    });
    frontFrameGeo.center();
    const frontFrameMesh = new THREE.Mesh(frontFrameGeo, frameMat);
    frontFrameMesh.position.set(0, -0.55, 1.2);
    frameGroup.add(frontFrameMesh);
    this.disposableResources.push(frontFrameGeo);

    // Clear protective polycarbonate lenses inside openings
    const lensShape = new THREE.Shape();
    lensShape.moveTo(-2.7, 1.3);
    lensShape.lineTo(2.7, 1.3);
    lensShape.lineTo(2.65, -1.1);
    lensShape.quadraticCurveTo(2.5, -1.4, 2.0, -1.4);
    lensShape.lineTo(-2.0, -1.4);
    lensShape.quadraticCurveTo(-2.5, -1.4, -2.65, -1.1);
    lensShape.closePath();
    const lensGeo = new THREE.ExtrudeGeometry(lensShape, { depth: 0.1, bevelEnabled: false });
    lensGeo.center();
    const leftLens = new THREE.Mesh(lensGeo, lensGlassMat);
    leftLens.position.set(-4.25, -0.65, 1.22);
    leftLens.renderOrder = 5;
    const rightLens = new THREE.Mesh(lensGeo, lensGlassMat);
    rightLens.position.set(4.25, -0.65, 1.22);
    rightLens.renderOrder = 5;
    frameGroup.add(leftLens, rightLens);
    this.disposableResources.push(lensGeo);

    // Silicone nose pads inside the bridge
    const nosePadGeo = new THREE.CapsuleGeometry(0.18, 0.42, 6, 12);
    [-0.78, 0.78].forEach((nx) => {
      const pad = new THREE.Mesh(nosePadGeo, rubberTipMat);
      pad.position.set(nx, -1.15, 0.98);
      pad.rotation.z = nx < 0 ? 0.25 : -0.25;
      frameGroup.add(pad);
    });
    this.disposableResources.push(nosePadGeo);

    // Sculpted Temples (Branches) + Metallic Hinges + Ergonomic Grip Tips
    [-1, 1].forEach((side) => {
      const templeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 7.95, 0.55, 1.05),
        new THREE.Vector3(side * 8.15, 0.52, -3.5),
        new THREE.Vector3(side * 7.85, 0.35, -8.8),
        new THREE.Vector3(side * 7.25, -1.15, -11.4),
      ]);
      const templeGeo = new THREE.TubeGeometry(templeCurve, 32, 0.28, 12, false);
      frameGroup.add(new THREE.Mesh(templeGeo, frameMat));

      const tipCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 7.85, 0.35, -8.8),
        new THREE.Vector3(side * 7.25, -1.15, -11.4),
        new THREE.Vector3(side * 6.95, -1.75, -12.1),
      ]);
      const tipGeo = new THREE.TubeGeometry(tipCurve, 14, 0.32, 12, false);
      frameGroup.add(new THREE.Mesh(tipGeo, rubberTipMat));

      const hingeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.72, 14);
      const hinge = new THREE.Mesh(hingeGeo, brushedMetalMat);
      hinge.position.set(side * 7.98, 0.55, 1.08);
      frameGroup.add(hinge);
      this.disposableResources.push(templeGeo, tipGeo, hingeGeo);
    });

    // Connected Studio Display Stand (physically supports the nose bridge — zero floating!)
    const standBaseGeo = new THREE.CylinderGeometry(2.6, 3.1, 0.24, 40);
    const standBase = new THREE.Mesh(standBaseGeo, brushedMetalMat);
    standBase.position.set(0, -3.92, -0.45);
    frameGroup.add(standBase);

    const standNeckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -3.82, -0.45),
      new THREE.Vector3(0, -2.85, -0.25),
      new THREE.Vector3(0, -1.75, 0.55),
      new THREE.Vector3(0, -1.02, 1.18),
    ]);
    const standNeckGeo = new THREE.TubeGeometry(standNeckCurve, 24, 0.30, 14, false);
    frameGroup.add(new THREE.Mesh(standNeckGeo, frameMat));

    const cradleGeo = new THREE.BoxGeometry(1.55, 0.26, 0.92);
    const cradle = new THREE.Mesh(cradleGeo, rubberTipMat);
    cradle.position.set(0, -0.96, 1.18);
    frameGroup.add(cradle);
    this.disposableResources.push(standBaseGeo, standNeckGeo, cradleGeo);

    this.registerPart('frame', frameGroup, [0, 0, 0]);

    // ---------------------------------------------------------
    // 2. SHIELD GROVE MICRO:BIT V2 (Outer Left Temple — Clamped to Temple)
    //    Holds the black 25-pin edge connector & 4 white buckled JST-PH ports
    // ---------------------------------------------------------
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-8.58, -0.08, -4.4);

    // Two 3D-printed temple clamp collars physically joining the Shield to the left temple (X=-8.15, Y=0.52)
    [-1.7, 1.7].forEach((cz) => {
      const clamp = this.createMountingClip(0.75, 0.72, 0.55, clip3dMat);
      clamp.position.set(0.36, 0.58, cz);
      shieldGroup.add(clamp);
    });

    // Authentic Seeed Grove Shield v2.0 PCB (crisp white silkscreen & Seeed blue accents, facing -X)
    const shieldFaceTex = this.makeCanvasTexture(512, 320, (ctx, w, h) => {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, w, h);
      // Blue top silkscreen header band
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, 0, w, 62);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Seeed Grove Shield for micro:bit v2.0', w / 2, 38);

      // Subtle copper traces under white soldermask
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(48 + i * 44, 72);
        ctx.lineTo(48 + i * 44, 210);
        ctx.lineTo(68 + i * 44, 235);
        ctx.stroke();
      }

      // Port boxes & labels for the 4 Grove JST sockets along bottom
      const ports = ['P0 / P14', 'P1 / P15', 'P2 / P16', 'I2C'];
      ports.forEach((lbl, i) => {
        const px = 76 + i * 120;
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(px - 44, 204, 88, 92);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 17px monospace';
        ctx.fillText(lbl, px, 194);
      });

      // Power & USB silkscreen on left edge
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('5V USB PWR', 16, 108);
      ctx.fillStyle = '#16a34a';
      ctx.fillText('● PWR ON', 16, 134);
    });

    const shieldPcbGeo = new THREE.BoxGeometry(0.22, 3.1, 5.4);
    const shieldSideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
    const shieldFaceMat = new THREE.MeshStandardMaterial({ map: shieldFaceTex, roughness: 0.38, metalness: 0.08 });
    const shieldPcb = new THREE.Mesh(shieldPcbGeo, [
      shieldSideMat, // +X (inner side)
      shieldFaceMat, // -X (outer visible side!)
      shieldSideMat,
      shieldSideMat,
      shieldSideMat,
      shieldSideMat,
    ]);
    shieldGroup.add(shieldPcb);

    // Black 25-pin card-edge connector slot mounted on the outer upper-middle face of Shield
    // Receives the micro:bit V2 golden edge fingers cleanly!
    const edgeSlotGeo = new THREE.BoxGeometry(0.46, 0.62, 4.65);
    const edgeSlot = new THREE.Mesh(edgeSlotGeo, darkPlasticMat);
    edgeSlot.position.set(-0.32, 0.28, 0);
    shieldGroup.add(edgeSlot);

    // Inner gold spring contact strip inside edge slot
    const slotContactsGeo = new THREE.BoxGeometry(0.14, 0.16, 4.35);
    const slotContacts = new THREE.Mesh(slotContactsGeo, brushedGoldMat);
    slotContacts.position.set(-0.34, 0.56, 0);
    shieldGroup.add(slotContacts);

    // 4 White Buckled Grove JST-PH 4-pin ports along the bottom strip of the Shield facing -X
    const jstZPositions = [1.85, 0.62, -0.62, -1.85];
    jstZPositions.forEach((jz) => {
      const socket = this.createGroveJstSocket(jstWhiteMat, jstCavityMat, brushedGoldMat);
      socket.rotation.y = -Math.PI / 2; // Open cavity faces -X (outward)
      socket.position.set(-0.34, -0.88, jz);
      shieldGroup.add(socket);
    });

    // Micro-USB 5V Power jack at rear edge + glowing green PWR SMD LED
    const shUsbGeo = new THREE.BoxGeometry(0.32, 0.42, 0.62);
    const shUsb = new THREE.Mesh(shUsbGeo, brushedMetalMat);
    shUsb.position.set(-0.22, 0.72, -2.52);
    const pwrLedGeo = new THREE.BoxGeometry(0.12, 0.16, 0.16);
    const pwrLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.6,
    });
    const pwrLed = new THREE.Mesh(pwrLedGeo, pwrLedMat);
    pwrLed.position.set(-0.14, 0.25, -2.35);
    shieldGroup.add(shUsb, pwrLed);

    this.disposableResources.push(
      shieldPcbGeo,
      shieldSideMat,
      shieldFaceMat,
      edgeSlotGeo,
      slotContactsGeo,
      shUsbGeo,
      pwrLedGeo,
      pwrLedMat,
    );
    this.registerPart('shield', shieldGroup, [-5.6, -1.4, -0.6]);

    // ---------------------------------------------------------
    // 3. MICRO:BIT V2 (Docked DIRECTLY inside Shield Grove Edge Slot!)
    //    Slides smoothly upward & outward out of the slot in Exploded view
    // ---------------------------------------------------------
    const microbitGroup = new THREE.Group();
    // Base position seated squarely inside Shield's black 25-pin slot (X=-8.92, bottom edge inside Y=0.20)
    microbitGroup.position.set(-8.92, 1.72, -4.4);

    // Authentic BBC micro:bit V2 matte-black PCB with colored geometric top accent, A/B labels, gold ring pads
    const mbFrontTex = this.makeCanvasTexture(512, 412, (ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Iconic colored geometric corner stripes (top-left teal / top-right yellow accents)
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(145, 0);
      ctx.lineTo(0, 118);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(145, 0);
      ctx.lineTo(185, 0);
      ctx.lineTo(40, 118);
      ctx.lineTo(0, 118);
      ctx.closePath();
      ctx.fill();

      // Golden touch-sensitive micro:bit logo pill in top center
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 42, 22, 84, 42, 21);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(w / 2 - 18, 43, 6, 0, Math.PI * 2);
      ctx.arc(w / 2 + 18, 43, 6, 0, Math.PI * 2);
      ctx.fill();

      // Microphone indicator icon top-right
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MIC', w - 64, 48);

      // A & B silkscreen labels
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('A', 66, 256);
      ctx.fillText('B', w - 66, 256);

      // Bottom notched gold edge connector strip + 5 large numbered rings (0, 1, 2, 3V, GND)
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(0, h - 78, w, 78);
      // Small narrow edge pins between the 5 large pads
      ctx.fillStyle = '#0f172a';
      for (let x = 22; x < w - 20; x += 20) {
        ctx.fillRect(x, h - 78, 5, 78);
      }
      // 5 wide gold pads with dark center holes
      const padXs = [56, 152, 256, 360, 456];
      const padLabels = ['0', '1', '2', '3V', 'GND'];
      padXs.forEach((px, idx) => {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(px - 28, h - 78, 56, 78);
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(px, h - 32, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(padLabels[idx], px, h - 86);
      });
    });

    const mbBackTex = this.makeCanvasTexture(512, 412, (ctx, w, h) => {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BBC micro:bit V2.2', w / 2, 54);
      ctx.font = '15px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('nRF52833 · BLE 5.0 · SPEAKER', w / 2, 86);
      // Speaker grille circle graphic
      ctx.strokeStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(w * 0.68, h * 0.52, 48, 0, Math.PI * 2);
      ctx.stroke();
      // Gold edge strip on back too
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(0, h - 78, w, 78);
    });

    const mbPcbGeo = new THREE.BoxGeometry(0.18, 3.4, 4.35);
    const mbEdgeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const mbFrontMat = new THREE.MeshStandardMaterial({ map: mbFrontTex, roughness: 0.38, metalness: 0.14 });
    const mbBackMat = new THREE.MeshStandardMaterial({ map: mbBackTex, roughness: 0.45, metalness: 0.12 });
    const mbPcb = new THREE.Mesh(mbPcbGeo, [
      mbBackMat,  // +X (back face toward temple)
      mbFrontMat, // -X (front face visible outward!)
      mbEdgeMat,
      mbEdgeMat,
      mbEdgeMat,
      mbEdgeMat,
    ]);
    microbitGroup.add(mbPcb);

    // 5×5 Red SMD LED Matrix on the outward face (-X)
    const ledGeo = new THREE.BoxGeometry(0.06, 0.22, 0.16);
    this.matrixLeds = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const lMat = new THREE.MeshStandardMaterial({
          color: 0x334155,
          emissive: 0xef4444,
          emissiveIntensity: r === 2 && c === 2 ? 0.8 : 0.06,
          roughness: 0.25,
        });
        const led = new THREE.Mesh(ledGeo, lMat);
        // Columns along Z (+1.0 to -1.0), Rows along Y (+0.75 to -0.45)
        led.position.set(-0.11, 0.72 - r * 0.30, 0.76 - c * 0.38);
        microbitGroup.add(led);
        this.matrixLeds.push(led);
        this.disposableResources.push(lMat);
      }
    }

    // Tactile Buttons A (front side +Z) and B (rear side -Z) on outer face (-X)
    const btnFrameGeo = new THREE.BoxGeometry(0.14, 0.44, 0.44);
    const btnCapGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.16, 16);
    [1.62, -1.62].forEach((bz) => {
      const bFrame = new THREE.Mesh(btnFrameGeo, brushedMetalMat);
      bFrame.position.set(-0.14, 0.14, bz);
      const bCap = new THREE.Mesh(btnCapGeo, darkPlasticMat);
      bCap.rotation.z = Math.PI / 2;
      bCap.position.set(-0.22, 0.14, bz);
      microbitGroup.add(bFrame, bCap);
    });

    // Top micro-USB programming port + rear black piezo speaker box
    const mbUsbGeo = new THREE.BoxGeometry(0.28, 0.38, 0.68);
    const mbUsb = new THREE.Mesh(mbUsbGeo, brushedMetalMat);
    mbUsb.position.set(0.06, 1.56, 0);
    const spkGeo = new THREE.BoxGeometry(0.24, 0.78, 0.78);
    const spk = new THREE.Mesh(spkGeo, darkPlasticMat);
    spk.position.set(0.18, 0.1, -0.75);
    microbitGroup.add(mbUsb, spk);

    this.disposableResources.push(
      mbPcbGeo,
      mbEdgeMat,
      mbFrontMat,
      mbBackMat,
      ledGeo,
      btnFrameGeo,
      btnCapGeo,
      mbUsbGeo,
      spkGeo,
    );
    // Explode upward & outward so students see it unplug cleanly from the Shield Grove edge slot!
    this.registerPart('microbit', microbitGroup, [-3.4, 3.2, -0.6]);

    // ---------------------------------------------------------
    // 4. GROVE ULTRASONIC RANGER (Center Top Brow Saddle — Zero Clipping!)
    //    Seeed blue notched PCB + twin brushed-Al 40kHz mesh cylinders + quartz crystal + rear JST
    // ---------------------------------------------------------
    const ultraGroup = new THREE.Group();
    // Seated cleanly above the front brow bar (brow top is at Y=1.50, Z=1.20)
    ultraGroup.position.set(0.0, 2.28, 1.24);

    // 3D-printed central bridge saddle mount clamping onto top brow bar
    const ultraMount = this.createMountingClip(2.4, 0.34, 0.68, clip3dMat);
    ultraMount.position.set(0, -0.86, -0.04);
    ultraGroup.add(ultraMount);

    // Seeed Grove Ultrasonic blue PCB with semicircular edge notches
    const ultraPcbGeo = this.createGrovePcbGeometry(3.8, 1.56, 0.16);
    const ultraPcb = new THREE.Mesh(ultraPcbGeo, groveBlueMat);
    ultraGroup.add(ultraPcb);

    // Front silkscreen decal plane (T / R / Grove Ultrasonic)
    const ultraFaceTex = this.makeCanvasTexture(512, 224, (ctx, w, h) => {
      ctx.fillStyle = '#0b57a4';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Grove - Ultrasonic Ranger', w / 2, 42);
      ctx.font = 'bold 26px monospace';
      ctx.fillText('T', 62, 198);
      ctx.fillText('R', w - 62, 198);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText('40 kHz', w / 2, 196);
    });
    const ultraDecalGeo = new THREE.PlaneGeometry(3.52, 1.40);
    const ultraDecalMat = new THREE.MeshStandardMaterial({ map: ultraFaceTex, roughness: 0.42 });
    const ultraDecal = new THREE.Mesh(ultraDecalGeo, ultraDecalMat);
    ultraDecal.position.set(0, 0, 0.105);
    ultraGroup.add(ultraDecal);

    // Procedural metallic acoustic mesh texture for the two 40kHz ultrasonic cylinders
    const meshGrilleTex = this.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      // Radial brushed metal ring + fine criss-cross acoustic grille
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      for (let i = -256; i < 512; i += 16) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 256, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, 256);
        ctx.lineTo(i + 256, 0);
        ctx.stroke();
      }
      // Dark center piezo cone dot
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2);
      ctx.fill();
      // Metallic inner lip
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 9, 0, Math.PI * 2);
      ctx.stroke();
    });

    const transOuterGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.74, 28);
    const transFaceGeo = new THREE.CircleGeometry(0.50, 28);
    const transFaceMat = new THREE.MeshStandardMaterial({
      map: meshGrilleTex,
      metalness: 0.72,
      roughness: 0.34,
    });

    [-1.02, 1.02].forEach((tx) => {
      const cyl = new THREE.Mesh(transOuterGeo, brushedMetalMat);
      cyl.rotation.x = Math.PI / 2;
      cyl.position.set(tx, 0.02, 0.44);
      const cap = new THREE.Mesh(transFaceGeo, transFaceMat);
      cap.position.set(tx, 0.02, 0.815);
      ultraGroup.add(cyl, cap);
    });

    // Central HC-49S silver metallic quartz crystal + driver chip
    const xtalGeo = new THREE.CapsuleGeometry(0.11, 0.34, 6, 12);
    const xtal = new THREE.Mesh(xtalGeo, brushedMetalMat);
    xtal.rotation.z = Math.PI / 2;
    xtal.position.set(0, 0.28, 0.19);
    const icGeo = new THREE.BoxGeometry(0.36, 0.52, 0.12);
    const ic = new THREE.Mesh(icGeo, darkPlasticMat);
    ic.position.set(0, -0.18, 0.15);
    ultraGroup.add(xtal, ic);

    // Rear white 4-pin Grove JST-PH connector (facing -Z for cable entry)
    const ultraJst = this.createGroveJstSocket(jstWhiteMat, jstCavityMat, brushedGoldMat);
    ultraJst.rotation.y = Math.PI;
    ultraJst.position.set(0, -0.25, -0.34);
    ultraGroup.add(ultraJst);

    this.disposableResources.push(ultraDecalGeo, ultraDecalMat, transOuterGeo, transFaceGeo, transFaceMat, xtalGeo, icGeo);
    this.registerPart('ultra', ultraGroup, [0, 3.6, 3.4]);

    // ---------------------------------------------------------
    // 5. GROVE LIGHT SENSOR v1.2 (Left Upper Brow Clip — Serpentine LDR + LM358)
    // ---------------------------------------------------------
    const luxGroup = new THREE.Group();
    luxGroup.position.set(-4.35, 2.24, 1.24);

    // 3D-printed brow saddle clip
    const luxMount = this.createMountingClip(1.25, 0.32, 0.66, clip3dMat);
    luxMount.position.set(0, -0.82, -0.04);
    luxGroup.add(luxMount);

    // 20x20 mm Seeed-blue Grove PCB with semicircular notches
    const luxPcbGeo = this.createGrovePcbGeometry(1.75, 1.56, 0.16);
    luxGroup.add(new THREE.Mesh(luxPcbGeo, groveBlueMat));

    const luxFaceTex = this.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0b57a4';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Grove Light', w / 2, 42);
      ctx.font = '18px monospace';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText('v1.2 · P0', w / 2, 232);
    });
    const luxDecalGeo = new THREE.PlaneGeometry(1.52, 1.38);
    const luxDecalMat = new THREE.MeshStandardMaterial({ map: luxFaceTex, roughness: 0.42 });
    const luxDecal = new THREE.Mesh(luxDecalGeo, luxDecalMat);
    luxDecal.position.set(0, 0, 0.105);
    luxGroup.add(luxDecal);

    // Iconic photoresistor (LDR) disk with crimson serpentine cadmium-sulfide track
    const ldrTex = this.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);
      // Ceramic border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 114, 0, Math.PI * 2);
      ctx.stroke();
      // Signature red serpentine LDR track
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        const y = 60 + r * 34;
        const left = 56;
        const right = w - 56;
        if (r === 0) {
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
        } else if (r % 2 === 1) {
          ctx.lineTo(right, y);
          ctx.lineTo(left, y);
        } else {
          ctx.lineTo(left, y);
          ctx.lineTo(right, y);
        }
      }
      ctx.stroke();
      // Two silver electrode bars
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(28, 112, 22, 32);
      ctx.fillRect(w - 50, 112, 22, 32);
    });

    const ldrBodyGeo = new THREE.CylinderGeometry(0.38, 0.40, 0.24, 24);
    const ldrCapGeo = new THREE.CircleGeometry(0.36, 24);
    const ldrCapMat = new THREE.MeshPhysicalMaterial({
      map: ldrTex,
      roughness: 0.14,
      clearcoat: 1.0,
    });
    const ldrBody = new THREE.Mesh(ldrBodyGeo, jstWhiteMat);
    ldrBody.rotation.x = Math.PI / 2;
    ldrBody.position.set(0, 0.04, 0.22);
    const ldrCap = new THREE.Mesh(ldrCapGeo, ldrCapMat);
    ldrCap.position.set(0, 0.04, 0.345);
    luxGroup.add(ldrBody, ldrCap);

    // LM358 SOIC-8 op-amp chip + rear white Grove JST socket
    const opampGeo = new THREE.BoxGeometry(0.32, 0.24, 0.10);
    const opamp = new THREE.Mesh(opampGeo, darkPlasticMat);
    opamp.position.set(-0.48, -0.42, 0.14);
    const luxJst = this.createGroveJstSocket(jstWhiteMat, jstCavityMat, brushedGoldMat);
    luxJst.rotation.y = Math.PI;
    luxJst.position.set(0, -0.25, -0.34);
    luxGroup.add(opamp, luxJst);

    this.disposableResources.push(luxDecalGeo, luxDecalMat, ldrBodyGeo, ldrCapGeo, ldrCapMat, opampGeo);
    this.registerPart('lux', luxGroup, [-2.8, 3.2, 3.2]);

    // ---------------------------------------------------------
    // 6. GROVE WHITE LED 5 MM SOCKET KIT (Left Outer Frame Bracket)
    //    Seeed blue PCB + blue square rotary potentiometer + clear domed 5 mm LED
    // ---------------------------------------------------------
    const ledGroup = new THREE.Group();
    // Mounted on an L-bracket just outside the left hinge, aimed straight forward (+Z)
    ledGroup.position.set(-8.65, 0.88, 1.38);

    // 3D-printed L-bracket linking LED module cleanly to the left hinge
    const ledBracket = this.createMountingClip(0.85, 0.42, 0.56, clip3dMat);
    ledBracket.position.set(0.52, -0.30, -0.28);
    ledGroup.add(ledBracket);

    // 20x20 mm Seeed-blue Grove PCB with semicircular notches
    const ledPcbGeo = this.createGrovePcbGeometry(1.62, 1.62, 0.16);
    ledGroup.add(new THREE.Mesh(ledPcbGeo, groveBlueMat));

    // Iconic blue square rotary trimmer potentiometer (RV1) on top-left of Grove LED module
    const potBodyGeo = new THREE.BoxGeometry(0.48, 0.48, 0.26);
    const potBodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const potBody = new THREE.Mesh(potBodyGeo, potBodyMat);
    potBody.position.set(-0.36, 0.36, 0.20);
    const potDialGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16);
    const potDial = new THREE.Mesh(potDialGeo, jstWhiteMat);
    potDial.rotation.x = Math.PI / 2;
    potDial.position.set(-0.36, 0.36, 0.34);
    ledGroup.add(potBody, potDial);

    // Black 2-pin female LED holder socket
    const ledSocketGeo = new THREE.BoxGeometry(0.46, 0.32, 0.36);
    const ledSocket = new THREE.Mesh(ledSocketGeo, darkPlasticMat);
    ledSocket.position.set(0.24, -0.14, 0.24);
    ledGroup.add(ledSocket);

    // Authentic 5 mm T-1¾ domed LED (LatheGeometry with flange + internal cathode cup + glow)
    const ledPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.32, 0.0),
      new THREE.Vector2(0.32, 0.10),
      new THREE.Vector2(0.27, 0.10),
      new THREE.Vector2(0.27, 0.48),
      new THREE.Vector2(0.24, 0.62),
      new THREE.Vector2(0.16, 0.72),
      new THREE.Vector2(0.0, 0.76),
    ];
    const ledDomeGeo = new THREE.LatheGeometry(ledPts, 24);
    const ledProjMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      emissive: 0xfef08a,
      emissiveIntensity: 0.2,
      roughness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92,
    });
    this.projectorLedMesh = new THREE.Mesh(ledDomeGeo, ledProjMat);
    this.projectorLedMesh.rotation.x = Math.PI / 2;
    this.projectorLedMesh.position.set(0.24, -0.14, 0.42);
    ledGroup.add(this.projectorLedMesh);

    // Internal silver anode/cathode anvil inside LED dome
    const anvilGeo = new THREE.BoxGeometry(0.14, 0.10, 0.36);
    const anvil = new THREE.Mesh(anvilGeo, brushedMetalMat);
    anvil.position.set(0.24, -0.14, 0.64);
    ledGroup.add(anvil);

    this.projectorPointLight = new THREE.PointLight(0xfef9c3, 0, 12);
    this.projectorPointLight.position.set(0.24, -0.14, 1.45);
    ledGroup.add(this.projectorPointLight);

    // Rear white Grove JST socket
    const ledJst = this.createGroveJstSocket(jstWhiteMat, jstCavityMat, brushedGoldMat);
    ledJst.rotation.y = Math.PI;
    ledJst.position.set(0, -0.25, -0.34);
    ledGroup.add(ledJst);

    this.disposableResources.push(potBodyGeo, potBodyMat, potDialGeo, ledSocketGeo, ledDomeGeo, ledProjMat, anvilGeo);
    this.registerPart('led', ledGroup, [-4.8, 1.4, 3.6]);

    // ---------------------------------------------------------
    // 7. AI-THINKER ESP32-CAM OV2640 (Outer Right Temple near Hinge)
    //    Matte-black PCB + ESP32-S RF Shield + 2x8 headers + Kapton FPC + OV2640 M7 lens + Flash LED
    // ---------------------------------------------------------
    const camGroup = new THREE.Group();
    // Mounted vertically on outer face of right temple (X=+8.58, Y=0.65, Z=-1.65)
    camGroup.position.set(8.58, 0.65, -1.65);

    // Two 3D-printed temple clamp brackets attaching ESP32-CAM cleanly to right temple (X=+8.12, Y=0.52)
    [-1.1, 1.1].forEach((cz) => {
      const clamp = this.createMountingClip(0.68, 0.70, 0.48, clip3dMat);
      clamp.position.set(-0.34, -0.12, cz);
      camGroup.add(clamp);
    });

    // Authentic AI-Thinker matte-black ESP32-CAM PCB texture (40.5 × 27 mm proportions)
    const camOuterTex = this.makeCanvasTexture(512, 340, (ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      // Pin header silkscreen rows along top and bottom
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      const topPins = ['5V', 'GND', 'IO12', 'IO13', 'IO15', 'IO14', 'IO2', 'IO4'];
      const botPins = ['3V3', 'IO16', 'IO0', 'GND', 'VCC', 'U0R', 'U0T', 'GND'];
      topPins.forEach((p, i) => {
        const px = 78 + i * 44;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(px, 24, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(p, px, 48);
      });
      botPins.forEach((p, i) => {
        const px = 78 + i * 44;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(px, h - 24, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(p, px, h - 42);
      });

      // Gold PCB meander 2.4 GHz Wi-Fi antenna on rear edge (left side of texture)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(22, 84);
      ctx.lineTo(54, 84);
      ctx.lineTo(54, 118);
      ctx.lineTo(22, 118);
      ctx.lineTo(22, 152);
      ctx.lineTo(54, 152);
      ctx.lineTo(54, 186);
      ctx.lineTo(22, 186);
      ctx.lineTo(22, 224);
      ctx.lineTo(54, 224);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('AI-THINKER ESP32-CAM', w / 2 + 24, 275);
    });

    const camPcbGeo = new THREE.BoxGeometry(0.18, 2.35, 3.65);
    const camEdgeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const camOuterMat = new THREE.MeshStandardMaterial({ map: camOuterTex, roughness: 0.42, metalness: 0.14 });
    const camPcb = new THREE.Mesh(camPcbGeo, [
      camOuterMat, // +X (outer visible face!)
      camEdgeMat,  // -X (inner side)
      camEdgeMat,
      camEdgeMat,
      camEdgeMat,
      camEdgeMat,
    ]);
    camGroup.add(camPcb);

    // Metallic ESP32-S RF Shield Can stamped with text on outer face (+X)
    const rfCanTex = this.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ESP32-S', w / 2, 102);
      ctx.font = 'bold 20px monospace';
      ctx.fillText('Wi-Fi 2.4G', w / 2, 146);
      ctx.font = '16px monospace';
      ctx.fillText('AI-THINKER', w / 2, 184);
    });
    const rfGeo = new THREE.BoxGeometry(0.24, 1.38, 1.56);
    const rfFaceMat = new THREE.MeshPhysicalMaterial({ map: rfCanTex, metalness: 0.82, roughness: 0.28 });
    const rfCan = new THREE.Mesh(rfGeo, [
      rfFaceMat,
      brushedMetalMat,
      brushedMetalMat,
      brushedMetalMat,
      brushedMetalMat,
      brushedMetalMat,
    ]);
    rfCan.position.set(0.18, 0.05, -0.35);
    camGroup.add(rfCan);

    // Metallic MicroSD card slot cage on the inner-front side + 2×8 black male pin headers
    const sdGeo = new THREE.BoxGeometry(0.22, 1.18, 1.24);
    const sdCage = new THREE.Mesh(sdGeo, brushedMetalMat);
    sdCage.position.set(-0.16, 0.02, 0.45);
    camGroup.add(sdCage);

    const headerBarGeo = new THREE.BoxGeometry(0.20, 0.18, 2.55);
    const hdrPinGeo = new THREE.BoxGeometry(0.34, 0.05, 0.05);
    [-1.02, 1.02].forEach((hy) => {
      const bar = new THREE.Mesh(headerBarGeo, darkPlasticMat);
      bar.position.set(0.14, hy, 0.18);
      camGroup.add(bar);
      for (let i = 0; i < 8; i++) {
        const pin = new THREE.Mesh(hdrPinGeo, brushedGoldMat);
        pin.position.set(0.28, hy, -0.92 + i * 0.31);
        camGroup.add(pin);
      }
    });

    // Orange Kapton FPC ribbon cable curving forward from ESP32-CAM ZIF socket to forward-facing OV2640 lens pod
    const fpcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.16, 0.05, 1.42),
      new THREE.Vector3(0.24, 0.08, 2.15),
      new THREE.Vector3(0.10, 0.12, 2.75),
      new THREE.Vector3(-0.02, 0.12, 3.00),
    ]);
    const fpcGeo = new THREE.TubeGeometry(fpcCurve, 18, 0.14, 6, false);
    const fpcMesh = new THREE.Mesh(fpcGeo, kaptonMat);
    fpcMesh.scale.set(0.35, 2.8, 1.0); // Flatten into a ribbon!
    camGroup.add(fpcMesh);

    // Forward-facing OV2640 Camera Module Pod mounted at the right hinge (local Z=+3.02 -> world Z=+1.37)
    const ovPodMount = this.createMountingClip(0.74, 0.96, 0.78, clip3dMat);
    ovPodMount.position.set(-0.18, 0.08, 2.95);
    camGroup.add(ovPodMount);

    const ovBodyGeo = new THREE.BoxGeometry(0.84, 0.84, 0.42);
    const ovBody = new THREE.Mesh(ovBodyGeo, darkPlasticMat);
    ovBody.position.set(0.02, 0.12, 3.16);
    camGroup.add(ovBody);

    // Multi-stepped M7 threaded OV2640 lens barrel (LatheGeometry) pointing straight forward (+Z)
    const barrelPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.36, 0.0),
      new THREE.Vector2(0.36, 0.24),
      new THREE.Vector2(0.30, 0.28),
      new THREE.Vector2(0.30, 0.56),
      new THREE.Vector2(0.23, 0.56),
      new THREE.Vector2(0.21, 0.44),
    ];
    const barrelGeo = new THREE.LatheGeometry(barrelPts, 28);
    const barrelMesh = new THREE.Mesh(barrelGeo, darkPlasticMat);
    barrelMesh.rotation.x = Math.PI / 2;
    barrelMesh.position.set(0.02, 0.12, 3.35);
    camGroup.add(barrelMesh);

    // Deep sapphire/violet multi-coated camera lens glass
    const optLensGeo = new THREE.SphereGeometry(0.21, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const optLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.22,
      roughness: 0.03,
      metalness: 0.15,
      clearcoat: 1.0,
      ior: 1.72,
    });
    const optLens = new THREE.Mesh(optLensGeo, optLensMat);
    optLens.rotation.x = Math.PI / 2;
    optLens.position.set(0.02, 0.12, 3.82);
    camGroup.add(optLens);

    // SMD 5050 White Flash LED (white ceramic square + yellow phosphor center) right beneath OV2640
    const flashCaseGeo = new THREE.BoxGeometry(0.34, 0.34, 0.14);
    const flashCase = new THREE.Mesh(flashCaseGeo, jstWhiteMat);
    flashCase.position.set(0.02, -0.42, 3.34);
    const flashCoreGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16);
    const flashCoreMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfef08a,
      emissiveIntensity: 0.35,
    });
    const flashCore = new THREE.Mesh(flashCoreGeo, flashCoreMat);
    flashCore.rotation.x = Math.PI / 2;
    flashCore.position.set(0.02, -0.42, 3.41);
    camGroup.add(flashCase, flashCore);

    this.disposableResources.push(
      camPcbGeo,
      camEdgeMat,
      camOuterMat,
      rfGeo,
      rfFaceMat,
      sdGeo,
      headerBarGeo,
      hdrPinGeo,
      fpcGeo,
      ovBodyGeo,
      barrelGeo,
      optLensGeo,
      optLensMat,
      flashCaseGeo,
      flashCoreGeo,
      flashCoreMat,
    );
    this.registerPart('camera', camGroup, [4.6, 2.2, 1.8]);

    // ---------------------------------------------------------
    // 8. GROVE PIEZO BUZZER (Right Rear Temple near Wearer's Ear)
    //    Seeed blue notched PCB + black cylindrical piezo with brass aperture & '+' polarity mark
    // ---------------------------------------------------------
    const buzzerGroup = new THREE.Group();
    // Clamped to right rear temple near ear (temple X=+7.98, Y=0.42, Z=-6.25)
    buzzerGroup.position.set(8.22, 0.44, -6.25);

    // 3D-printed temple clip wrapping around right temple
    const buzzClip = this.createMountingClip(0.56, 0.68, 0.62, clip3dMat);
    buzzClip.position.set(-0.22, 0.0, 0);
    buzzerGroup.add(buzzClip);

    // 20x20 mm Seeed-blue Grove PCB with semicircular notches (lying in YZ plane)
    const buzzPcbGeo = this.createGrovePcbGeometry(1.72, 1.72, 0.16);
    const buzzPcb = new THREE.Mesh(buzzPcbGeo, groveBlueMat);
    buzzPcb.rotation.y = Math.PI / 2;
    buzzerGroup.add(buzzPcb);

    // Black cylindrical piezoelectric transducer facing inward/outward with authentic brass aperture & '+' mark
    const buzzTopTex = this.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      // Subtle molded plastic rim
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 112, 0, Math.PI * 2);
      ctx.stroke();
      // White '+' polarity symbol
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', w / 2, 68);
      // Center acoustic hole revealing brass piezo diaphragm
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 8;
      ctx.stroke();
    });

    const buzzCylGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.54, 28);
    const buzzCapGeo = new THREE.CircleGeometry(0.56, 28);
    const buzzCapMat = new THREE.MeshStandardMaterial({ map: buzzTopTex, roughness: 0.45 });

    const buzzCyl = new THREE.Mesh(buzzCylGeo, darkPlasticMat);
    buzzCyl.rotation.z = Math.PI / 2;
    buzzCyl.position.set(0.34, 0.02, -0.14);
    const buzzCap = new THREE.Mesh(buzzCapGeo, buzzCapMat);
    buzzCap.rotation.y = Math.PI / 2;
    buzzCap.position.set(0.615, 0.02, -0.14);
    buzzerGroup.add(buzzCyl, buzzCap);

    // Forward-facing white Grove JST socket on buzzer PCB
    const buzzJst = this.createGroveJstSocket(jstWhiteMat, jstCavityMat, brushedGoldMat);
    buzzJst.position.set(0.24, -0.10, 0.62);
    buzzerGroup.add(buzzJst);

    this.disposableResources.push(buzzCylGeo, buzzCapGeo, buzzCapMat);
    this.registerPart('buzzer', buzzerGroup, [5.2, 1.2, -2.4]);

    // ---------------------------------------------------------
    // 9. 0.96" SSD1306 OLED + 45° AR BEAM-SPLITTER PRISM (Right-Hinge Boom Arm)
    //    Positioned cleanly in UPPER-OUTER quadrant of right lens — ZERO central sight obstruction!
    // ---------------------------------------------------------
    const oledGroup = new THREE.Group();
    oledGroup.position.set(6.45, 0.25, 2.02);

    // Articulated dark-slate boom arm connecting cleanly to the right hinge (world X=+7.98, Y=0.55, Z=1.08)
    const boomCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.52, 0.30, -0.94),
      new THREE.Vector3(1.48, 0.24, -0.15),
      new THREE.Vector3(1.10, 0.10, 0.14),
      new THREE.Vector3(0.45, 0.0, 0.08),
    ]);
    const boomGeo = new THREE.TubeGeometry(boomCurve, 18, 0.14, 10, false);
    oledGroup.add(new THREE.Mesh(boomGeo, frameMat));

    // Authentic 0.96" SSD1306 I2C OLED PCB (dark navy blue PCB + 4 corner brass holes + 4-pin gold header)
    const oledPcbTex = this.makeCanvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0c2d5e';
      ctx.fillRect(0, 0, w, h);
      // 4 brass corner mounting holes
      [
        [22, 22],
        [w - 22, 22],
        [22, h - 22],
        [w - 22, h - 22],
      ].forEach(([cx, cy]) => {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GND  VCC  SCL  SDA', w / 2, 30);
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('0.96" OLED I2C', w / 2, h - 18);
    });

    const oledModule = new THREE.Group();
    oledModule.position.set(0.32, 0.02, 0.05);
    // Angled slightly inward to project into the 45° optical beam-splitter prism
    oledModule.rotation.y = -0.35;

    const oledPcbGeo = new THREE.BoxGeometry(1.82, 1.38, 0.14);
    const oledPcbMat = new THREE.MeshStandardMaterial({ map: oledPcbTex, roughness: 0.38 });
    oledModule.add(new THREE.Mesh(oledPcbGeo, oledPcbMat));

    // Glossy black OLED glass bezel + live dynamic SSD1306 display plane + orange bottom ribbon
    const oledGlassGeo = new THREE.BoxGeometry(1.64, 0.92, 0.06);
    const oledGlass = new THREE.Mesh(oledGlassGeo, darkPlasticMat);
    oledGlass.position.set(0, -0.04, -0.09);
    const oledScreenGeo = new THREE.PlaneGeometry(1.52, 0.80);
    const oledScreenMat = new THREE.MeshBasicMaterial({ map: this.oledTexture });
    const oledScreen = new THREE.Mesh(oledScreenGeo, oledScreenMat);
    oledScreen.position.set(0, -0.04, -0.125);
    oledScreen.rotation.y = Math.PI;
    // Also show front status miniature on outer glass so front-camera inspection is clear
    const oledRibbonGeo = new THREE.BoxGeometry(0.75, 0.22, 0.04);
    const oledRibbon = new THREE.Mesh(oledRibbonGeo, kaptonMat);
    oledRibbon.position.set(0, -0.58, -0.06);
    oledModule.add(oledGlass, oledScreen, oledRibbon);

    // 4-pin gold I2C header along top edge of OLED PCB
    const i2cPinGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.34, 8);
    [-0.27, -0.09, 0.09, 0.27].forEach((px) => {
      const pin = new THREE.Mesh(i2cPinGeo, brushedGoldMat);
      pin.position.set(px, 0.72, 0);
      oledModule.add(pin);
    });
    oledGroup.add(oledModule);

    // 45° Optical Glass AR Beam-Splitter Prism Combiner (positioned in upper-outer corner of right lens)
    // Leaves central eye line-of-sight at X=+4.25, Y=-0.65 completely clear!
    const prismMountGeo = new THREE.BoxGeometry(0.95, 0.14, 0.18);
    const prismMount = new THREE.Mesh(prismMountGeo, clip3dMat);
    prismMount.position.set(-0.62, 0.44, -0.02);
    oledGroup.add(prismMount);

    const prismGeo = new THREE.BoxGeometry(1.42, 0.82, 0.52);
    const prism = new THREE.Mesh(prismGeo, prismGlassMat);
    prism.position.set(-0.98, 0.0, -0.04);
    prism.rotation.y = 0.24;
    prism.renderOrder = 6;
    oledGroup.add(prism);

    // Subtle glowing virtual HUD reflection plane inside the 45° beam-splitter prism
    const hudPlaneGeo = new THREE.PlaneGeometry(1.26, 0.68);
    const hudPlaneMat = new THREE.MeshBasicMaterial({
      map: this.oledTexture,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const hudPlane = new THREE.Mesh(hudPlaneGeo, hudPlaneMat);
    hudPlane.position.set(-0.98, 0.0, -0.04);
    hudPlane.rotation.y = 0.24;
    hudPlane.renderOrder = 7;
    oledGroup.add(hudPlane);

    this.disposableResources.push(
      boomGeo,
      oledPcbGeo,
      oledPcbMat,
      oledGlassGeo,
      oledScreenGeo,
      oledScreenMat,
      oledRibbonGeo,
      i2cPinGeo,
      prismMountGeo,
      prismGeo,
      hudPlaneGeo,
      hudPlaneMat,
    );
    this.registerPart('oled', oledGroup, [3.2, -1.2, 4.0]);

    // ---------------------------------------------------------
    // 10. PROPERLY ROUTED GROVE 4-WIRE CABLE HARNESSES (Clipped Along Temples & Brow Bar)
    //     Red (5V), Black (GND), White (NC/SDA), Yellow (SIG/SCL)
    // ---------------------------------------------------------
    const cablesGroup = new THREE.Group();
    const groveColors = [0xdc2626, 0x0f172a, 0xf8fafc, 0xeab308];

    // Harness A: Shield Grove JST ports -> neatly tucked along Left Temple -> Brow Channel (LED, Lux, Ultrasonic)
    groveColors.forEach((hex, idx) => {
      const dy = (idx - 1.5) * 0.065;
      const leftCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-8.86, -0.96 + dy, -2.60),
        new THREE.Vector3(-8.62, 0.35 + dy, -1.65),
        new THREE.Vector3(-8.22, 0.80 + dy, 0.65),
        new THREE.Vector3(-8.55, 0.72 + dy, 0.98),
        new THREE.Vector3(-4.35, 1.88 + dy, 0.88),
        new THREE.Vector3(0.0, 1.92 + dy, 0.88),
      ]);
      const geo = new THREE.TubeGeometry(leftCurve, 36, 0.036, 6, false);
      const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 });
      cablesGroup.add(new THREE.Mesh(geo, mat));
      this.disposableResources.push(geo, mat);
    });

    // Harness B: Cross-Brow I2C + P2 Buzzer -> Right Hinge -> OLED I2C & Right Temple Rear Buzzer
    groveColors.forEach((hex, idx) => {
      const dy = (idx - 1.5) * 0.06;
      const rightCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 1.72 + dy, 0.88),
        new THREE.Vector3(4.2, 1.48 + dy, 0.88),
        new THREE.Vector3(7.95, 0.82 + dy, 0.92),
        new THREE.Vector3(8.22, 0.78 + dy, -1.65),
        new THREE.Vector3(8.30, 0.55 + dy, -4.45),
        new THREE.Vector3(8.42, 0.36 + dy, -5.60),
      ]);
      const geo = new THREE.TubeGeometry(rightCurve, 36, 0.034, 6, false);
      const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 });
      cablesGroup.add(new THREE.Mesh(geo, mat));
      this.disposableResources.push(geo, mat);
    });

    // Harness C: Short I2C drop from Right Hinge to 0.96" OLED Header
    [0xdc2626, 0x0f172a, 0xf8fafc, 0xeab308].forEach((hex, idx) => {
      const dx = (idx - 1.5) * 0.065;
      const oledDropCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(7.85 + dx, 0.72, 1.02),
        new THREE.Vector3(7.52 + dx, 0.78, 1.62),
        new THREE.Vector3(6.75 + dx, 0.94, 2.04),
      ]);
      const geo = new THREE.TubeGeometry(oledDropCurve, 16, 0.028, 6, false);
      const mat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 });
      cablesGroup.add(new THREE.Mesh(geo, mat));
      this.disposableResources.push(geo, mat);
    });

    this.registerPart('cables', cablesGroup, [0, 3.2, -2.0]);
  }

  public updateOledScreen(mode: string, detail: string, isAlert: boolean): void {
    const ctx = this.oledCtx;
    if (!ctx) return;
    // Authentic dual-color 0.96" SSD1306 OLED (top 32px yellow band + lower 96px cyan band)
    ctx.fillStyle = isAlert ? '#3b0712' : '#020617';
    ctx.fillRect(0, 0, 256, 128);

    // Top yellow SSD1306 status band
    ctx.fillStyle = isAlert ? '#f87171' : '#facc15';
    ctx.font = 'bold 19px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`MODE: ${mode}`, 14, 28);

    // Horizontal pixel divider
    ctx.strokeStyle = isAlert ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 38);
    ctx.lineTo(248, 38);
    ctx.stroke();

    // Lower cyan telemetry area
    ctx.fillStyle = isAlert ? '#fecaca' : '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(detail.slice(0, 19), 14, 74);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText('HUD LOYALLE · 10.42.0.1', 14, 108);

    ctx.strokeStyle = isAlert ? '#f87171' : '#0284c7';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 250, 122);

    this.oledTexture.needsUpdate = true;
  }

  private buildFlowVisualizers(): void {
    // 5V Energy path: Shield Grove -> Left Temple -> Brow Sensors -> Right Temple (ESP32-CAM & OLED)
    const energyCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-8.85, -0.5, -4.4),
      new THREE.Vector3(-8.4, 0.9, 0.8),
      new THREE.Vector3(-4.35, 2.1, 1.1),
      new THREE.Vector3(0.0, 2.1, 1.1),
      new THREE.Vector3(8.2, 0.9, 0.9),
      new THREE.Vector3(8.5, 0.7, -1.6),
    ]);
    // Information path: Ultrasonic & Lux -> micro:bit V2 -> OLED AR Prism & Buzzer
    const infoCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 2.3, 1.4),
      new THREE.Vector3(-4.35, 2.25, 1.4),
      new THREE.Vector3(-8.9, 1.7, -4.4),
      new THREE.Vector3(0.0, 1.7, 0.85),
      new THREE.Vector3(6.45, 0.35, 2.05),
      new THREE.Vector3(8.25, 0.45, -6.2),
    ]);

    const energyTubeGeo = new THREE.TubeGeometry(energyCurve, 44, 0.045, 8, false);
    const energyTubeMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.5 });
    const infoTubeGeo = new THREE.TubeGeometry(infoCurve, 44, 0.045, 8, false);
    const infoTubeMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.5 });
    this.flowGroup.add(new THREE.Mesh(energyTubeGeo, energyTubeMat), new THREE.Mesh(infoTubeGeo, infoTubeMat));

    const particleGeo = new THREE.SphereGeometry(0.14, 12, 10);
    const energyDotMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const infoDotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.disposableResources.push(energyTubeGeo, energyTubeMat, infoTubeGeo, infoTubeMat, particleGeo, energyDotMat, infoDotMat);

    for (let i = 0; i < 4; i++) {
      const eMesh = new THREE.Mesh(particleGeo, energyDotMat);
      this.flowGroup.add(eMesh);
      this.flowParticles.push({ mesh: eMesh, curve: energyCurve, offset: i * 0.25, speed: 0.26 });

      const iMesh = new THREE.Mesh(particleGeo, infoDotMat);
      this.flowGroup.add(iMesh);
      this.flowParticles.push({ mesh: iMesh, curve: infoCurve, offset: i * 0.25 + 0.12, speed: 0.32 });
    }
  }

  public setShowFlows(visible: boolean): void {
    this.flowGroup.visible = visible;
  }

  public setIsolateElectronics(isolate: boolean): void {
    const frameEntry = this.partGroups['frame'];
    if (frameEntry) {
      frameEntry.group.visible = !isolate;
    }
  }

  public setExplodeFactor(factor: number): void {
    this.targetExplode = THREE.MathUtils.clamp(factor, 0, 1);
  }

  public setCameraPreset(preset: CameraPresetKey): void {
    const cfg = CAMERA_PRESETS[preset];
    this.camTargetPos.set(...cfg.pos);
    this.camLookTarget.set(...cfg.target);
    this.isCameraTransitioning = true;
  }

  public setLiveHardwareState(ledOn: boolean, alertOn: boolean, modeLabel: string, detail: string): void {
    this.alertActive = alertOn;
    if (alertOn) this.alertTimer = 1.6;
    if (this.projectorLedMesh) {
      const mat = this.projectorLedMesh.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = ledOn ? 2.5 : 0.18;
    }
    if (this.projectorPointLight) {
      this.projectorPointLight.intensity = ledOn ? 3.8 : 0;
    }
    this.updateOledScreen(modeLabel, detail, alertOn);
  }

  public triggerAlertBurst(): void {
    this.alertActive = true;
    this.alertTimer = 1.8;
    this.updateOledScreen('ALERTE', 'OBSTACLE CRITIQUE !', true);
  }

  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public captureExplodedSnapshot(): string {
    const prevExplode = this.currentExplode;
    for (const key of Object.keys(this.partGroups)) {
      const item = this.partGroups[key];
      item.group.position.copy(item.basePos).add(item.explodeOffset);
    }
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    for (const key of Object.keys(this.partGroups)) {
      const item = this.partGroups[key];
      _vec3.copy(item.explodeOffset).multiplyScalar(prevExplode);
      item.group.position.copy(item.basePos).add(_vec3);
    }
    this.renderer.render(this.scene, this.camera);
    return dataUrl;
  }

  private handleClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickableMeshes, false);
    if (hits.length > 0) {
      const key = hits[0].object.userData.partKey as string | undefined;
      if (key && this.callbacks.onSelectPart) {
        this.callbacks.onSelectPart(key);
      }
    }
  };

  private handlePointerMove = (event: MouseEvent): void => {
    const now = performance.now();
    if (now - this.lastHoverCheck < 50) return;
    this.lastHoverCheck = now;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.clickableMeshes, false);
    this.renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost?.(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost?.(false);
  };

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);

      if (Math.abs(this.currentExplode - this.targetExplode) > 0.001) {
        this.currentExplode = THREE.MathUtils.damp(this.currentExplode, this.targetExplode, 7, dt);
        for (const key of Object.keys(this.partGroups)) {
          const item = this.partGroups[key];
          _vec3.copy(item.explodeOffset).multiplyScalar(this.currentExplode);
          item.group.position.copy(item.basePos).add(_vec3);
        }
      }

      if (this.isCameraTransitioning) {
        const lambda = 6.5;
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.camTargetPos.x, lambda, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.camTargetPos.y, lambda, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.camTargetPos.z, lambda, dt);
        this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.camLookTarget.x, lambda, dt);
        this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.camLookTarget.y, lambda, dt);
        this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.camLookTarget.z, lambda, dt);

        if (
          this.camera.position.distanceTo(this.camTargetPos) < 0.04 &&
          this.controls.target.distanceTo(this.camLookTarget) < 0.04
        ) {
          this.isCameraTransitioning = false;
        }
      }

      if (this.alertTimer > 0) {
        this.alertTimer = Math.max(0, this.alertTimer - dt);
        const pulse = 0.5 + 0.5 * Math.sin(this.clock.elapsedTime * 14);
        this.matrixLeds.forEach((led) => {
          (led.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + pulse * 2.2;
        });
        if (this.alertTimer === 0 && !this.alertActive) {
          this.matrixLeds.forEach((led, idx) => {
            (led.material as THREE.MeshStandardMaterial).emissiveIntensity = idx === 12 ? 0.8 : 0.06;
          });
        }
      }

      if (this.flowGroup.visible) {
        const elapsed = this.clock.elapsedTime;
        for (const fp of this.flowParticles) {
          const t = (elapsed * fp.speed + fp.offset) % 1;
          fp.curve.getPointAt(t, _vec3);
          fp.mesh.position.copy(_vec3);
        }
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(() => {
          if (!this.disposed) this.frameId = requestAnimationFrame(tick);
        });
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl.fenceSync) {
      window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        window.setTimeout(cb, 80);
      }
    };
    window.setTimeout(poll, 5);
  }

  public setTheme(isDark: boolean): void {
    const bgHex = isDark ? 0x0b1220 : 0xeef3f8;
    const tableHex = isDark ? 0x162033 : 0xe2e8f0;
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, isDark ? 0.011 : 0.012);
    if (this.tableMat) {
      this.tableMat.color.setHex(tableHex);
    }
    if (this.stageGridMat) {
      this.stageGridMat.opacity = isDark ? 0.22 : 0.45;
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.controls.dispose();
    this.pmremGenerator.dispose();
    for (const res of this.disposableResources) {
      res.dispose();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
