# PRD — Fase 4: El Cerebro

> **Dependencias**: Requiere Fases 1, 2 y 3 completas.
> **Contexto del proyecto**: Ver [`README.md`](./README.md).

---

## Objetivo de la Fase

Completar la suite de optimización con cuatro capacidades avanzadas: gestión de publicidad (Ads), inteligencia sobre devoluciones, herramientas para lanzar nuevos productos, y visibilidad financiera completa.

Al final de la Fase 4, MeliOps ofrece todo lo que un vendedor serio necesita para optimizar su negocio en MercadoLibre, con excepción de la gestión de inventario físico y la facturación (Fase 5).

---

## Módulos de la Fase 4

Esta fase se compone de **4 módulos independientes** que pueden desarrollarse en paralelo o en secuencia. Orden sugerido por impacto:

1. **P&L Financiero** — Base para todo lo demás. Permite medir el impacto real de los otros módulos.
2. **Optimizador de Ads** — El más independiente técnicamente; alto ROI para el vendedor.
3. **Analizador de Devoluciones** — Requiere datos históricos; mejor cuanto antes se empieza a acumular.
4. **Wizard de Lanzamiento** — Integra todos los módulos anteriores.

---

## Módulo 4A: P&L Financiero Unificado

### Problema que resuelve
MercadoLibre paga con demoras de 14-30 días, las comisiones son variables y los reportes nativos de MELI son fragmentados. Un vendedor con 50 SKUs no puede saber fácilmente si su negocio es rentable en un mes dado, ni qué categorías o productos son los que más aportan.

### Fórmula del P&L
```
Ingresos brutos
  - Comisiones MELI
  - Costos de envío
  - Costos de publicidad (Ads)
  - Costo de cuotas
  - Impuestos (IVA sobre comisiones, ingresos brutos)
  - Costo de productos vendidos (COGS)
= Utilidad neta operativa
```

### Tareas

#### F4-P1 — Importación de movimientos de Mercado Pago
**Prioridad:** Alta | **Esfuerzo:** Medio

```
GET /collections/search?seller_id={id}&status=approved
  → todas las ventas cobradas (con fecha de acreditación real)

GET /money_movements?account={id}
  → movimientos de la cuenta: ventas, devoluciones, comisiones, liberaciones
```

Distinguir entre fecha de venta y fecha de acreditación. Ambas son relevantes: la fecha de venta para el P&L contable, la de acreditación para el flujo de caja.

#### F4-P2 — P&L mensual
**Prioridad:** Alta | **Esfuerzo:** Medio

Vista de estado de resultados del mes seleccionado:
- Selector de período: mes actual, mes anterior, últimos 3/6/12 meses, rango personalizado
- Desglose por línea: ingresos, cada tipo de costo, utilidad
- Comparación vs período anterior: `▲ +12%` o `▼ -3%`
- Exportar a Excel (una fila por mes, columnas = líneas del P&L)

#### F4-P3 — P&L por categoría y por SKU
**Prioridad:** Alta | **Esfuerzo:** Medio

Drill-down: el vendedor puede clickear en cualquier línea del P&L y ver el desglose.

```
P&L Total
  └── Por categoría
        └── Por publicación (SKU)
              └── Por venta individual (opcional, para auditoría)
```

Identificar automáticamente:
- Top 5 productos más rentables (en $ absolutos)
- Top 5 productos menos rentables (en $ o en %)
- Productos que generan ingresos pero con margen < 0

#### F4-P4 — Exportación contable
**Prioridad:** Media | **Esfuerzo:** Medio

Exportar movimientos en formato que el contador pueda usar directamente:
- Excel con una fila por movimiento: fecha, tipo, descripción, monto, categoría contable
- Columna de categoría contable mapeada (ventas / comisiones / envíos / etc.)
- Filtros por período y por tipo de movimiento
- Compatible con el formato de importación de sistemas contables comunes (Tango, Bejerman, etc.)

---

## Módulo 4B: Optimizador de Product Ads

### Problema que resuelve
Mercado Ads (Product Ads) es el sistema de publicidad paga de MELI. La mayoría de los vendedores lo usa mal: o no lo usa, o pone presupuesto sin optimizar y pierde plata. El ROAS (return on ad spend) promedio de un vendedor no optimizado suele ser menor a 3x, cuando con buena gestión puede superar 6x.

### Tareas

#### F4-A1 — Integración con Mercado Ads API
**Prioridad:** Alta | **Esfuerzo:** Alto

```
GET /advertising/product_ads/campaigns?advertiser_id={id}
  → listar campañas activas

GET /advertising/product_ads/adgroups?campaign_id={id}
  → grupos de anuncios por campaña

GET /advertising/product_ads/stats?advertiser_id={id}&date_from=...&date_to=...
  → métricas: impresiones, clicks, spend, ventas generadas
```

Métricas a importar y calcular:
- **Spend**: gasto total en Ads
- **Revenue from Ads**: ventas directamente atribuidas a Ads
- **ROAS** = Revenue from Ads / Spend
- **ACoS** (Advertising Cost of Sale) = Spend / Revenue from Ads * 100
- **CPC** (costo por click) = Spend / Clicks
- **CTR** (click-through rate) = Clicks / Impressions

#### F4-A2 — Dashboard de rendimiento de Ads
**Prioridad:** Alta | **Esfuerzo:** Medio

Tabla por publicación con:
- Gasto en Ads (período seleccionable)
- Ventas generadas por Ads
- ROAS (con color: verde > 4x, amarillo 2-4x, rojo < 2x)
- ACoS
- Recomendación automática: "Aumentar presupuesto", "Mantener", "Reducir", "Pausar"

**Lógica de recomendaciones:**
- ROAS > 5x AND presupuesto limitando: "Aumentar presupuesto"
- ROAS 3-5x: "Mantener"
- ROAS 1.5-3x: "Revisar keywords y creatividades"
- ROAS < 1.5x: "Pausar campaña"

#### F4-A3 — Optimización automática de pujas
**Prioridad:** Alta | **Esfuerzo:** Alto

El vendedor define un **ROAS objetivo** (ej: 4x). El sistema ajusta automáticamente:
- Aumentar CPC bid para publicaciones con ROAS > objetivo y presupuesto limitando
- Reducir CPC bid para publicaciones con ROAS < objetivo
- Pausar automáticamente campañas con ROAS < 1x (perdiendo plata en Ads)

```
nuevo_bid = bid_actual * (roas_actual / roas_objetivo) ^ 0.5
// Ajuste suavizado para evitar cambios bruscos
nuevo_bid = clamp(nuevo_bid, bid_minimo, bid_maximo)
```

Ejecutar ajustes 1 vez por día (no más frecuente — los datos de conversión tienen latencia).

#### F4-A4 — Redistribución de presupuesto
**Prioridad:** Media | **Esfuerzo:** Alto

Si el vendedor tiene un presupuesto mensual total de Ads, redistribuirlo automáticamente:
- Menos presupuesto para campañas con ROAS bajo
- Más presupuesto para campañas con ROAS alto que están "limitadas por presupuesto"
- Nunca exceder el presupuesto total configurado

---

## Módulo 4C: Analizador de Devoluciones

### Problema que resuelve
Las devoluciones y reclamos destruyen la reputación en MELI (el indicador más importante para el posicionamiento) y tienen costo directo (logística de reversa, producto usado/dañado). Pero la mayoría de los vendedores los maneja de forma reactiva y nunca analiza los patrones.

### Tareas

#### F4-D1 — Importación de reclamos y devoluciones
**Prioridad:** Alta | **Esfuerzo:** Medio

```
GET /claims?resource_id={order_id}&role=responder
  → reclamos donde el vendedor es el "respondedor"

Campos relevantes:
- claim_id, reason_id (código de motivo)
- resolution (reembolso, devolución de producto, sin resolución)
- stage (en disputa, cerrado)
- messages[]: texto del reclamo del comprador
```

Importar historial completo de reclamos de los últimos 12 meses.

#### F4-D2 — Clasificador de motivos con IA
**Prioridad:** Alta | **Esfuerzo:** Alto

Usar un LLM (Claude o similar) para analizar el texto libre de cada reclamo y clasificarlo en categorías accionables:

Categorías sugeridas:
- `PRODUCTO_NO_CORRESPONDE` — el producto recibido no es el de la foto/descripción
- `TALLE_O_MEDIDA` — no era el talle/tamaño esperado
- `DEFECTO_DE_FABRICA` — producto llegó roto o no funciona
- `DAÑO_EN_ENVÍO` — producto llegó dañado por el transporte
- `DEMORA_EN_ENVÍO` — tardó demasiado en llegar
- `ARREPENTIMIENTO` — el comprador simplemente no lo quiere
- `EXPECTATIVA_NO_CUMPLIDA` — el producto es real pero no era lo que esperaban

Prompt al LLM:
```
Dado el siguiente texto de reclamo de un comprador en MercadoLibre,
clasificalo en UNA de estas categorías: [lista].
Responde solo con el nombre de la categoría, sin explicación.

Reclamo: "{texto_del_reclamo}"
```

Guardar la clasificación junto con el reclamo. Permitir que el vendedor corrija clasificaciones incorrectas (para mejorar el modelo).

#### F4-D3 — Detección de patrones
**Prioridad:** Alta | **Esfuerzo:** Medio

Por cada publicación con más de 3 devoluciones en los últimos 90 días:
1. Calcular distribución de motivos
2. Si un motivo supera el 40% del total: generar alerta con recomendación

Recomendaciones automáticas por motivo dominante:

| Motivo dominante | Recomendación |
|------------------|---------------|
| TALLE_O_MEDIDA | Agregar tabla de talles detallada a la descripción/fotos |
| PRODUCTO_NO_CORRESPONDE | Revisar fotos y descripción, pueden no ser representativas |
| DEFECTO_DE_FABRICA | Revisar proveedor o lote de producción |
| DAÑO_EN_ENVÍO | Mejorar empaque (más protección) |
| EXPECTATIVA_NO_CUMPLIDA | Ajustar descripción para ser más preciso sobre las características |

#### F4-D4 — Dashboard de devoluciones
**Prioridad:** Media | **Esfuerzo:** Bajo

Vista con:
- Tasa de devolución por publicación (% de ventas que generan reclamo)
- Distribución de motivos (gráfico de torta)
- Alertas de patrones detectados
- Evolución temporal: ¿la tasa de devolución mejoró o empeoró en los últimos 3 meses?

---

## Módulo 4D: Wizard de Lanzamiento

### Problema que resuelve
Cuando un vendedor sube una publicación nueva, está en desventaja total frente a competidores con historial de ventas y reputación acumulada. El algoritmo de MELI favorece publicaciones con más conversiones. El wizard convierte el lanzamiento de un arte en un proceso estructurado y repetible.

### Tareas

#### F4-L1 — Precio inicial de lanzamiento
**Prioridad:** Media | **Esfuerzo:** Medio

Calcular el precio óptimo para el lanzamiento considerando:
1. Precio de la competencia activa en esa publicación de catálogo
2. Margen mínimo del vendedor
3. Estrategia: ¿quiere ganar volumen rápido o maximizar margen desde el día 1?

Para lanzamiento agresivo (ganar tracción):
```
precio_lanzamiento = precio_mínimo_competencia * 0.95
// 5% más barato que el más barato, hasta el mínimo propio
```

Mostrar cuántos días o ventas necesita para empezar a subir el precio.

#### F4-L2 — Presupuesto de Ads para los primeros 30 días
**Prioridad:** Media | **Esfuerzo:** Medio

Calcular el presupuesto de Ads recomendado basado en:
- Precio del producto (productos más caros necesitan menos conversiones para cubrir el costo de los Ads)
- Competencia en la categoría (más competencia = más caro ganar visibilidad)
- Objetivo de ventas definido por el vendedor

Fórmula base:
```
conversiones_necesarias = objetivo_ventas_mes / tasa_conversión_promedio_categoría
clics_necesarios = conversiones_necesarias / CTR_promedio_categoría
presupuesto_ads = clics_necesarios * CPC_promedio_categoría
```

#### F4-L3 — Keywords y optimización del título
**Prioridad:** Media | **Esfuerzo:** Alto

Analizar los títulos de las publicaciones más vendidas en esa categoría/producto e identificar:
- Palabras clave más frecuentes en los top 10 vendedores
- Palabras que generan más búsquedas (usando datos de Real Trends API si disponible, o inferido de los títulos líderes)
- Sugerir un título optimizado para la publicación nueva

```
Ejemplo:
Títulos de líderes: 
  "Auriculares Bluetooth Sony WH-1000XM5 Cancelacion de Ruido"
  "Auriculares Inalámbricos Sony XM5 Noise Cancelling 30hs"
  
Palabras clave clave: bluetooth, inalámbrico, noise cancelling, 30hs
Título sugerido: "[Marca] [Modelo] Auriculares Bluetooth Inalámbricos [Feature1] [Feature2]"
```

#### F4-L4 — Checklist de lanzamiento
**Prioridad:** Baja | **Esfuerzo:** Bajo

Wizard paso a paso con checklist antes de publicar:
- [ ] Título con palabras clave principales
- [ ] Mínimo 6 fotos (fondo blanco + detalles + uso en contexto)
- [ ] Descripción con ficha técnica completa
- [ ] Precio de lanzamiento configurado
- [ ] Campaña de Ads activa desde el día 1
- [ ] Stock suficiente para cubrir la demanda proyectada (conectar con forecasting)

---

## Criterios de Aceptación (Definition of Done)

**P&L:**
- [ ] El P&L mensual concilia con los movimientos reales de Mercado Pago (tolerancia ±1%)
- [ ] Se puede ver el margen por SKU individual
- [ ] La exportación Excel puede ser usada por el contador sin modificaciones manuales

**Ads:**
- [ ] El dashboard muestra ROAS por publicación actualizado diariamente
- [ ] La optimización automática de pujas no hace cambios que excedan el ROAS objetivo en más de 20%
- [ ] Cuando se pausa una campaña automáticamente, se notifica al vendedor con el motivo

**Devoluciones:**
- [ ] El 90%+ de los reclamos se clasifican automáticamente con precisión > 80%
- [ ] Las alertas de patrón solo se disparan con al menos 3 devoluciones (evitar falsos positivos)

**Lanzamiento:**
- [ ] El wizard puede completarse en menos de 10 minutos
- [ ] Las sugerencias de keywords se basan en datos reales de publicaciones competidoras

---

## Notas Técnicas

1. **API de Mercado Ads**: Solicitar acceso al programa de partners de Mercado Ads. Algunos endpoints pueden requerir aprobación especial. Verificar disponibilidad antes de comprometer el timeline.

2. **Latencia de datos de Ads**: Los datos de conversión en MELI tienen latencia de 24-48hs. No mostrar datos del día como definitivos; marcarlos como "preliminares".

3. **Clasificación con IA**: Para mantener costos bajos, clasificar en batch (una vez por día) en lugar de tiempo real. Para el MVP es suficiente.

4. **GDPR/privacidad en reclamos**: Los textos de reclamos contienen datos de compradores. Procesar solo el texto del mensaje, nunca el nombre o datos personales del comprador.
