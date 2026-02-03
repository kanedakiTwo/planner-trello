# Teams App Manifest

Este directorio contiene el manifiesto para instalar el bot de Planner en Microsoft Teams.

## Configuracion

1. **Crea una Azure Bot:**
   - Ve a [Azure Portal](https://portal.azure.com)
   - Crea un recurso "Azure Bot"
   - En "Configuration", copia el **Microsoft App ID**
   - En "Configuration" > "Manage Password", crea un **Client Secret**

2. **Configura variables de entorno:**
   ```
   MICROSOFT_APP_ID=<tu-app-id>
   MICROSOFT_APP_PASSWORD=<tu-client-secret>
   MICROSOFT_APP_TENANT_ID=<tu-tenant-id>  # Opcional, solo para single-tenant
   ```

3. **Configura el endpoint del bot:**
   - En Azure Bot > Configuration > Messaging endpoint:
   - `https://tu-dominio.railway.app/api/messages`

4. **Habilita el canal de Teams:**
   - En Azure Bot > Channels > Teams
   - Acepta los terminos

## Crear el paquete de la app

1. Reemplaza `{{MICROSOFT_APP_ID}}` con tu App ID real en `manifest.json`
2. Reemplaza `{{APP_DOMAIN}}` con tu dominio (ej: `planner.railway.app`)
3. Crea los iconos:
   - `color.png`: 192x192 pixels, fondo de color
   - `outline.png`: 32x32 pixels, transparente con lineas blancas
4. Comprime los 3 archivos en un ZIP: `planner-teams.zip`

## Instalar en Teams

1. Ve a Teams > Apps > "Manage your apps"
2. Click en "Upload an app" > "Upload a custom app"
3. Selecciona el archivo ZIP
4. Abre el chat con el bot y escribe `conectar`

## Comandos del bot

- **conectar** - Genera un codigo para vincular tu cuenta de Planner
- **ayuda** - Muestra los comandos disponibles
- **estado** - Verifica si tu cuenta esta vinculada

## Flujo de vinculacion

1. Usuario escribe "conectar" al bot en Teams
2. Bot genera codigo de 6 caracteres (valido 10 min)
3. Usuario ingresa el codigo en Configuracion de Planner
4. Cuentas vinculadas - usuario recibe menciones como mensajes personales
