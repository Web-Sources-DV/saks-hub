# SAKS HUB

Aplicación web estática para buscar el inventario SAKS por EAN, SKU o nombre y generar fichas técnicas. Se publica en GitHub Pages; no usa Google Sheets ni requiere servidor.

## Publicación

El sitio se sirve desde la raíz de `main`. El archivo de entrada debe llamarse `index.html` en minúsculas. Cuando Pages termine de publicar, la app queda en:

<https://web-sources-dv.github.io/saks-hub/>

En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/ (root)`**.

## Inventario incluido

`products.json` contiene 113 productos: los cinco ejemplos SAKS y 108 registros importados del comparativo de inventarios. Los 108 registros conservan su SKU, nombre/descripcion, categoría, precio, proveedor y stock. El Excel no contiene EAN para ellos, así que se pueden buscar por SKU y completar su EAN desde la ficha. No se inventan códigos.

`tools/build-catalog.cjs` regenera `products.json` y `assets/saks-logo.jpg` a partir de `SourceProducts.gs` y `Logo.gs`.

## Funciones

- Búsqueda por EAN, SKU o nombre y escaneo de EAN con la cámara cuando el navegador lo admite.
- Alta y edición de productos, foto, stock y datos técnicos.
- Fichas PDF individuales y ZIP con todas las fichas.
- Exportación CSV compatible con Excel y respaldo/restauración JSON.
- Interfaz responsive, logo SAKS y acceso instalable como PWA.

Las librerías PDF/ZIP se descargan de cdnjs; la búsqueda y edición del inventario funcionan con los archivos del sitio y el almacenamiento del navegador.

## Importante sobre datos y privacidad

GitHub Pages sirve este catálogo públicamente. Cualquier persona puede leer los productos, proveedores y stock que están en `products.json`. Las nuevas altas, cambios y fotos se guardan solo en el almacenamiento del navegador del dispositivo actual; no se suben al repositorio ni se sincronizan con el celular o la computadora. Usa **Respaldar inventario** para descargar un JSON y **Importar respaldo** para moverlo manualmente a otro dispositivo. Publicar de forma privada con Pages requiere GitHub Enterprise Cloud; la visibilidad privada de un repositorio personal Free despublica Pages.

## Actualizar los productos del sitio

Para que una edición aparezca en todos los dispositivos, actualiza `SourceProducts.gs`, ejecuta `node tools/build-catalog.cjs` y publica los cambios de `products.json` y, si hace falta, del logo. Las ediciones hechas desde la app son locales hasta que se exporten e incorporen al repositorio.

Los campos técnicos, beneficios, colores, tamaños, imágenes y modo de uso que no estaban en el Excel quedan vacíos para completar. La información comercial no se inventa.

