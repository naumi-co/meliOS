# PRD — Fase 1: La Radiografía

> **Contexto del proyecto**: Ver [`README.md`](./README.md) para la visión completa del producto.

---

## Objetivo de la Fase

Mostrarle al vendedor, por primera vez, cuánto gana **realmente** en cada publicación.

La mayoría de los vendedores de MercadoLibre desconocen su margen neto real porque las comisiones varían por categoría, el costo de envío es variable, el costo de financiar cuotas sin interés es significativo, y los impuestos se llevan otra porción. El resultado es que muchos tienen publicaciones **deficitarias sin saberlo**.

El "aha moment" es inmediato y poderoso: un vendedor que descubre que 3 de sus 20 publicaciones le hacen perder plata ya justificó la suscripción.

---

## Alcance

### ✅ Incluido en esta fase
- Registro de cuenta y onboarding
- Conexión OAuth 2.0 con MercadoLibre
- Importación de publicaciones activas y su metadata
- Importación de historial de ventas (últimos 90 días)
- Input de costo de adquisición por SKU (manual + CSV)
- Motor de cálculo de margen neto real
- Dashboard principal con semáforo por publicación
- KPI cards de resumen
- Sincronización periódica automática (cada 15 min)
- Alertas básicas cuando una publicación cae a margen negativo

### ❌ Fuera de alcance (próximas fases)
- Monitor de competidores (Fase 2)
- Repricing automático (Fase 3)
- Forecasting de stock (Fase 3)
- Gestión de Ads (Fase 4)

---

## Fórmula de Margen Neto

```
margen_neto = precio_venta
            - comision_meli
            - costo_envio
            - costo_cuotas
            - costo_producto

margen_pct = margen_neto / precio_venta * 100
```

### Componentes a calcular

**comision_meli**: Varía por categoría y tipo de publicación.
- Publicación Clásica: ~13.5% en la mayoría de categorías
- Publicación Premium: ~16.5%
- Publicación gratuita: sin comisión pero sin exposición
- Fuente: endpoint `GET /categories/{category_id}/fees`

**costo_envio**: Lo que el vendedor efectivamente paga.
- Si el envío es gratis y lo subsidia MELI: $0 para el vendedor
- Si el envío es gratis y lo subsidia el vendedor: costo real según peso/dimensiones
- Fuente: endpoint `GET /items/{item_id}/shipping_options`

**costo_cuotas**: MercadoLibre cobra al vendedor el costo financiero de ofrecer cuotas sin interés.
- Varía según cantidad de cuotas y categoría
- Es uno de los costos más subestimados por los vendedores
- Fuente: endpoint `GET /payment_methods` + reglas de Mercado Pago

**costo_producto**: Ingresado manualmente por el vendedor. Es el único dato que no viene de la API.

---

## Diseño de la UI

### Pantalla 1: Onboarding / Conexión OAuth
```
┌─────────────────────────────────────────────────────┐
│  MeliOps                                            │
│                                                     │
│  Conectá tu cuenta de MercadoLibre                  │
│  y descubrí tu margen neto real en 2 minutos.       │
│                                                     │
│  [  Conectar con MercadoLibre  ]                    │
│                                                     │
│  🔒 Solo lectura de tus datos. Podés desconectar    │
│     en cualquier momento.                           │
└─────────────────────────────────────────────────────┘
```

### Pantalla 2: Input de costos
```
┌─────────────────────────────────────────────────────┐
│  Tus publicaciones (47 encontradas)                 │
│                                                     │
│  Para calcular el margen necesitamos el costo       │
│  de cada producto. Podés ingresarlos uno a uno      │
│  o subir un CSV.                                    │
│                                                     │
│  [Subir CSV]  [Completar manualmente]               │
│                                                     │
│  Publicación              Precio    Costo           │
│  ─────────────────────────────────────────────────  │
│  Auriculares Bluetooth    $89.999   [$______]       │
│  Cable HDMI 2.0 3m        $8.500    [$______]       │
│  Mouse Inalámbrico        $23.400   [$______]       │
└─────────────────────────────────────────────────────┘
```

### Pantalla 3: Dashboard principal
```
┌─────────────────────────────────────────────────────┐
│  💰 $1.240.000  │  📦 47 pub  │  🔴 6 en rojo  │ 📈 18.4% │
├─────────────────────────────────────────────────────┤
│  Publicación         Precio   Comisión  Envío  Margen  Estado  │
│  ──────────────────────────────────────────────────────────── │
│  Auriculares XM4    $89.999  -$17.100  -$4.200  13.8%  🟢     │
│  Cable HDMI 2.0      $8.500   -$1.615  -$4.200  -3.7%  🔴     │
│  Mouse Logitech     $23.400   -$4.446  Gratis   10.5%  🟡     │
└─────────────────────────────────────────────────────┘
```

**Criterios del semáforo:**
- 🟢 Verde: margen > 15%
- 🟡 Amarillo: margen entre 5% y 15%
- 🔴 Rojo: margen < 5% (incluyendo pérdida)

---

## Tareas de Desarrollo

### F1-01 — Registro de cuenta
**Prioridad:** Alta | **Esfuerzo:** Bajo

Flujo de registro básico:
- Campos: email, contraseña, nombre del negocio, país (AR / MX / BR)
- Validación de email con link de confirmación
- Almacenar país para aplicar lógica de impuestos correcta

---

### F1-02 — Conexión OAuth con MercadoLibre
**Prioridad:** Alta | **Esfuerzo:** Medio

Implementar el flujo completo de OAuth 2.0:

```
1. Usuario hace click en "Conectar con MercadoLibre"
2. Redirigir a: https://auth.mercadolibre.com.ar/authorization
   ?response_type=code
   &client_id={APP_ID}
   &redirect_uri={CALLBACK_URL}
3. MELI devuelve: GET /callback?code={authorization_code}
4. Intercambiar code por tokens:
   POST https://api.mercadolibre.com/oauth/token
   { grant_type: "authorization_code", code, redirect_uri }
5. Guardar access_token (TTL: 6hs) y refresh_token (TTL: 6 meses)
6. Job periódico para renovar access_token antes de que expire
```

Consideraciones de seguridad:
- Tokens cifrados en base de datos
- Nunca exponer tokens al frontend
- Manejar revocación por parte del usuario

---

### F1-03 — Importación de publicaciones
**Prioridad:** Alta | **Esfuerzo:** Medio

```
GET /users/{user_id}/items/search?status=active&limit=100&offset=0

Paginación: repetir hasta que no haya más resultados.

Por cada item_id, obtener detalle:
GET /items/{item_id}

Campos a guardar:
- id, title, price, available_quantity
- listing_type_id (clásica / premium / etc.)
- category_id
- shipping (free_shipping, mode)
- thumbnail
- permalink
```

Ejecutar en background con job queue. Para catálogos grandes (500+ SKUs) puede tardar varios minutos.

---

### F1-04 — Importación de ventas
**Prioridad:** Alta | **Esfuerzo:** Medio

```
GET /orders/search?seller={user_id}&order.status=paid
  &order.date_created.from={90_days_ago}
  &limit=50&offset=0

Campos relevantes:
- order_items[].item.id → relacionar con publicación
- order_items[].quantity
- order_items[].unit_price
- date_created
```

Calcular por SKU:
- Total de unidades vendidas (últimos 30/60/90 días)
- Velocidad de ventas promedio (unidades/día)
- Ingresos totales

---

### F1-05 — Calculadora de comisiones MELI
**Prioridad:** Alta | **Esfuerzo:** Alto

Las comisiones varían por **categoría** y **tipo de publicación**. Hay que construir una tabla de comisiones actualizable.

```
GET /categories/{category_id}/fees?price={price}&listing_type_id={type}

Respuesta incluye:
- sale_fee_amount (comisión fija en $)
- sale_fee_rate (porcentaje)
```

Considerar casos especiales:
- Productos con precio variable (subastas) — no aplica en esta fase
- Categorías con comisiones especiales (autos, inmuebles, servicios)
- Variantes de producto con precios distintos

---

### F1-06 — Calculadora de costo de envío
**Prioridad:** Alta | **Esfuerzo:** Alto

```
GET /items/{item_id}/shipping_options?zip_code={zip_destino}
```

Lógica a implementar:
- **Envío gratis subsidiado por MELI** (Fulfillment Full): costo $0 para el vendedor
- **Envío gratis subsidiado por el vendedor**: calcular costo según dimensiones/peso del producto
- **Envío a cargo del comprador**: no impacta el margen del vendedor

El costo de envío depende del destino. Usar un zip code representativo (ej: CABA para Argentina, CDMX para México) para el cálculo de referencia.

---

### F1-07 — Input de costo de producto
**Prioridad:** Alta | **Esfuerzo:** Bajo

Dos modalidades:

**Manual (inline)**
- Tabla editable en el dashboard
- Campo numérico por fila
- Guardar al perder el foco (sin botón de submit)

**Importación CSV**
- Formato esperado: `sku_meli,costo`
- Validación de formato antes de procesar
- Preview de los primeros 5 registros antes de confirmar
- Template descargable

Persistir costos en base de datos. Si el usuario actualiza el costo, recalcular margen inmediatamente.

---

### F1-08 — Motor de cálculo de margen neto
**Prioridad:** Alta | **Esfuerzo:** Medio

Función central del sistema:

```typescript
interface MarginResult {
  precio_venta: number;
  comision_meli: number;       // negativo
  costo_envio: number;         // negativo
  costo_cuotas: number;        // negativo
  costo_producto: number;      // negativo
  margen_neto: number;
  margen_pct: number;
  semaforo: 'verde' | 'amarillo' | 'rojo';
}

function calcularMargen(item: Item, costoProducto: number): MarginResult
```

Recalcular automáticamente cuando:
- Cambia el precio de la publicación (detectado en sync)
- El usuario actualiza el costo del producto
- Cambian las comisiones de MELI (actualización mensual)

---

### F1-09 — Dashboard principal
**Prioridad:** Alta | **Esfuerzo:** Medio

Tabla principal con las siguientes columnas:
- Imagen (thumbnail pequeño)
- Nombre de la publicación (con link a MELI)
- Precio de venta
- Comisión MELI ($)
- Costo de envío ($)
- Costo del producto ($)
- Margen neto ($)
- Margen (%)
- Semáforo (🟢🟡🔴)

Funcionalidades:
- Ordenar por cualquier columna
- Filtrar por semáforo (ver solo los rojos)
- Buscar por nombre de publicación
- Paginación (50 por página)

---

### F1-10 — KPI cards de resumen
**Prioridad:** Media | **Esfuerzo:** Bajo

4 tarjetas en el header del dashboard:
1. **Facturación total** (últimos 30 días): suma de ventas
2. **Publicaciones activas**: count total
3. **Publicaciones en rojo**: count con margen < 5%
4. **Margen promedio**: promedio ponderado por volumen de ventas

---

### F1-11 — Alertas de publicaciones en pérdida
**Prioridad:** Media | **Esfuerzo:** Bajo

Trigger: cuando una publicación pasa de margen positivo a negativo (por cambio de precio, comisiones o envío).

Notificación:
- In-app: badge en el ícono de notificaciones
- Email: "⚠️ La publicación [nombre] tiene margen negativo (-X%)"
- Frecuencia máxima: 1 email por publicación por día (no spamear)

---

### F1-12 — Sincronización periódica automática
**Prioridad:** Alta | **Esfuerzo:** Medio

Job en background que cada 15 minutos:
1. Refresca precios de todas las publicaciones activas
2. Actualiza stock disponible
3. Importa nuevas ventas
4. Recalcula márgenes si algo cambió
5. Dispara alertas si corresponde

Considerar:
- Rate limiting de MELI API (600 req/min por token)
- Para cuentas grandes, escalonar los jobs
- Mostrar "última actualización hace X minutos" en el dashboard

---

## Criterios de Aceptación (Definition of Done)

- [ ] Un vendedor nuevo puede conectar su cuenta en menos de 2 minutos
- [ ] El dashboard muestra todas las publicaciones activas con su margen calculado
- [ ] Los cálculos de comisión coinciden con los que muestra el panel de MELI (tolerancia ±2%)
- [ ] El semáforo rojo identifica correctamente publicaciones con margen < 5%
- [ ] La sincronización automática actualiza los datos cada 15 minutos sin intervención manual
- [ ] Un vendedor con 200 SKUs puede ver su dashboard cargado en menos de 3 segundos

---

## Notas Técnicas Importantes

1. **Registro como app en MELI**: Antes de empezar, crear la app en https://developers.mercadolibre.com.ar y obtener `APP_ID` y `SECRET_KEY`.

2. **Scopes OAuth necesarios**: `read`, `offline_access` (para refresh token). En Fase 3 se necesitará `write` para el repricing.

3. **Ambiente de pruebas**: MELI tiene cuentas de test. Usarlas durante desarrollo para no afectar cuentas reales.

4. **Variaciones de producto**: Un ítem puede tener variaciones (ej: talle S/M/L con precios distintos). El MVP puede tratarlas como un único item con el precio base. Mejorar en iteraciones.

5. **Multi-país desde el día 1**: Las URLs de OAuth cambian por país (`.com.ar`, `.com.mx`, `.com.br`). Diseñar con esto en cuenta desde el inicio.
