# SAKS HUB

Web app móvil en español para inventario SAKS, conectada a Google Sheets y protegida por inicio de sesión de Google más una lista autorizada de correos.

## Archivos

- `Code.gs`: acceso por correo, hoja compartida, carga inicial, fotos en Drive, PDF, ZIP y Excel.
- `Index.html`: interfaz responsive, lectura de códigos con la cámara cuando el navegador lo admite, edición y exportaciones.
- `SourceProducts.gs`: 108 productos importados del archivo de inventario suministrado.
- `Logo.gs`: logo SAKS suministrado, incluido en la aplicación y en el PDF.
- `appsscript.json`: zona horaria de Panamá, permisos solicitados y despliegue como usuario que accede.

La lista permitida incluye `pivega_75@hotmail.com` como propietario y `pgarcia@saks.com.pa` como administrador. El correo de administración se mantiene como constante en `Code.gs`. El resto de los correos recibe una pantalla de acceso denegado y todas las funciones del servidor vuelven a verificar la autorización.

La carga inicial conserva los cinco productos de prueba y agrega los 108 productos del inventario. Para estos últimos se usa `PRODUCTO` como SKU, `DESCRIPCION` como nombre y descripción, `PRECIO` como precio, y se suman las existencias de las tres bodegas. `SUPLIDOR`, la referencia del suplidor y las cantidades por bodega también se conservan. Se excluye la fila de totales del archivo. La columna EAN no existe en el Excel, así que los productos importados se buscan por SKU; al editar una ficha se puede registrar su EAN real para habilitar el escaneo. No se inventan EAN.

La ficha y la hoja incluyen marca, beneficios, capacidad, velocidad, precio, colores, tamaños, foto del producto, contenido del empaque y modo de uso, además de descripción y los campos de inventario existentes. El Excel no trae marca, beneficios, capacidad, velocidad, colores, tamaños, fotos, contenido del empaque ni modo de uso. Esos campos quedan vacíos para completarlos desde la app. Si la pestaña ya existía con los 14 o 18 encabezados anteriores, `setup()` agrega los nuevos al final sin borrar los datos actuales.

Los PDF usan una página horizontal con el logo SAKS, la imagen del producto, tabla técnica, descripción, beneficios, contenido del empaque y uso/cuidado. Una ficha creada a partir de un EAN desconocido queda identificada como **PRODUCTO NUEVO**.

## Despliegue en la cuenta de Google del negocio

Este paso debe ejecutarlo una de las cuentas autorizadas, porque el proyecto necesita permiso sobre su Google Sheet y Drive:

1. Crea una hoja de cálculo titulada `SAKS HUB - Base` desde la cuenta de Google que será dueña de la base.
2. Abre **Extensiones → Apps Script**. En el proyecto, reemplaza `Code.gs` por el contenido de este archivo y agrega un archivo HTML llamado `Index` con el contenido de `Index.html`.
3. En **Configuración del proyecto**, activa **Mostrar el archivo de manifiesto `appsscript.json`** y reemplaza su contenido por el manifiesto de esta carpeta.
4. Guarda el proyecto. En el selector de funciones ejecuta `setup` una vez, acepta los permisos de Google Sheets, Drive y Docs, y confirma que se creó la pestaña `SAKS HUB - Base` con los cinco artículos iniciales. Si ya existe información en la pestaña, `setup` no la borra ni vuelve a cargar los productos.
5. Comparte la hoja como editor con ambas cuentas autorizadas. Esto permite que cada usuario acceda a la misma base cuando la app se ejecuta bajo su propia cuenta Google.
6. Pulsa **Implementar → Nueva implementación → Aplicación web**. Selecciona **Ejecutar como: usuario que accede a la aplicación** y **Quién tiene acceso: cualquier usuario con una cuenta Google**. La aplicación comprueba el correo autenticado en cada visita y operación y rechaza los correos fuera de la lista privada.
7. Copia la URL terminada en `/exec` y úsala en celular o computadora. En celular, el navegador puede agregar un acceso directo desde **Añadir a pantalla de inicio**.

## Productos iniciales

Se incluyen los cinco productos indicados en el pedido. Precio se guarda como USD y comienza con stock `0`; la ficha permite corregir stock, especificaciones, descripción y foto.

## Notas

- Los navegadores compatibles con `BarcodeDetector` pueden escanear EAN-8, EAN-13 y UPC usando la cámara trasera. Si el navegador no expone esa API, se puede escribir el EAN o usar un lector que escriba el código en el buscador. Los productos importados necesitan que se agregue el EAN real antes de poder encontrarlos por escaneo.
- Las fotos se guardan en una carpeta privada de Drive llamada `SAKS HUB Fotos`; la hoja conserva el ID de Drive en la columna `Foto`.
- Google Apps Script entrega una web responsive y permite crear un acceso directo en pantalla de inicio. Para que el navegador la instale como una PWA completa con service worker y manifest propio, se requiere un hosting adicional con dominio/infraestructura que no forma parte de Apps Script.
- Este entorno no tiene la sesión de Google del negocio, así que el Sheet, la aprobación de OAuth, la URL `/exec` y el despliegue no se pueden crear aquí. El código está preparado para hacer ese paso desde la cuenta autorizada.
- `SourceProducts.gs` es una carga inicial basada en el Excel recibido; no lee automáticamente el archivo local después del despliegue. Si cambia el inventario, actualiza esa lista o agrega los productos directamente desde la aplicación.
