const PDFDocument = require('pdfkit');
const axios       = require('axios');

// ── Télécharger image depuis URL ──────────────────────────
const downloadImage = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  } catch {
    return null;
  }
};

// ── Formater date française ───────────────────────────────
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

// ── FICHE ÉLÈVE PDF ───────────────────────────────────────
const generateFicheEleve = async (eleve, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });

  // Headers HTTP
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="fiche_${eleve.nom}_${eleve.prenom}.pdf"`
  );
  doc.pipe(res);

  const W = 515; // largeur utile

  // ── EN-TÊTE ─────────────────────────────────────────────
  doc.rect(0, 0, 595, 90).fill('#1A2E4A');

  doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold')
     .text('LA PORTE DE LA RÉUSSITE', 40, 22, { align: 'center' });

  doc.fontSize(11).fillColor('#93C5FD').font('Helvetica')
     .text('FICHE D\'INSCRIPTION ÉLÈVE', 40, 52, { align: 'center' });

  doc.fontSize(10).fillColor('#CBD5E1')
     .text(`Année scolaire : ${eleve.annee_scolaire || '2025-2026'}`, 40, 70, { align: 'center' });

  doc.moveDown(3);

  // ── PHOTO + INFOS PRINCIPALES ────────────────────────────
  const photoX = 430;
  const photoY = 105;
  const photoW = 100;
  const photoH = 120;

  // Cadre photo
  doc.rect(photoX, photoY, photoW, photoH).stroke('#E5E7EB');

  // Télécharger et insérer photo
  if (eleve.photo_url) {
    const imageBuffer = await downloadImage(eleve.photo_url);
    if (imageBuffer) {
      doc.image(imageBuffer, photoX + 2, photoY + 2, {
        width: photoW - 4, height: photoH - 4, cover: [photoW - 4, photoH - 4],
      });
    }
  }

  // Texte sous photo
  doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
     .text('Photo élève', photoX, photoY + photoH + 4, {
       width: photoW, align: 'center',
     });

  // ── SECTION ÉLÈVE ────────────────────────────────────────
  const sectionX = 40;
  let   y        = 105;

  const drawSectionTitle = (title, yPos) => {
    doc.rect(sectionX, yPos, 370, 22).fill('#1A2E4A');
    doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text(title, sectionX + 8, yPos + 6);
    return yPos + 28;
  };

  const drawField = (label, value, xPos, yPos, width = 170) => {
    doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
       .text(label, xPos, yPos);
    doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold')
       .text(value || '—', xPos, yPos + 11, { width });
    return yPos + 30;
  };

  // Titre section élève
  y = drawSectionTitle('INFORMATIONS DE L\'ÉLÈVE', y);

  // Ligne 1
  drawField('Nom',      eleve.nom,    sectionX,       y);
  drawField('Prénom',   eleve.prenom, sectionX + 185, y);
  y += 30;

  // Ligne 2
  drawField('Date de naissance', formatDate(eleve.date_naissance), sectionX,       y);
  drawField('Lieu de naissance', eleve.lieu_naissance,             sectionX + 185, y);
  y += 30;

  // Ligne 3
  drawField('Téléphone', eleve.telephone, sectionX,       y);
  drawField('WhatsApp',  eleve.whatsapp,  sectionX + 185, y);
  y += 30;

  // Ligne 4
  drawField('Établissement d\'origine', eleve.etablissement_origine, sectionX, y, 370);
  y += 30;

  // Ligne 5
  drawField('Quartier', eleve.quartier,   sectionX,       y);
  drawField('Classe',   eleve.classe_nom, sectionX + 185, y);
  y += 30;

  if (eleve.email) {
    drawField('Email', eleve.email, sectionX, y, 370);
    y += 30;
  }

  y += 5;

  // ── SECTION PARENT ───────────────────────────────────────
  y = drawSectionTitle('INFORMATIONS DU PARENT / RESPONSABLE', y);

  drawField('Nom du parent',    eleve.parent_nom,       sectionX,       y);
  drawField('Téléphone',        eleve.parent_telephone, sectionX + 185, y);
  y += 30;

  drawField('WhatsApp',         eleve.parent_whatsapp,  sectionX,       y);
  drawField('Email',            eleve.parent_email,     sectionX + 185, y);
  y += 30;

  drawField('Quartier',         eleve.parent_quartier,  sectionX,       y);
  drawField('Ville',            eleve.parent_ville,     sectionX + 185, y);
  y += 35;

  // ── SECTION TUTEUR (si applicable) ───────────────────────
  if (eleve.tuteur_nom) {
    y = drawSectionTitle('INFORMATIONS DU TUTEUR', y);

    drawField('Nom du tuteur', eleve.tuteur_nom,       sectionX,       y);
    drawField('Téléphone',     eleve.tuteur_telephone, sectionX + 185, y);
    y += 30;

    drawField('WhatsApp', eleve.tuteur_whatsapp, sectionX,       y);
    drawField('Adresse',  eleve.tuteur_adresse,  sectionX + 185, y);
    y += 35;
  }

  // ── STATUT PAIEMENT ──────────────────────────────────────
  const paiementColor = {
    paye       : '#16A34A',
    en_attente : '#D97706',
    partiel    : '#2563EB',
  };

  const pColor = paiementColor[eleve.statut_paiement] || '#6B7280';

  doc.rect(sectionX, y, W, 28).fill('#F9FAFB').stroke('#E5E7EB');
  doc.fontSize(9).fillColor('#374151').font('Helvetica')
     .text('Statut paiement :', sectionX + 8, y + 9);
  doc.fontSize(10).fillColor(pColor).font('Helvetica-Bold')
     .text((eleve.statut_paiement || '').toUpperCase().replace('_', ' '),
           sectionX + 120, y + 8);

  y += 40;

  // ── ZONE SIGNATURE ────────────────────────────────────────
  doc.rect(sectionX, y, 160, 50).stroke('#E5E7EB');
  doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
     .text('Signature administrateur', sectionX + 10, y + 36);

  doc.rect(sectionX + 200, y, 160, 50).stroke('#E5E7EB');
  doc.fontSize(8).fillColor('#6B7280').font('Helvetica')
     .text('Date d\'inscription', sectionX + 210, y + 6)
     .fontSize(10).fillColor('#111827').font('Helvetica-Bold')
     .text(formatDate(eleve.created_at), sectionX + 210, y + 20);

  // ── PIED DE PAGE ──────────────────────────────────────────
  doc.rect(0, 780, 595, 60).fill('#1A2E4A');
  doc.fontSize(8).fillColor('#94A3B8').font('Helvetica')
     .text(
       `Document généré par le système LPR — ${new Date().toLocaleDateString('fr-FR')}`,
       40, 800, { align: 'center', width: W }
     );

  doc.end();
};

module.exports = { generateFicheEleve };