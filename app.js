const STORAGE_KEY = 'saks-hub-inventory-v1';
const FIELDS = ['SKU','EAN','Producto','Marca','Categoria','Precio USD','Foto','Descripcion','Potencia','Voltaje','Capacidad','Material','Stock','Proveedor','Beneficios','Colores','Tamaños','Modo de uso','Velocidad','Contenido del empaque','Estado'];
const $ = id => document.getElementById(id);
let products = [];
let editing = false;
let stream = null;
let scanTimer = null;
let toastTimer = null;
let logoData = '';

function safe(value='') { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(value) { return '$' + Number(value || 0).toFixed(2) + ' USD'; }
function tell(message) { $('message').textContent = message; }
function toast(message) { const box = $('toast'); box.textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => box.textContent = '', 3600); }
function setSaved(message='Guardado en este dispositivo') { $('save-state').textContent = message; }
function saveLocal() { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); setSaved(); renderInventory(); }
function bySKU(sku) { return products.find(p => String(p.SKU) === String(sku)); }
function readProducts() {
  let local;
  try { local = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { local = null; }
  if (Array.isArray(local)) return local;
  return fetch('./products.json', {cache:'no-store'}).then(r => { if (!r.ok) throw new Error('No se pudo cargar products.json'); return r.json(); }).then(seed => { products = seed; saveLocal(); return products; });
}

function renderInventory(filter='') {
  const query = filter.trim().toLocaleLowerCase('es');
  const shown = products.filter(p => !query || [p.SKU,p.EAN,p.Producto,p.Marca,p.Categoria].some(v => String(v||'').toLocaleLowerCase('es').includes(query)));
  $('product-count').textContent = `${shown.length} de ${products.length}`;
  $('inventory-body').innerHTML = shown.map(p => `<tr data-sku="${safe(p.SKU)}"><td>${safe(p.SKU)}</td><td>${safe(p.EAN || '—')}</td><td>${safe(p.Producto)}</td><td>${safe(p.Marca || '—')}</td><td>${money(p['Precio USD'])}</td><td>${safe(p.Stock || 0)}</td></tr>`).join('') || '<tr><td colspan="6">No hay productos para mostrar.</td></tr>';
}

function findProduct() {
  const raw = $('search-input').value.trim();
  const digits = raw.replace(/\D/g, '');
  const found = products.find(p => p.EAN && String(p.EAN).replace(/\D/g,'') === digits) || products.find(p => String(p.SKU).toLowerCase() === raw.toLowerCase()) || products.find(p => String(p.Producto || '').toLowerCase().includes(raw.toLowerCase()));
  if (found) { closeForm(); showProduct(found); tell('Producto encontrado.'); return; }
  if (/^\d{8,14}$/.test(digits)) { $('search-input').value = digits; openNew(digits); tell('Producto no encontrado. Completa sus datos para agregarlo.'); }
  else { $('product-panel').classList.add('hidden'); tell(raw ? 'No se encontró el producto. Busca por EAN, SKU o nombre.' : 'Escribe un código o nombre para buscar.'); }
}

function showProduct(p) {
  const photo = p.Foto ? `<img class="product-image" src="${safe(p.Foto)}" alt="${safe(p.Producto)}">` : '<div class="placeholder">Agrega una foto del producto desde Editar</div>';
  const specs = [['Categoría',p.Categoria],['Marca',p.Marca],['Capacidad',p.Capacidad],['Potencia',p.Potencia],['Voltaje',p.Voltaje],['Velocidad',p.Velocidad],['Material',p.Material],['Colores',p.Colores],['Tamaños',p['Tamaños']],['Proveedor',p.Proveedor],['Stock',p.Stock]];
  const details = [['Descripción',p.Descripcion],['Beneficios',p.Beneficios],['Modo de uso',p['Modo de uso']],['Contenido del empaque',p['Contenido del empaque']]];
  $('product-panel').innerHTML = `<div class="product-top"><div>${photo}</div><div><div class="sku-line"><span class="pill">SKU ${safe(p.SKU)}</span><span class="pill">EAN ${safe(p.EAN || 'Pendiente')}</span></div><h2 class="product-title">${safe(p.Producto || 'Producto sin nombre')}</h2><div class="price">${money(p['Precio USD'])}</div><div class="stock">Stock disponible: <b>${safe(p.Stock || 0)}</b></div><div class="toolbar actions"><button class="button" data-action="pdf" data-sku="${safe(p.SKU)}">Descargar ficha PDF</button><button class="button button-outline" data-action="edit" data-sku="${safe(p.SKU)}">Editar ficha</button></div></div></div><div class="specs">${specs.map(([label,value])=>`<div class="spec"><b>${safe(label)}</b>${safe(value || '—')}</div>`).join('')}</div>${details.map(([label,value])=>`<div class="detail-block"><b>${safe(label)}</b>${safe(value || 'Pendiente de completar')}</div>`).join('')}`;
  $('product-panel').classList.remove('hidden'); $('product-panel').scrollIntoView({behavior:'smooth',block:'start'});
}

function openNew(ean='') {
  editing = false; $('product-form').reset(); $('form-heading').textContent = 'Producto nuevo'; $('field-SKU').value = ''; $('field-EAN').value = ean; $('field-Stock').value = '0'; $('form-panel').classList.remove('hidden'); $('product-panel').classList.add('hidden'); $('form-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function openEdit(sku) {
  const p = bySKU(sku); if (!p) return;
  editing = true; $('product-form').reset(); $('form-heading').textContent = `Editar producto · ${p.SKU}`;
  const ids = {'Precio USD':'Precio','Modo de uso':'Modo','Contenido del empaque':'Empaque'};
  FIELDS.forEach(key => { const field = $('field-' + (ids[key] || key)); if (field && field.type !== 'file') field.value = p[key] ?? ''; });
  $('form-panel').classList.remove('hidden'); $('product-panel').classList.add('hidden'); $('form-panel').scrollIntoView({behavior:'smooth',block:'start'});
}
function closeForm() { $('form-panel').classList.add('hidden'); }

function nextSKU() {
  const next = products.reduce((max,p) => Math.max(max, Number(String(p.SKU||'').match(/^SAKS-(\d+)$/)?.[1] || 0)), 0) + 1;
  return `SAKS-${String(next).padStart(3,'0')}`;
}
function compressImage(file) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader(); reader.onerror = reject;
    reader.onload = () => { const img = new Image(); img.onerror = reject; img.onload = () => { const scale = Math.min(1, 1200 / Math.max(img.width,img.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale); canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/jpeg',0.78)); }; img.src = reader.result; };
    reader.readAsDataURL(file);
  });
}

async function saveProduct(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData($('product-form')).entries());
  data['Precio USD'] = Number(data['Precio USD'] || 0); data.Stock = Math.max(0, Number(data.Stock || 0));
  const file = $('field-Foto').files[0];
  if (file) { try { data.Foto = await compressImage(file); } catch { toast('No se pudo procesar la foto.'); return; } }
  else if (editing) data.Foto = bySKU(data.SKU)?.Foto || '';
  else data.Foto = '';
  if (!editing) { data.SKU = nextSKU(); data.Estado = 'Producto nuevo'; products.push(data); }
  else { const index = products.findIndex(p => String(p.SKU) === String(data.SKU)); data.Estado = products[index]?.Estado || 'En catálogo'; products[index] = {...products[index], ...data}; }
  try { saveLocal(); closeForm(); showProduct(bySKU(data.SKU)); tell(`Ficha ${data.SKU} guardada en este dispositivo.`); toast('Producto guardado.'); await downloadPDF(data.SKU); }
  catch (error) { toast('No se pudo guardar en este dispositivo. Exporta un respaldo y libera espacio.'); }
}

function csvCell(value) { return `"${String(value ?? '').replace(/"/g,'""')}"`; }
function exportCSV() {
  const csv = '\uFEFFsep=;\r\n' + [FIELDS.map(csvCell).join(';'), ...products.map(p => FIELDS.map(key => csvCell(p[key])).join(';'))].join('\r\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'SAKS-HUB-inventario.csv');
}
function backupJSON() { downloadBlob(new Blob([JSON.stringify(products,null,2)],{type:'application/json'}),'SAKS-HUB-respaldo.json'); }
async function restoreJSON(file) {
  try {
    const rows = JSON.parse(await file.text());
    if (!Array.isArray(rows) || rows.some(p => !p || !p.SKU || !p.Producto)) throw new Error('Formato inválido');
    if (!confirm(`Se reemplazará el inventario guardado en este navegador por ${rows.length} productos. ¿Continuar?`)) return;
    products = rows; saveLocal(); $('product-panel').classList.add('hidden'); tell('Respaldo importado correctamente.'); toast('Inventario actualizado en este dispositivo.');
  } catch { toast('No se pudo importar. Selecciona un respaldo JSON válido de SAKS HUB.'); }
}
function downloadBlob(blob,name) { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1500); }

function pdfName(p) { return `${String(p.SKU||'SAKS').replace(/[^a-z0-9_-]/gi,'_')}-${String(p.Producto||'producto').replace(/[^a-z0-9_-]/gi,'_').slice(0,50)}.pdf`; }
function makePDF(p) {
  if (!window.jspdf?.jsPDF) throw new Error('No cargó el generador PDF. Revisa la conexión a internet e inténtalo de nuevo.');
  const doc = new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  const w=297,h=210,blue='#0B3D91',margin=13;
  doc.setFillColor(11,61,145); doc.rect(0,0,w,28,'F'); doc.addImage(logoData,'JPEG',margin,4,20,20); doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('SAKS · FICHA TÉCNICA',39,12); doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text(String(p.Categoria||'INVENTARIO').toUpperCase(),39,20);
  let y=38; doc.setTextColor(26,39,58); doc.setFont('helvetica','bold'); doc.setFontSize(19); const title=doc.splitTextToSize(String(p.Producto||'Producto'),150); doc.text(title,margin,y); y+=title.length*8;
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.text(`SKU: ${p.SKU||'—'}    EAN: ${p.EAN||'Pendiente'}`,margin,y+2); doc.setTextColor(11,61,145); doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text(money(p['Precio USD']),margin,y+13);
  doc.setTextColor(30,43,60); doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.text(`Stock: ${p.Stock||0}    Marca: ${p.Marca||'—'}`,margin,y+21);
  if (p.Foto) { try { doc.addImage(p.Foto,'JPEG',margin,75,82,75,undefined,'FAST'); } catch {} }
  let sy=78; const specs=[['Potencia',p.Potencia],['Voltaje',p.Voltaje],['Capacidad',p.Capacidad],['Velocidad',p.Velocidad],['Material',p.Material],['Colores',p.Colores],['Tamaños',p['Tamaños']],['Categoría',p.Categoria]];
  doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(11,61,145); doc.text('ESPECIFICACIONES',108,sy-5);
  specs.filter(([,v])=>v).forEach(([label,value],i)=>{ const x=108+(i%2)*83, yy=sy+Math.floor(i/2)*15; doc.setDrawColor(219,228,240); doc.line(x,yy+4,x+78,yy+4); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(90,105,125); doc.text(label.toUpperCase(),x,yy); doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(28,40,58); doc.text(doc.splitTextToSize(String(value),75).slice(0,1),x,yy+4); });
  let blockY=156; const blocks=[['DESCRIPCIÓN',p.Descripcion],['BENEFICIOS',p.Beneficios],['MODO DE USO',p['Modo de uso']],['CONTENIDO DEL EMPAQUE',p['Contenido del empaque']]].filter(([,v])=>v);
  blocks.forEach(([heading,value])=>{ if(blockY>193){doc.addPage();blockY=18;} doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(11,61,145);doc.text(heading,margin,blockY);blockY+=5;doc.setFont('helvetica','normal');doc.setTextColor(38,50,68);const lines=doc.splitTextToSize(String(value),w-margin*2);const shown=lines.slice(0,Math.max(1,Math.floor((198-blockY)/4)));doc.text(shown,margin,blockY);blockY+=shown.length*4+7;});
  doc.setFontSize(7);doc.setTextColor(100,110,125);doc.text('SAKS · Panamá · Precios en USD',margin,h-6);
  return doc;
}
async function getLogo() { if(logoData)return logoData; const response=await fetch('./assets/saks-logo.txt'); if(!response.ok)throw new Error('No se pudo cargar el logo SAKS.'); logoData=`data:image/jpeg;base64,${(await response.text()).trim()}`; $('saks-logo').src=logoData; return logoData; }
async function downloadPDF(sku) { try { await getLogo(); const p=bySKU(sku); if(!p)return; makePDF(p).save(pdfName(p)); tell('Ficha PDF lista para compartir o imprimir.'); } catch(error) { toast(error.message||'No se pudo generar el PDF.'); } }
async function downloadZIP() {
  if(!window.JSZip||!window.jspdf?.jsPDF){toast('No cargaron las herramientas PDF/ZIP. Revisa la conexión a internet.');return;}
  const button=$('zip-button');button.disabled=true;button.textContent='Preparando fichas…';
  try { await getLogo(); const zip=new JSZip(); for(let i=0;i<products.length;i++){zip.file(pdfName(products[i]),makePDF(products[i]).output('blob'));if(i%10===0)button.textContent=`Preparando ${i+1}/${products.length}…`;} const blob=await zip.generateAsync({type:'blob'});downloadBlob(blob,'SAKS-HUB-fichas.zip');tell(`${products.length} fichas agregadas al ZIP.`); }
  catch(error){toast(error.message||'No se pudo crear el ZIP.');}
  finally{button.disabled=false;button.textContent='Descargar fichas ZIP';}
}

async function startScan() {
  if(!navigator.mediaDevices?.getUserMedia||!('BarcodeDetector'in window)){toast('Este navegador no admite escaneo en vivo. Escribe el EAN o usa un lector de códigos.');return;}
  try { const detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e']});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});$('camera').srcObject=stream;$('scanner').classList.remove('hidden');await $('camera').play();scanTimer=setInterval(async()=>{if(!stream)return;try{const codes=await detector.detect($('camera'));if(codes.length){$('search-input').value=codes[0].rawValue;stopScan();findProduct();}}catch{}},350); }
  catch { stopScan();toast('No se pudo abrir la cámara. Permite el acceso a la cámara en el navegador.'); }
}
function stopScan(){if(scanTimer)clearInterval(scanTimer);scanTimer=null;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$('scanner').classList.add('hidden');}

$('search-button').addEventListener('click',findProduct);
$('search-input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findProduct();}});
$('new-button').addEventListener('click',()=>openNew($('search-input').value.trim()));
$('scan-button').addEventListener('click',startScan);$('stop-scan').addEventListener('click',stopScan);
$('cancel-form').addEventListener('click',closeForm);$('cancel-form-bottom').addEventListener('click',closeForm);
$('product-form').addEventListener('submit',saveProduct);
$('inventory-filter').addEventListener('input',event=>renderInventory(event.target.value));
$('csv-button').addEventListener('click',exportCSV);$('backup-button').addEventListener('click',backupJSON);
$('restore-button').addEventListener('click',()=>$('restore-file').click());
$('restore-file').addEventListener('change',event=>{const file=event.target.files[0];if(file)restoreJSON(file);event.target.value='';});
$('zip-button').addEventListener('click',downloadZIP);
$('inventory-body').addEventListener('click',event=>{const row=event.target.closest('tr[data-sku]');if(row){showProduct(bySKU(row.dataset.sku));tell('Producto seleccionado del inventario.');}});
$('product-panel').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button)return;if(button.dataset.action==='edit')openEdit(button.dataset.sku);if(button.dataset.action==='pdf')downloadPDF(button.dataset.sku);});

let installPrompt;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install-button').hidden=false;});
$('install-button').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install-button').hidden=true;}else toast('Usa “Añadir a pantalla de inicio” desde el menú del navegador.');});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

(async()=>{try{await getLogo();const result=await readProducts();if(Array.isArray(result))products=result;renderInventory();setSaved();}catch(error){setSaved('Error al cargar');tell('No se pudo cargar el inventario inicial. Recarga esta página.');console.error(error);}})();

