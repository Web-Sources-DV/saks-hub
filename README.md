# SAKS HUB

App estática para GitHub Pages. El catálogo inicial está en `products.json`; los cambios de la app se guardan localmente en cada navegador y dispositivo.

Aplicación publicada: https://web-sources-dv.github.io/saks-hub/

## Inventario y códigos

`products.json` incluye 113 productos: cinco productos SAKS de ejemplo y 108 registros del comparativo de inventarios. El identificador de cada producto es el SKU interno. La app busca, muestra, escanea y exporta por SKU; no usa EAN. Al dar de alta un producto, conserva el SKU interno que se escanee o detecte en una etiqueta; si no hay uno, genera un código `SAKS-00X`.

Para regenerar el catálogo desde las fuentes incluidas, ejecuta `node tools/build-catalog.cjs`.

## Fotos y OCR

Al subir una foto de caja, etiqueta o manual, Tesseract.js en el navegador intenta reconocer SKU, nombre de producto y datos técnicos. Solo procesa líneas con confianza alta y campos que reconoce por etiquetas o formatos conocidos. Si no puede leer un dato con certeza, lo deja vacío; no copia el texto completo de la imagen a la descripción. Los beneficios y el modo de uso se extraen únicamente cuando aparecen identificados en la foto. La foto se usa también como imagen del producto.

El OCR descarga Tesseract.js y sus datos de idioma al usarlo; requiere internet. PDF y ZIP también usan librerías externas.

## Fichas

La ficha PDF tiene media hoja carta vertical: 13,97 × 21,59 cm (5,5 × 8,5 pulgadas). La app permite descargar fichas PDF, un ZIP, exportar CSV para Excel y respaldar/restaurar el inventario en JSON.

## Privacidad y sincronización

GitHub Pages es público: el catálogo inicial, incluido el stock y los proveedores publicados, puede ser visto por cualquiera. Las nuevas altas, cambios y fotos se guardan solo en el navegador y dispositivo donde se hicieron. Para mover datos entre dispositivos, usa **Respaldar inventario** e **Importar respaldo**.
