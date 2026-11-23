import { jsPDF } from 'jspdf';
import { WORKSHEETS_BY_LEVEL } from '../data/curriculum';
import { PEDAGOGICAL_GUIDE_STEPS, QUIZ_QUESTIONS } from '../data/pedagogyPlus';
import { appState, type BlockNode } from '../stores/appState.svelte';

export async function svgElementToPngDataUrl(
  svgEl: SVGSVGElement,
  outWidth = 1040,
  outHeight = 480,
): Promise<string> {
  const cloned = svgEl.cloneNode(true) as SVGSVGElement;
  if (!cloned.getAttribute('xmlns')) {
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  cloned.setAttribute('width', String(outWidth));
  cloned.setAttribute('height', String(outHeight));

  const xml = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('SVG rasterization failed'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, outWidth, outHeight);
    ctx.drawImage(img, 0, 0, outWidth, outHeight);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderFallbackSchematicPng(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 960, 420);

  // Subtle grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let x = 20; x < 960; x += 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 420);
    ctx.stroke();
  }
  for (let y = 20; y < 420; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  // Controller card
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.fillRect(40, 45, 250, 330);
  ctx.strokeRect(40, 45, 250, 330);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('micro:bit V2 + Shield', 64, 82);

  const ports: Record<string, number> = {
    P0: 130,
    P1: 180,
    P2: 230,
    I2C: 280,
    '5V': 320,
    GND: 355,
  };
  const modules: Record<string, { y: number; label: string }> = {
    lux: { y: 80, label: 'Capteur Luminosité' },
    ultra: { y: 150, label: 'Capteur Ultrason' },
    led: { y: 220, label: 'LED Blanche 5 mm' },
    buzzer: { y: 290, label: 'Buzzer Piézo' },
    oled: { y: 355, label: 'Afficheur OLED I2C' },
  };

  Object.entries(ports).forEach(([id, py]) => {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(id, 240, py + 4);
  });

  Object.values(modules).forEach((m) => {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(630, m.y - 22, 280, 44);
    ctx.strokeRect(630, m.y - 22, 280, 44);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(m.label, 650, m.y + 5);
  });

  for (const w of appState.wires) {
    const sy = ports[w.fromPort] ?? 130;
    const ey = modules[w.toModule]?.y ?? 150;
    ctx.strokeStyle =
      w.wireColor === 'red'
        ? '#ef4444'
        : w.wireColor === 'blue'
          ? '#38bdf8'
          : w.wireColor === 'black'
            ? '#cbd5e1'
            : '#eab308';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(290, sy);
    ctx.bezierCurveTo(430, sy, 490, ey, 630, ey);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

function blockRgb(kind: BlockNode['kind']): [number, number, number] {
  switch (kind) {
    case 'read_sensor':
      return [5, 150, 105];
    case 'if_below':
      return [217, 119, 6];
    case 'else_branch':
      return [180, 83, 9];
    case 'on_button_a':
    case 'on_button_b':
      return [13, 148, 136];
    case 'set_led':
      return [225, 29, 72];
    case 'set_buzzer':
      return [147, 51, 234];
    case 'set_oled':
      return [2, 132, 199];
    case 'send_mqtt':
      return [79, 70, 229];
    default:
      return [51, 65, 85];
  }
}

export async function generateStudentSheetPdf(): Promise<void> {
  await appState.captureAllSnapshots();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Fiche Élève — Lunettes Connectées à l’IA (Cycle 4)', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(186, 230, 253);
  doc.text(
    'TechnoLOY Guadeloupe · Programme Technologie BO n° 9 (29/02/2024) · Maquette 5 V USB non EPI',
    margin,
    18,
  );

  // Student Identification Box
  let y = 31;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 17, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const fullName = `${appState.studentInfo.prenom || '---'} ${appState.studentInfo.nom || '---'}`.trim();
  doc.text(`Élève : ${fullName}`, margin + 4, y + 6.5);
  doc.text(`Niveau : ${appState.studentInfo.niveau}`, margin + 96, y + 6.5);
  doc.text(`Classe : ${appState.studentInfo.classe || '---'}`, margin + 135, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Groupe / Poste : ${appState.studentInfo.groupe || '---'}`, margin + 4, y + 12.5);
  doc.text(`Date : ${appState.studentInfo.date}`, margin + 96, y + 12.5);
  doc.text(`Scénario Labo : ${appState.labScenario}`, margin + 135, y + 12.5);

  // Section 1 & Section 2 side-by-side cards (3D View + Electronic Schematic)
  y = 53;
  const colGap = 6;
  const colW = (contentWidth - colGap) / 2;
  const imgBoxH = 56;

  // Section 1: Captured 3D Model View
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. Vue capturée du modèle 3D (PBR)', margin, y);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y + 3, colW, imgBoxH, 2, 2, 'FD');

  if (appState.threeSnapshotUrl) {
    doc.addImage(appState.threeSnapshotUrl, 'PNG', margin + 1.5, y + 4.5, colW - 3, imgBoxH - 8);
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Ouvrir l’onglet 1 (Découverte 3D) pour actualiser la capture.', margin + 4, y + 28);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Mode : ${appState.viewMode3D === 'exploded' ? 'Vue éclatée' : 'Assemblage'} · Pièce : ${appState.selected3DPart}`,
    margin + 2,
    y + imgBoxH + 1.5,
  );

  // Section 2: Current Electronic Schematic
  const rightX = margin + colW + colGap;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Schéma électronique actuel', rightX, y);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(rightX, y + 3, colW, imgBoxH, 2, 2, 'FD');

  const schematicPng =
    appState.labGridSnapshotUrl || appState.schematicSnapshotUrl || renderFallbackSchematicPng();
  if (schematicPng) {
    doc.addImage(schematicPng, 'PNG', rightX + 1.5, y + 4.5, colW - 3, imgBoxH - 8);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const elecSummary = appState.electronicGridShort
    ? 'Alerte : court-circuit détecté sur la grille'
    : appState.hasElectricalError
      ? 'Alerte : erreur de câblage sur Shield Grove'
      : 'Continuité conforme (aucun court-circuit)';
  doc.text(elecSummary, rightX + 2, y + imgBoxH + 1.5);

  // Electrical diagnostics strip
  y += imgBoxH + 7;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Diagnostic électrique du montage :', margin + 3, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const diagText = appState.electricalDiagnostics
    .slice(0, 2)
    .map((d) => `[${d.code}] ${d.message}`)
    .join('  |  ');
  const wrappedDiag = doc.splitTextToSize(diagText, contentWidth - 6);
  doc.text(wrappedDiag, margin + 3, y + 10.5);

  // Section 3: Block Program
  y += 23;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. Programme en blocs visuels (mBlock / MakeCode)', margin, y);

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  const blocksBoxHeight = Math.max(48, 24 + appState.blockProgram.length * 10);
  doc.roundedRect(margin, y, contentWidth, blocksBoxHeight, 2, 2, 'FD');

  // Start hat block
  let by = y + 4;
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin + 4, by, 92, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('quand la carte micro:bit V2 démarre', margin + 7, by + 5);

  by += 9;
  doc.setFillColor(3, 105, 161);
  doc.roundedRect(margin + 9, by, 72, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('répéter indéfiniment', margin + 12, by + 5);

  by += 9.5;
  for (const blk of appState.blockProgram) {
    const indented =
      blk.kind !== 'read_sensor' &&
      blk.kind !== 'if_below' &&
      blk.kind !== 'else_branch' &&
      blk.kind !== 'on_button_a' &&
      blk.kind !== 'on_button_b';
    const bx = margin + (indented ? 20 : 14);
    const [r, g, b] = blockRgb(blk.kind);
    const label =
      blk.kind === 'if_below'
        ? `${blk.label} (${blk.threshold ?? appState.activeThreshold} ${appState.labScenario === '5e' ? 'lux' : 'cm'})`
        : blk.label;

    doc.setFillColor(r, g, b);
    doc.roundedRect(bx, by, contentWidth - (bx - margin) - 6, 7.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, bx + 3, by + 5);
    by += 9.5;
  }

  // Secondary schematic or exploded 3D view if space permits
  const remainingSpace = 282 - (y + blocksBoxHeight);
  if (remainingSpace > 56 && (appState.threeExplodedSnapshotUrl || (appState.labGridSnapshotUrl && appState.schematicSnapshotUrl))) {
    const sy = y + blocksBoxHeight + 6;
    const halfW = (contentWidth - 6) / 2;
    if (appState.threeExplodedSnapshotUrl) {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('4. Vue 3D éclatée (sous-ensembles)', margin, sy);
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, sy + 2.5, halfW, 44, 2, 2, 'FD');
      doc.addImage(appState.threeExplodedSnapshotUrl, 'PNG', margin + 1.5, sy + 4, halfW - 3, 41);
    }
    if (appState.schematicSnapshotUrl) {
      const sx = appState.threeExplodedSnapshotUrl ? margin + halfW + 6 : margin;
      const sw = appState.threeExplodedSnapshotUrl ? halfW : contentWidth;
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Banc de câblage Shield Grove', sx, sy);
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(sx, sy + 2.5, sw, 44, 2, 2, 'FD');
      doc.addImage(appState.schematicSnapshotUrl, 'PNG', sx + 1.5, sy + 4, sw - 3, 41);
    }
  }

  // Footer page 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Broker MQTT : ${appState.brokerIp}:1883 · Topic : ${appState.topicBase}/* · Page 1`,
    margin,
    290,
  );

  // Page 2: Student Worksheet Answers
  const questions = WORKSHEETS_BY_LEVEL[appState.studentInfo.niveau];
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Activités Élève (${appState.studentInfo.niveau}) — ${fullName}`, margin, 11.5);

  let qy = 26;
  for (const q of questions) {
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${q.code} — ${q.title}`, margin, qy);
    qy += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const promptLines = doc.splitTextToSize(q.prompt, contentWidth);
    doc.text(promptLines, margin, qy);
    qy += promptLines.length * 4 + 2;

    const answerText =
      q.type === 'chain'
        ? `Acquérir : ${appState.worksheetAnswers[`${q.id}_acq`] || '---'}  |  Traiter : ${appState.worksheetAnswers[`${q.id}_trt`] || '---'}  |  Communiquer : ${appState.worksheetAnswers[`${q.id}_com`] || '---'}`
        : appState.worksheetAnswers[q.id] || '(Non renseigné)';

    const ansLines = doc.splitTextToSize(answerText, contentWidth - 6);
    const boxH = Math.max(14, ansLines.length * 4.2 + 5);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, qy, contentWidth, boxH, 1.5, 1.5, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.text(ansLines, margin + 3, qy + 5);
    qy += boxH + 5;
    if (qy > 235) break;
  }

  // Quiz, Guide Progress & MQTT Telemetry Summary Box on Page 2
  const lvlQs = QUIZ_QUESTIONS.filter((q) => q.level === appState.studentInfo.niveau);
  const quizOk = lvlQs.filter((q) => appState.quizAnswers[q.id] === q.correctIndex).length;
  const guideSteps = PEDAGOGICAL_GUIDE_STEPS[appState.studentInfo.niveau];
  const guideOk = guideSteps.filter((s) => Boolean(appState.guideCompletedSteps[s.id])).length;
  if (qy < 252) {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, qy, contentWidth, 24, 2, 2, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(
      `Quiz (${appState.studentInfo.niveau}) : ${quizOk}/${lvlQs.length}   |   Guide pas à pas : ${guideOk}/${guideSteps.length} étapes   |   Trames MQTT : ${appState.mqttSentCount}`,
      margin + 3,
      qy + 6,
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const mqttLine = appState.lastMqttJsonPayload
      ? `Dernier JSON MQTT : ${appState.lastMqttJsonPayload.replace(/\s+/g, ' ').slice(0, 115)}...`
      : 'Aucune trame JSON MQTT émise durant cette session.';
    doc.text(mqttLine, margin + 3, qy + 13);
    doc.text(
      `Versions sauvegardées : ${appState.programDrafts.length}   |   Mode EBEP : ${appState.ebepMode ? 'Actif' : 'Standard'}`,
      margin + 3,
      qy + 19,
    );
  }

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Kit Pédagogique Lunettes Connectées IA · TechnoLOY Guadeloupe · Page 2', margin, 290);

  const safeFile = `fiche_eleve_${appState.studentInfo.niveau}_${appState.studentInfo.nom || 'eleve'}_${appState.studentInfo.prenom || 'kit'}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  doc.save(`${safeFile}.pdf`);
  appState.showToast('Fiche élève PDF générée avec vue 3D, schéma et blocs.', 'success');
}
