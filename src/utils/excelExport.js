const ExcelJS = require('exceljs');

const generateExcelEleves = async (eleves, annee, res) => {
  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Élèves');

  // ── Métadonnées ───────────────────────────────────────
  workbook.creator  = 'Système LPR';
  workbook.created  = new Date();

  // ── En-tête principal ─────────────────────────────────
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value         = 'LA PORTE DE LA RÉUSSITE';
  worksheet.getCell('A1').font          = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A1').fill          = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A2E4A' } };
  worksheet.getCell('A1').alignment     = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height            = 35;

  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value         = `Liste des élèves — Année scolaire ${annee}`;
  worksheet.getCell('A2').font          = { bold: true, size: 12, color: { argb: 'FF1A2E4A' } };
  worksheet.getCell('A2').fill          = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F1FB' } };
  worksheet.getCell('A2').alignment     = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height            = 25;

  worksheet.mergeCells('A3:H3');
  worksheet.getCell('A3').value         = `Généré le ${new Date().toLocaleDateString('fr-FR')} — Total : ${eleves.length} élève(s)`;
  worksheet.getCell('A3').font          = { size: 10, color: { argb: 'FF6B7280' } };
  worksheet.getCell('A3').alignment     = { horizontal: 'center' };
  worksheet.getRow(3).height            = 20;

  // ── Ligne vide ────────────────────────────────────────
  worksheet.addRow([]);

  // ── En-têtes colonnes ─────────────────────────────────
  const headers = [
    { header: 'N°',               key: 'num',               width: 5  },
    { header: 'Nom & Prénom',     key: 'nom_complet',       width: 25 },
    { header: 'Classe',           key: 'classe',            width: 15 },
    { header: 'Établissement',    key: 'etablissement',     width: 28 },
    { header: 'Téléphone élève',  key: 'telephone',         width: 18 },
    { header: 'Nom parent',       key: 'parent_nom',        width: 22 },
    { header: 'Tél. parent',      key: 'parent_telephone',  width: 18 },
    { header: 'Paiement',         key: 'paiement',          width: 14 },
  ];

  worksheet.columns = headers;

  // Style en-têtes
  const headerRow = worksheet.getRow(5);
  headerRow.height = 22;
  headers.forEach((_, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.font      = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border    = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });

  // ── Données ───────────────────────────────────────────
  const paiementColors = {
    paye       : 'FF16A34A',
    en_attente : 'FFD97706',
    partiel    : 'FF2563EB',
  };

  eleves.forEach((eleve, index) => {
    const row = worksheet.addRow({
      num              : index + 1,
      nom_complet      : `${eleve.nom} ${eleve.prenom}`,
      classe           : eleve.classe_nom   || '—',
      etablissement    : eleve.etablissement_origine || '—',
      telephone        : eleve.telephone    || '—',
      parent_nom       : eleve.parent_nom   || '—',
      parent_telephone : eleve.parent_telephone || '—',
      paiement         : (eleve.statut_paiement || '').toUpperCase().replace('_', ' '),
    });

    row.height = 18;

    // Alternance couleur lignes
    const bgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
    row.eachCell((cell) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { vertical: 'middle' };
      cell.border    = {
        bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'hair', color: { argb: 'FFE5E7EB' } },
      };
    });

    // Couleur paiement
    const pColor = paiementColors[eleve.statut_paiement] || 'FF6B7280';
    row.getCell('paiement').font = { bold: true, color: { argb: pColor } };
  });

  // ── Figer la ligne d'en-tête ──────────────────────────
  worksheet.views = [{ state: 'frozen', ySplit: 5 }];

  // ── Filtre automatique ────────────────────────────────
  worksheet.autoFilter = { from: 'A5', to: 'H5' };

  // ── Envoyer le fichier ────────────────────────────────
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="eleves_lpr_${annee}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { generateExcelEleves };