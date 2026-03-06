# PRD — Fase 2: El Radar

> **Dependencias**: La Fase 2 requiere que la Fase 1 esté completa. El usuario ya tiene su cuenta conectada y sus publicaciones importadas.
> **Contexto del proyecto**: Ver [`README.md`](./README.md).

---

## Objetivo de la Fase

Darle al vendedor **inteligencia competitiva en tiempo real** sobre cada publicación en la que compite.

Hoy los vendedores monitorean a sus competidores manualmente: abren MELI, buscan su publicación, miran quién está vendiendo, y anotan los precios en una planilla. Es lento, inconsistente e imposible de escalar cuando se tienen 50+ SKUs.

El Radar automatiza ese proceso y va más allá: detecta oportunidades (competidor sin stock = subir precio), alerta sobre amenazas (competidor nuevo o bajada de precio agresiva), y construye el historial de datos que el algoritmo de repricing de la Fase 3 necesita para funcionar bien.

> **Nota estratégica**: el Radar no solo entrega valor propio — es la capa de datos que hace posible el repricing inteligente de la Fase 3. Cuanto antes se active, más datos históricos habrá disponibles cuando se lance el motor de precios.

---

## Alcance

### ✅ Incluido en esta fase
- Identificación automática de competidores por publicación de catálogo
- Monitor de precio, stock y reputación de cada competidor
- Actualización cada 15 minutos
- Historial de precios con gráfico (30/60/90 días)
- Sistema de alertas configurables (sin stock, bajada de precio, nuevo competidor)
- Notificaciones in-app y por email
- Detector de oportunidades de catálogo
- Dashboard centralizado de alertas

### ❌ Fuera de alcance
- Cambios automáticos de precio (Fase 3)
- Análisis de keywords o SEO de publicaciones (posible Fase 4)
- Espiar campañas de Ads de competidores

---

## Conceptos Clave de MercadoLibre

### Publicaciones de Catálogo
En MercadoLibre, muchos productos tienen una **publicación de catálogo unificada**: todos los vendedores del mismo producto comparten una sola página de producto. El sistema elige qué vendedor muestra primero (el "ganador del Buy Box") según precio, reputación, stock, tiempo de entrega y otros factores.

El Radar trabaja sobre estas publicaciones de catálogo: para cada publicación del vendedor, identifica quiénes más están vendiendo el mismo producto y qué condiciones tienen.

### Datos accesibles vía API
La API de MELI permite consultar:
- Todos los ítems asociados a un `catalog_product_id`
- Precio, stock disponible y `seller_id` de cada ítem competidor
- Reputación del vendedor (`GET /users/{seller_id}`)

---

## Diseño de la UI

### Vista principal: Dashboard de Radar
```
┌──────────────────────────────────────────────────────────┐
│  🔔 Alertas activas (3)                                  │
│  ─────────────────────────────────────────────────────── │
│  ⚡ ElectroMax sin stock en Auriculares XM4 — hace 12 min │
│  ⬇️  TecnoStore bajó precio en Mouse Logitech — hace 1hs  │
│  🆕 Nuevo competidor en Cable HDMI 2.0 — hace 3hs        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Mis publicaciones — estado competitivo                  │
│                                                          │
│  Publicación       Competidores  Mi precio  Mejor precio  Delta  │
│  ──────────────────────────────────────────────────────── │
│  Auriculares XM4   4 vendedores  $89.999    $87.500(0u)  +$2.499 │
│  Cable HDMI 2.0    2 vendedores  $8.500     $8.200       +$300   │
│  Mouse Logitech    6 vendedores  $23.400    $23.400      $0      │
└──────────────────────────────────────────────────────────┘
```

### Vista de detalle por publicación
```
┌──────────────────────────────────────────────────────────┐
│  Auriculares Bluetooth XM4 — Competencia                 │
├────────────────────┬─────────┬───────┬──────────┬────────┤
│  Vendedor          │ Precio  │ Stock │ Reputa.  │ 24hs   │
├────────────────────┼─────────┼───────┼──────────┼────────┤
│ ⭐ TU PUBLICACIÓN  │ $89.999 │ 142u  │ 98.5% 🟢 │ —      │
│  ElectroMax2024    │ $87.500 │ 0u 🔴 │ 96.2% 🟢 │ -$2000 │
│  TecnoStore_BA     │ $91.000 │ 28u   │ 94.0% 🟡 │ +$1000 │
│  AudioXpress       │ $94.500 │ 5u    │ 91.0% 🟡 │ nuevo  │
└────────────────────┴─────────┴───────┴──────────┴────────┘

  [Gráfico: historial de precios últimos 30 días]
  Tu precio (verde) vs ElectroMax (rojo) vs TecnoStore (gris)
```

---

## Tareas de Desarrollo

### F2-01 — Identificación de competidores por publicación
**Prioridad:** Alta | **Esfuerzo:** Alto

Para cada publicación del vendedor que tenga un `catalog_product_id`, obtener todos los ítems que compiten:

```
GET /products/{catalog_product_id}/items
  → lista de item_ids de todos los vendedores del mismo producto

Por cada item_id competidor:
GET /items/{item_id}
  → price, available_quantity, seller_id, listing_type_id

GET /users/{seller_id}
  → seller_reputation.transactions.ratings.positive (reputación)
```

Guardar snapshot inicial de todos los competidores en base de datos.

Casos a manejar:
- Publicaciones que no son de catálogo (sin `catalog_product_id`): monitorear publicaciones de la misma categoría con título similar
- Publicaciones pausadas o finalizadas de competidores: marcar como inactivas

---

### F2-02 — Monitor de precios de competidores
**Prioridad:** Alta | **Esfuerzo:** Medio

Cada 15 minutos, para cada competidor trackeado:
1. Consultar precio actual
2. Comparar con último precio guardado
3. Si cambió: guardar nuevo registro con timestamp y calcular variación

```typescript
interface PriceSnapshot {
  item_id: string;
  seller_id: string;
  price: number;
  timestamp: Date;
  delta_vs_previous: number;  // en $ y en %
}
```

Diseño de la tabla en DB pensando en consultas de historial: necesitará índices por `item_id` + `timestamp`.

---

### F2-03 — Monitor de stock de competidores
**Prioridad:** Alta | **Esfuerzo:** Medio

Trackear `available_quantity` de cada competidor en cada ciclo de actualización.

Estados de stock a detectar:
- **Sin stock** (0 unidades): oportunidad de subir precio
- **Stock crítico** (<5 unidades): probable quiebre inminente
- **Reaparición de stock**: competidor que volvió a tener inventario

Guardar historial de stock junto con historial de precios en la misma tabla de snapshots.

---

### F2-04 — Monitor de reputación de competidores
**Prioridad:** Media | **Esfuerzo:** Bajo

La reputación de un vendedor afecta su posición en el Buy Box. Si un competidor baja de nivel de reputación, puede perder posicionamiento incluso con mejor precio.

```
GET /users/{seller_id}
→ seller_reputation.level_id  (Mercado Líder Platinum/Gold/Silver/etc.)
→ seller_reputation.transactions.ratings.positive (% positivo)
```

Actualizar diariamente (no necesita frecuencia de 15 min). Alertar si la reputación de un competidor cae más de 2 puntos porcentuales.

---

### F2-05 — Vista de detalle de competencia por publicación
**Prioridad:** Alta | **Esfuerzo:** Medio

Pantalla accesible al hacer click en cualquier publicación del dashboard.

Componentes:
- **Tabla de competidores**: nombre del vendedor, precio, stock, reputación, variación en 24hs
- La fila del vendedor propio siempre aparece destacada (⭐)
- Ordenar por precio (para ver quién tiene el Buy Box actualmente)
- Badge "🔴 Sin stock" para competidores con 0 unidades

---

### F2-06 — Historial de precios con gráfico
**Prioridad:** Alta | **Esfuerzo:** Medio

Gráfico de líneas interactivo debajo de la tabla de competidores.

Especificaciones:
- Eje X: fechas (selector: 7 días / 30 días / 90 días)
- Eje Y: precios en $
- Línea por cada vendedor (hasta 5 competidores, el resto agrupar como "otros")
- Línea del vendedor propio siempre visible y destacada
- Tooltip al hover: fecha, precio de cada vendedor, quién tenía el Buy Box

Librería sugerida: Recharts (React) o Chart.js.

---

### F2-07 — Motor de alertas configurables
**Prioridad:** Alta | **Esfuerzo:** Medio

Tipos de alerta a implementar:

| Tipo | Trigger | Default |
|------|---------|---------|
| `COMPETITOR_OUT_OF_STOCK` | Competidor llega a 0 unidades | Activo |
| `PRICE_DROP` | Competidor baja precio > X% | Activo (X=5%) |
| `PRICE_INCREASE` | Competidor sube precio | Inactivo |
| `NEW_COMPETITOR` | Nuevo vendedor aparece en la publicación | Activo |
| `LOST_BUY_BOX` | Tu publicación ya no es la más barata | Activo |
| `REPUTATION_DROP` | Competidor baja reputación significativa | Inactivo |

El vendedor puede activar/desactivar cada tipo de alerta y configurar los umbrales (ej: `PRICE_DROP` solo si baja más del 10%).

```typescript
interface AlertConfig {
  type: AlertType;
  enabled: boolean;
  threshold?: number;  // para alertas con umbral
  notify_email: boolean;
  notify_inapp: boolean;
}
```

---

### F2-08 — Notificaciones in-app y por email
**Prioridad:** Media | **Esfuerzo:** Bajo

**In-app:**
- Badge con count en el ícono de la campana
- Panel desplegable con las últimas 20 alertas
- Marcar como leídas al hacer click

**Email:**
- Template HTML responsivo
- Asunto: `⚡ MeliOps: [nombre publicación] — [descripción alerta]`
- Incluir link directo a la publicación afectada
- Resumen diario opcional: un email con todas las alertas del día (para usuarios que prefieren no recibir en tiempo real)
- Rate limiting: máximo 1 email inmediato por publicación cada 30 minutos

---

### F2-09 — Detector de oportunidades de catálogo
**Prioridad:** Alta | **Esfuerzo:** Alto

Identificar publicaciones de catálogo donde el vendedor **no está presente** pero hay una oportunidad:

**Criterios de oportunidad:**
1. El líder actual tiene stock bajo (< 10 unidades)
2. El líder actual tiene reputación baja (< 90%)
3. Hay solo 1 o 2 competidores activos (poca competencia)
4. El precio promedio de la categoría está alto (margen atractivo)

Comparar el catálogo de productos del vendedor (por EAN/código de barras o título) contra publicaciones de catálogo donde todavía no tiene publicación activa.

Presentar como lista: "Estas 5 publicaciones son oportunidades para entrar ahora".

---

### F2-10 — Dashboard centralizado de alertas
**Prioridad:** Media | **Esfuerzo:** Medio

Vista dedicada que agrupa todas las alertas activas:
- Filtrar por tipo de alerta
- Filtrar por publicación
- Ordenar por impacto estimado (una alerta de "sin stock" en el competidor de tu producto más vendido vale más que en uno poco vendido)
- Marcar alertas como "atendidas"
- Historial de alertas de los últimos 30 días

El **impacto estimado** se calcula como: `ventas_diarias_del_item * precio * relevancia_del_tipo_de_alerta`.

---

## Criterios de Aceptación (Definition of Done)

- [ ] Para cada publicación de catálogo, se muestran todos los competidores activos con precio y stock actual
- [ ] Los datos se actualizan cada 15 minutos sin intervención manual
- [ ] El gráfico de historial de precios muestra datos de los últimos 30 días correctamente
- [ ] Las alertas de "competidor sin stock" se disparan en menos de 20 minutos desde que ocurre el evento
- [ ] El vendedor puede activar/desactivar cada tipo de alerta individualmente
- [ ] Las notificaciones por email llegan en menos de 5 minutos desde la detección

---

## Consideraciones Técnicas

1. **Volumen de consultas**: Un vendedor con 100 SKUs y 5 competidores promedio = 500 publicaciones a monitorear cada 15 minutos = ~2000 requests/hora a la API de MELI. Bien dentro del rate limit, pero hay que gestionar con colas.

2. **Almacenamiento de historial**: Los snapshots de precios se acumulan rápido. Definir política de retención: guardar datos cada 15 min durante 7 días, luego agregar a 1 snapshot/hora durante 90 días, luego 1 snapshot/día indefinidamente.

3. **Identificación de "mismo producto"**: Relacionar las publicaciones del vendedor con publicaciones de competidores via `catalog_product_id`. Para productos sin catálogo, usar comparación de título (fuzzy matching).

4. **Datos que se guardan para Fase 3**: Todo el historial de precios y stock de competidores acumulado en la Fase 2 será el dataset de entrenamiento del algoritmo de repricing. Cuanto más tiempo esté activo el Radar, mejor funcionará el Piloto.
