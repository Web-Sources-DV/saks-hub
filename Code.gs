const LEGACY_HEADERS = ['SKU', 'EAN', 'Producto', 'Marca', 'Categoria', 'Precio USD', 'Foto', 'Descripcion', 'Potencia', 'Voltaje', 'Capacidad', 'Material', 'Stock', 'Proveedor'];
const PREVIOUS_HEADERS = [...LEGACY_HEADERS, 'Beneficios', 'Colores', 'Tamaños', 'Modo de uso'];
const HEADERS = [...PREVIOUS_HEADERS, 'Velocidad', 'Contenido del empaque', 'Estado'];
const ALLOWED_EMAILS = ['pivega_75@hotmail.com', 'pgarcia@saks.com.pa'];
const ADMIN_EMAIL = 'pgarcia@saks.com.pa';
const INITIAL_PRODUCTS = [
  ['SAKS-001', '6224001234567', 'Freidora Ninja AF101', 'Ninja', 'Electrodomesticos', 89.99, '', '', '', '', '', '', 0, '', '', '', '', '', '', '', 'En catálogo'],
  ['SAKS-002', '7501234890123', 'Freidora Oster 4.6L', 'Oster', 'Electrodomesticos', 74.99, '', '', '', '', '', '', 0, '', '', '', '', '', '', '', 'En catálogo'],
  ['SAKS-003', '6224009876543', 'Licuadora Ninja BL610', 'Ninja', 'Electrodomesticos', 99.99, '', '', '', '', '', '', 0, '', '', '', '', '', '', '', 'En catálogo'],
  ['SAKS-004', '7501234654321', 'Licuadora Oster 2 Vel.', 'Oster', 'Electrodomesticos', 49.99, '', '', '', '', '', '', 0, '', '', '', '', '', '', '', 'En catálogo'],
  ['SAKS-005', '7593000111222', 'Bolsas de Regalo', 'SAKS', 'Hogar', 2.00, '', '', '', '', '', '', 0, '', '', '', '', '', '', '', 'En catálogo'],
];

function doGet() {
  const email = getUserEmail_();
  if (!ALLOWED_EMAILS.includes(email)) {
    return HtmlService.createHtmlOutput('<main style="font:18px Arial;padding:3rem"><h1>Acceso privado</h1><p>Tu cuenta de Google no está autorizada para SAKS HUB.</p></main>')
      .setTitle('SAKS HUB · Acceso privado');
  }
  ensureSheet_();
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('SAKS HUB · Inventario')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function setup() {
  assertAuthorized_();
  ensureSheet_();
  return 'SAKS HUB - Base lista.';
}

function getUserEmail_() {
  return (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function assertAuthorized_() {
  const email = getUserEmail_();
  if (!ALLOWED_EMAILS.includes(email)) throw new Error('No tienes permiso para usar SAKS HUB.');
  return email;
}

function ensureSheet_() {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SAKS HUB - Base');
  if (!sheet) sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('SAKS HUB - Base');
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else {
    const existing = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const baseMatches = LEGACY_HEADERS.every((header, index) => existing[index] === header);
    const previousMatches = PREVIOUS_HEADERS.every((header, index) => existing[index] === header);
    const currentMatches = HEADERS.every((header, index) => existing[index] === header);
    if (!currentMatches && (baseMatches || previousMatches)) {
      const priorLength = previousMatches ? PREVIOUS_HEADERS.length : LEGACY_HEADERS.length;
      sheet.getRange(1, priorLength + 1, 1, HEADERS.length - priorLength)
        .setValues([HEADERS.slice(priorLength)]);
    } else if (!currentMatches) {
      throw new Error('La pestaña SAKS HUB - Base tiene encabezados diferentes. No se modificó.');
    }
  }
  if (sheet.getLastRow() === 1) {
    sheet.getRange(2, 1, INITIAL_PRODUCTS.length, HEADERS.length).setValues(INITIAL_PRODUCTS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0B3D91').setFontColor('#FFFFFF');
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  syncSourceProducts_(sheet);
  return sheet;
}

function syncSourceProducts_(sheet) {
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  const knownSkus = new Set(rows.map(row => String(row[0])));
  const missing = SOURCE_PRODUCTS.filter(row => !knownSkus.has(String(row[0])));
  if (missing.length) sheet.getRange(sheet.getLastRow() + 1, 1, missing.length, HEADERS.length).setValues(missing);
}

function getProducts() {
  assertAuthorized_();
  const sheet = ensureSheet_();
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues().map(rowToProduct_);
}

function getSessionInfo() {
  const email = assertAuthorized_();
  return {email, role: email === ADMIN_EMAIL ? 'Administrador' : 'Propietario', logoData: `data:image/jpeg;base64,${SAKS_LOGO_BASE64}`};
}

function rowToProduct_(row) {
  return Object.fromEntries(HEADERS.map((key, index) => [key, row[index] instanceof Date ? row[index].toISOString() : row[index]]));
}

function saveProduct(input) {
  const email = assertAuthorized_();
  const ean = String(input.EAN || '').replace(/\D/g, '');
  const name = String(input.Producto || '').trim();
  if (!name) throw new Error('El nombre del producto es obligatorio.');
  const sheet = ensureSheet_();
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues() : [];
  const match = input.SKU ? rows.findIndex(row => String(row[0]) === String(input.SKU)) : -1;
  if (!/^\d{8,14}$/.test(ean) && !(match >= 0 && !ean)) throw new Error('El EAN debe tener entre 8 y 14 dígitos.');
  if (ean && rows.some((row, index) => index !== match && String(row[1]) === ean)) throw new Error('Ese EAN ya está asignado a otro producto.');
  const sku = match >= 0 ? rows[match][0] : nextSku_(rows);
  let photoId = match >= 0 ? rows[match][6] : '';
  if (input.fotoData) photoId = savePhoto_(input.fotoData, ean || sku, photoId);
  const values = [sku, ean, name, String(input.Marca || ''), String(input.Categoria || ''), Number(input['Precio USD'] || 0), photoId, String(input.Descripcion || ''), String(input.Potencia || ''), String(input.Voltaje || ''), String(input.Capacidad || ''), String(input.Material || ''), Math.max(0, Number(input.Stock || 0)), String(input.Proveedor || ''), String(input.Beneficios || ''), String(input.Colores || ''), String(input['Tamaños'] || ''), String(input['Modo de uso'] || ''), String(input.Velocidad || ''), String(input['Contenido del empaque'] || ''), match >= 0 ? (rows[match][20] || 'En catálogo') : 'Producto nuevo'];
  if (match >= 0) sheet.getRange(match + 2, 1, 1, HEADERS.length).setValues([values]);
  else sheet.appendRow(values);
  return {product: rowToProduct_(values), role: email === ADMIN_EMAIL ? 'admin' : 'owner'};
}

function nextSku_(rows) {
  const highest = rows.reduce((max, row) => Math.max(max, Number(String(row[0]).match(/^SAKS-(\d{3})$/)?.[1] || 0)), 0);
  return `SAKS-${String(highest + 1).padStart(3, '0')}`;
}

function savePhoto_(dataUrl, ean, previousId) {
  const match = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
  if (!match) throw new Error('La foto debe estar en formato JPG, PNG o WebP.');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > 5 * 1024 * 1024) throw new Error('La foto debe pesar menos de 5 MB.');
  const folder = getPhotoFolder_();
  const blob = Utilities.newBlob(bytes, match[1], `${ean}.${match[1].split('/')[1]}`);
  if (previousId) {
    try { DriveApp.getFileById(previousId).setTrashed(true); } catch (error) {}
  }
  return folder.createFile(blob).getId();
}

function getPhotoFolder_() {
  const files = DriveApp.getFoldersByName('SAKS HUB Fotos');
  return files.hasNext() ? files.next() : DriveApp.createFolder('SAKS HUB Fotos');
}

function photoData(photoId) {
  assertAuthorized_();
  if (!photoId) return '';
  const blob = DriveApp.getFileById(photoId).getBlob();
  return `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
}

function productPdfBase64(ean) {
  assertAuthorized_();
  const product = findProduct_(ean);
  const blob = buildProductPdf_(product);
  return {name: `SAKS-${product.EAN || product.SKU}.pdf`, base64: Utilities.base64Encode(blob.getBytes()), mimeType: 'application/pdf'};
}

function allPdfsZipBase64() {
  assertAuthorized_();
  const files = getProducts().map(product => buildProductPdf_(product).setName(`SAKS-${product.EAN || product.SKU}.pdf`));
  const zip = Utilities.zip(files, 'SAKS HUB - Fichas de Productos.zip');
  return {name: 'SAKS-HUB-Fichas.zip', base64: Utilities.base64Encode(zip.getBytes()), mimeType: 'application/zip'};
}

function buildProductPdf_(product) {
  const doc = DocumentApp.create(`Ficha ${product.SKU}`);
  const body = doc.getBody();
  body.setPageWidth(792).setPageHeight(612).setMarginTop(22).setMarginBottom(22).setMarginLeft(26).setMarginRight(26);
  const header = body.appendTable([['', '']]);
  header.setBorderWidth(0);
  const logoCell = header.getCell(0, 0);
  const logoParagraph = logoCell.getChild(0).asParagraph();
  logoParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  const logoImage = logoParagraph.appendInlineImage(Utilities.newBlob(Utilities.base64Decode(SAKS_LOGO_BASE64), 'image/jpeg', 'saks-logo.jpg'));
  logoImage.setWidth(76).setHeight(76);
  logoCell.setWidth(105).setBackgroundColor('#0B3D91');
  const titleCell = header.getCell(0, 1);
  titleCell.setWidth(635).setBackgroundColor('#0B3D91').setPaddingRight(16);
  const title = titleCell.getChild(0).asParagraph();
  title.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  title.editAsText().setText(`${product.Estado === 'Producto nuevo' ? 'PRODUCTO NUEVO  ·  ' : ''}FICHA TÉCNICA  ·  ${String(product.Categoria || 'PRODUCTO').toUpperCase()}`)
    .setForegroundColor('#FFFFFF').setBold(true).setFontSize(14);

  const layout = body.appendTable([['', '']]);
  layout.setBorderWidth(0);
  const photoCell = layout.getCell(0, 0);
  photoCell.setWidth(252).setBackgroundColor('#F3F6FB').setPaddingTop(10).setPaddingBottom(10).setPaddingLeft(10).setPaddingRight(10);
  const photoParagraph = photoCell.getChild(0).asParagraph();
  photoParagraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  if (product.Foto) {
    try {
      const image = photoParagraph.appendInlineImage(DriveApp.getFileById(product.Foto).getBlob());
      const scale = Math.min(220 / image.getWidth(), 265 / image.getHeight(), 1);
      image.setWidth(image.getWidth() * scale).setHeight(image.getHeight() * scale);
    } catch (error) {
      photoParagraph.appendText('Foto no disponible');
    }
  } else {
    photoParagraph.appendText('Foto pendiente').setForegroundColor('#66758B');
  }
  const model = photoCell.appendParagraph(`MODELO: ${product.Producto || product.SKU}`);
  model.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setBold(true).setForegroundColor('#0B3D91').setFontSize(11);
  photoCell.appendParagraph(`SKU: ${product.SKU}  ·  EAN: ${product.EAN || 'Pendiente'}`).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setFontSize(8);

  const infoCell = layout.getCell(0, 1);
  infoCell.setWidth(488).setPaddingLeft(12).setPaddingRight(8);
  const name = infoCell.appendParagraph(product.Producto || 'Producto');
  name.setHeading(DocumentApp.ParagraphHeading.HEADING1).setForegroundColor('#0B3D91');
  const price = infoCell.appendParagraph(`PRECIO  $${Number(product['Precio USD'] || 0).toFixed(2)} USD`);
  price.setBold(true).setForegroundColor('#0B3D91').setFontSize(13);
  const specifications = [['CARACTERÍSTICA', 'DETALLE']];
  const rows = [
    ['Marca', product.Marca], ['Potencia', product.Potencia], ['Velocidad', product.Velocidad],
    ['Voltaje', product.Voltaje], ['Capacidad', product.Capacidad], ['Colores', product.Colores],
    ['Tamaños', product['Tamaños']], ['Material', product.Material], ['Stock', product.Stock],
  ];
  rows.forEach(([label, value]) => { if (value !== '' && value !== null && value !== undefined) specifications.push([label, String(value)]); });
  const specs = infoCell.appendTable(specifications);
  specs.setBorderColor('#AAB8CC').setBorderWidth(0.5);
  specs.setColumnWidth(0, 132).setColumnWidth(1, 340);
  for (let i = 0; i < specs.getNumRows(); i++) {
    const row = specs.getRow(i);
    for (let j = 0; j < row.getNumCells(); j++) row.getCell(j).setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(5).setPaddingRight(5).editAsText().setFontSize(8);
    if (i === 0) {
      row.getCell(0).setBackgroundColor('#0B3D91').editAsText().setForegroundColor('#FFFFFF').setBold(true);
      row.getCell(1).setBackgroundColor('#0B3D91').editAsText().setForegroundColor('#FFFFFF').setBold(true);
    } else {
      row.getCell(0).setBackgroundColor('#EAF1FB').editAsText().setBold(true);
    }
  }
  appendPdfSection_(infoCell, 'DESCRIPCIÓN', product.Descripcion);
  appendPdfSection_(infoCell, 'BENEFICIOS', product.Beneficios);
  appendPdfSection_(infoCell, 'CONTENIDO DEL EMPAQUE', product['Contenido del empaque']);
  appendPdfSection_(infoCell, 'USO Y CUIDADOS', product['Modo de uso']);
  body.appendParagraph('SAKS · Panamá').setForegroundColor('#0B3D91').setFontSize(8);
  doc.saveAndClose();
  const pdf = DriveApp.getFileById(doc.getId()).getAs(MimeType.PDF).setName(`SAKS-${product.EAN || product.SKU}.pdf`);
  DriveApp.getFileById(doc.getId()).setTrashed(true);
  return pdf;
}

function appendPdfSection_(cell, heading, value) {
  const title = cell.appendParagraph(heading);
  title.setForegroundColor('#0B3D91').setBold(true).setFontSize(9);
  const text = String(value || 'Pendiente de completar').trim();
  text.split(/\n+/).filter(Boolean).forEach(line => cell.appendParagraph(line).setFontSize(8));
}

function findProduct_(ean) {
  const key = String(ean);
  const product = getProducts().find(item => String(item.SKU) === key || (item.EAN && String(item.EAN) === key));
  if (!product) throw new Error('Producto no encontrado.');
  return product;
}

function inventoryXlsxBase64() {
  assertAuthorized_();
  const source = SpreadsheetApp.getActiveSpreadsheet();
  const temp = SpreadsheetApp.create('SAKS HUB - Inventario temporal');
  const sheet = temp.getSheets()[0];
  sheet.setName('Inventario');
  const values = source.getSheetByName('SAKS HUB - Base').getDataRange().getValues();
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  const response = UrlFetchApp.fetch(`https://www.googleapis.com/drive/v3/files/${temp.getId()}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`, {
    headers: {Authorization: `Bearer ${ScriptApp.getOAuthToken()}`}, muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    DriveApp.getFileById(temp.getId()).setTrashed(true);
    throw new Error('Google Sheets no pudo crear el archivo Excel.');
  }
  const blob = response.getBlob().setName('SAKS-HUB-Inventario.xlsx');
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return {name: blob.getName(), base64: Utilities.base64Encode(blob.getBytes()), mimeType: blob.getContentType()};
}
