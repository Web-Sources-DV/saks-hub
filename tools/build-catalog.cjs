const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const headers = ['SKU', 'EAN', 'Producto', 'Marca', 'Categoria', 'Precio USD', 'Foto', 'Descripcion', 'Potencia', 'Voltaje', 'Capacidad', 'Material', 'Stock', 'Proveedor', 'Beneficios', 'Colores', 'Tamaños', 'Modo de uso', 'Velocidad', 'Contenido del empaque', 'Estado'];
const sourceText = fs.readFileSync(path.join(root, 'SourceProducts.gs'), 'utf8');
const sourceProducts = vm.runInNewContext(`${sourceText}\nSOURCE_PRODUCTS`);
const seedProducts = [
  ['SAKS-001', '6224001234567', 'Freidora Ninja AF101', 'Ninja', 'Electrodomesticos', 89.99],
  ['SAKS-002', '7501234890123', 'Freidora Oster 4.6L', 'Oster', 'Electrodomesticos', 74.99],
  ['SAKS-003', '6224009876543', 'Licuadora Ninja BL610', 'Ninja', 'Electrodomesticos', 99.99],
  ['SAKS-004', '7501234654321', 'Licuadora Oster 2 Vel.', 'Oster', 'Electrodomesticos', 49.99],
  ['SAKS-005', '7593000111222', 'Bolsas de Regalo', 'SAKS', 'Hogar', 2.00],
].map(row => [...row, '', '', '', '', '', '', 0, '', '', '', '', '', '', '', '', 'En catálogo']);

function toProduct(row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
}

const products = [...seedProducts, ...sourceProducts].map(toProduct);
fs.writeFileSync(path.join(root, 'products.json'), `${JSON.stringify(products)}\n`);

const logoSource = fs.readFileSync(path.join(root, 'Logo.gs'), 'utf8');
const logo = logoSource.match(/const SAKS_LOGO_BASE64 = '([^']+)'/);
if (!logo) throw new Error('No se encontró el logo SAKS en Logo.gs');
const assets = path.join(root, 'assets');
fs.mkdirSync(assets, { recursive: true });
fs.writeFileSync(path.join(assets, 'saks-logo.txt'), logo[1]);

console.log(`Catálogo generado: ${products.length} productos (${sourceProducts.length} del inventario + ${seedProducts.length} iniciales).`);

