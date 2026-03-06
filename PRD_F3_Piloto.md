# PRD — Fase 3: El Piloto Automático

> **Dependencias**: Requiere Fase 1 (márgenes) y Fase 2 (datos de competidores) completas y activas.
> **Contexto del proyecto**: Ver [`README.md`](./README.md).

---

## Objetivo de la Fase

Automatizar las decisiones de precio y anticipar los quiebres de stock, para que el vendedor maximize sus ganancias **sin intervención manual**, 24/7.

Esta es la fase de mayor valor percibido del producto. El repricing no se trata solo de bajar precios para ganar el Buy Box: **la decisión más valiosa es subir el precio cuando la competencia se debilita**. La mayoría de los vendedores deja dinero sobre la mesa porque no están mirando la pantalla cuando un competidor se queda sin stock a las 2am.

El forecasting de stock resuelve el otro gran dolor: quedarse sin stock en un producto que vendía bien destruye el posicionamiento algorítmico de MELI (el algoritmo penaliza las publicaciones que se interrumpen) y puede tardar semanas en recuperarse.

---

## Alcance

### ✅ Incluido en esta fase
- Motor de repricing con 3 estrategias (agresivo / balanceado / conservador)
- Reglas configurables: precio mínimo, precio máximo, margen mínimo
- Lógica de subida de precio cuando competidor queda sin stock
- Lógica de bajada controlada respetando margen mínimo
- Log completo de decisiones con motivo explicado
- Modo dry-run (simulación sin ejecutar cambios)
- Forecasting de demanda por SKU
- Alertas de reposición con días estimados de stock
- Dashboard integrado de repricing + stock

### ❌ Fuera de alcance
- Optimización de campañas de Ads (Fase 4)
- Repricing basado en análisis de keywords o SEO
- Integración con proveedores para órdenes de compra automáticas (Fase 5)

---

## Nuevo Scope OAuth Requerido

En la Fase 3 se necesita escribir en la API de MELI (no solo leer). Al conectar la cuenta, solicitar el scope `write` además de `read` y `offline_access`.

Si el usuario ya conectó su cuenta en la Fase 1/2, mostrar un flujo de re-autorización para agregar el scope de escritura. Dejar muy claro que solo se usará para actualizar precios.

---

## Lógica del Motor de Repricing

### Las tres estrategias

**Agresivo**: Ganar el Buy Box a cualquier precio dentro del margen mínimo.
- Si hay alguien más barato con stock: igualar o bajar $1 por debajo
- Si el competidor más barato se queda sin stock: subir hasta el segundo competidor más barato menos $1
- Si no hay competidores con stock: subir hasta el precio máximo configurado

**Balanceado** (recomendado por defecto): Equilibrar Buy Box y margen.
- Bajar precio solo si se perdió el Buy Box por más de 30 minutos
- Subir precio gradualmente cuando la competencia se debilita (no saltar al máximo de golpe)
- Respetar siempre el margen mínimo

**Conservador**: Proteger el margen, ceder el Buy Box si es necesario.
- Nunca bajar del precio mínimo configurado
- Subir precio cuando hay oportunidad
- Aceptar perder el Buy Box temporalmente si mantener el precio protege el margen

### Reglas que nunca se violan (invariantes)
1. **Nunca bajar del `precio_minimo`** — calculado como: `costo_producto / (1 - margen_minimo_pct)`
2. **Nunca superar el `precio_maximo`** — configurado por el vendedor
3. **Respetar el rate limit de la API**: máximo 1 cambio de precio por publicación cada 5 minutos
4. **No cambiar precio si está en modo pausa** para esa publicación

### Pseudocódigo del algoritmo principal

```
función repreciar(publicacion):
  si publicacion.en_pausa: return

  competidores = obtener_competidores_con_stock(publicacion)
  precio_actual = publicacion.precio
  
  si competidores está vacío:
    // No hay competencia con stock — subir al máximo
    nuevo_precio = publicacion.precio_maximo
    motivo = "Sin competidores con stock disponible"
  
  sino:
    mejor_competidor = competidores.ordenar_por_precio().primero()
    
    si estrategia == AGRESIVO:
      nuevo_precio = mejor_competidor.precio - 1
      motivo = "Estrategia agresiva: igualando al competidor más barato"
    
    si estrategia == BALANCEADO:
      si publicacion.tiene_buy_box:
        // ¿Podemos subir sin perderlo?
        segundo_competidor = competidores[1]
        si segundo_competidor y precio_actual < segundo_competidor.precio - 100:
          nuevo_precio = min(precio_actual + 500, segundo_competidor.precio - 1)
          motivo = "Subida gradual: hay margen vs segundo competidor"
        sino:
          nuevo_precio = precio_actual  // mantener
      sino:
        nuevo_precio = mejor_competidor.precio - 1
        motivo = "Bajada para recuperar Buy Box"
    
    si estrategia == CONSERVADOR:
      si publicacion.tiene_buy_box:
        nuevo_precio = precio_actual  // no tocar
      sino si mejor_competidor.precio > publicacion.precio_minimo:
        nuevo_precio = mejor_competidor.precio - 1
  
  nuevo_precio = clamp(nuevo_precio, precio_minimo, precio_maximo)
  
  si nuevo_precio != precio_actual:
    ejecutar_cambio_de_precio(publicacion, nuevo_precio, motivo)
    guardar_en_log(publicacion, precio_actual, nuevo_precio, motivo)
```

---

## Diseño de la UI

### Panel de repricing por publicación
```
┌──────────────────────────────────────────────────────────────┐
│  ⚡ Repricing — Auriculares Bluetooth XM4                    │
│  Estado: ACTIVO 🟢          [Pausar]  [Configurar]           │
├──────────────────┬───────────────────────────────────────────┤
│  Estrategia      │  [ Agresivo ]  [● Balanceado]  [Conserv.] │
│  Precio mínimo   │  $82.400  (margen 10% sobre costo)        │
│  Precio máximo   │  $99.000                                  │
│  Precio actual   │  $92.500  ▲ (subió $2.501 hace 12 min)   │
│  Buy Box         │  ✅ TU PUBLICACIÓN tiene el Buy Box        │
└──────────────────┴───────────────────────────────────────────┘

📋 Log de decisiones — últimas 24hs
────────────────────────────────────────────────────────────
14:32  $89.999 → $92.500  ↑  ElectroMax sin stock (0 u.)
11:15  $91.000 → $89.999  ↓  TecnoStore bajó a $90.500, perdiste Buy Box 45 min
08:00  Sin cambios           Todos los competidores mantienen precio
```

### Dashboard de forecasting de stock
```
┌──────────────────────────────────────────────────────────────┐
│  📦 Stock — Alertas de reposición                            │
├────────────────────────┬────────┬────────────┬──────────────┤
│  Producto              │ Stock  │ Vel./día   │ Se agota en  │
├────────────────────────┼────────┼────────────┼──────────────┤
│  Auriculares XM4       │  142u  │  4.2/día   │  ~34 días 🟢 │
│  Mouse Logitech        │   12u  │  3.8/día   │  ~3 días  🔴 │
│  Cable HDMI 2.0        │   89u  │  1.1/día   │  ~81 días 🟢 │
│  Teclado Mecánico      │   23u  │  2.9/día   │  ~8 días  🟡 │
└────────────────────────┴────────┴────────────┴──────────────┘
```

---

## Tareas de Desarrollo

### F3-01 — Motor de reglas de repricing
**Prioridad:** Alta | **Esfuerzo:** Alto

Construir el core engine que toma decisiones de precio.

```typescript
interface RepricingConfig {
  item_id: string;
  strategy: 'aggressive' | 'balanced' | 'conservative';
  min_price: number;         // calculado o ingresado por el vendedor
  max_price: number;
  min_margin_pct: number;    // porcentaje mínimo de margen a respetar
  enabled: boolean;
  dry_run: boolean;          // si true, calcular pero no ejecutar
}
```

El motor se ejecuta como parte del job periódico de 15 minutos, después de actualizar los datos de competidores.

---

### F3-02 — Algoritmo de detección del Buy Box
**Prioridad:** Alta | **Esfuerzo:** Alto

Determinar quién tiene el Buy Box en cada publicación de catálogo.

MELI no expone directamente quién tiene el Buy Box vía API pública, pero se puede inferir:
- El vendedor con el precio más bajo entre los que tienen stock **y** buena reputación suele ganar el Buy Box
- Consultar la publicación de catálogo directamente y ver qué vendedor aparece primero

```
GET /products/{catalog_product_id}
→ buy_box_winner.item_id  (si existe este campo)
→ comparar con nuestro item_id
```

Alternativamente, asumir que el vendedor más barato con stock y reputación > 90% tiene el Buy Box (aproximación suficientemente buena para el MVP).

---

### F3-03 — Ejecución de cambios de precio vía API
**Prioridad:** Alta | **Esfuerzo:** Alto

```
PUT /items/{item_id}
Body: { "price": 92500 }
Headers: Authorization: Bearer {access_token}
```

Consideraciones:
- MELI puede rechazar cambios de precio si el nuevo precio está muy lejos del precio de referencia del catálogo (para evitar precios abusivos). Manejar este error gracefully.
- Rate limiting: no más de 1 cambio por ítem cada 5 minutos para no parecer bot
- Si el cambio falla: loguear el error, reintentar 1 vez después de 2 minutos, alertar al vendedor si falla 3 veces seguidas
- Actualizar el precio en nuestra base de datos después de confirmar el cambio en MELI

---

### F3-04 — Lógica de subida de precio (oportunidad)
**Prioridad:** Alta | **Esfuerzo:** Medio

Trigger más valioso del sistema. Cuando el competidor principal queda sin stock:

1. Detectar que `available_quantity == 0` para el competidor con menor precio
2. Calcular cuál sería el siguiente precio competitivo (segundo competidor)
3. Subir precio al segundo competidor menos $1 (balanceado) o directo al máximo (agresivo)
4. Monitorear: si el competidor sin stock vuelve a tener, ajustar nuevamente

Incluir un "delay de confirmación": si un competidor aparece con 0 stock pero vuelve a tener en 5 minutos (error de API o restock instantáneo), no subir precio todavía. Esperar 2 ciclos consecutivos con 0 stock antes de actuar.

---

### F3-05 — Lógica de bajada controlada
**Prioridad:** Alta | **Esfuerzo:** Medio

Cuando se pierde el Buy Box:
1. Verificar que el nuevo precio mínimo necesario respeta el `precio_minimo` configurado
2. Si el precio del competidor está por debajo de nuestro `precio_minimo`: **no bajar**. Loguear: "No se puede competir sin violar margen mínimo"
3. Si se puede competir: bajar al precio del competidor menos $1

Importante: no bajar precio por bajar. Solo bajar si se perdió el Buy Box y hay posibilidad de recuperarlo sin violar el margen mínimo.

---

### F3-06 — Log de decisiones
**Prioridad:** Alta | **Esfuerzo:** Medio

Cada cambio de precio (o decisión de no cambiar) se registra con:

```typescript
interface PricingDecision {
  item_id: string;
  timestamp: Date;
  price_before: number;
  price_after: number;
  changed: boolean;
  reason: string;          // descripción legible en español
  trigger: string;         // 'competitor_out_of_stock' | 'lost_buy_box' | etc.
  competitor_involved?: {
    seller_id: string;
    seller_name: string;
    price: number;
    stock: number;
  };
  dry_run: boolean;
}
```

Mostrar en UI: tabla paginada con los últimos 100 eventos, filtrable por publicación y por tipo de trigger.

---

### F3-07 — Pausa y reanudación del repricing
**Prioridad:** Media | **Esfuerzo:** Bajo

El vendedor puede pausar el repricing:
- Para una publicación específica
- Para todas las publicaciones (pausa global)
- Con un tiempo de pausa automático (ej: "pausar 4 horas" durante eventos especiales donde quiere manejar precios manualmente)

Estado visible en el dashboard: "Repricing PAUSADO — se reanuda en 2hs 30min" o "Repricing ACTIVO".

---

### F3-08 — Forecasting de demanda por SKU
**Prioridad:** Alta | **Esfuerzo:** Alto

Calcular para cada publicación:
1. **Velocidad de ventas** promedio: unidades/día (últimos 7, 14 y 30 días)
2. **Ajuste por estacionalidad**: comparar con el mismo período del año anterior
3. **Ajuste por tendencia**: ¿está acelerando o desacelerando?
4. **Días de stock restantes**: `stock_actual / velocidad_promedio`

Modelo simple para MVP (mejorar con ML en versiones posteriores):

```
velocidad_7d = ventas_últimas_7_días / 7
velocidad_30d = ventas_últimas_30_días / 30

velocidad_proyectada = velocidad_7d * 0.6 + velocidad_30d * 0.4
// Pesar más los últimos 7 días para capturar tendencias recientes

días_de_stock = stock_actual / velocidad_proyectada
```

Para eventos especiales (Hot Sale, Navidad), aplicar multiplicador según la categoría. Usar historial del año anterior si está disponible.

---

### F3-09 — Alertas de reposición
**Prioridad:** Alta | **Esfuerzo:** Medio

Thresholds configurables por el vendedor (defaults sugeridos):

| Color | Días de stock | Acción recomendada |
|-------|---------------|--------------------|
| 🟢 Verde | > 20 días | Sin urgencia |
| 🟡 Amarillo | 8–20 días | Planificar reposición |
| 🔴 Rojo | < 8 días | Reponer urgente |

Notificación:
- Email inmediato cuando pasa de verde a amarillo
- Email diario con resumen de todos los ítems en amarillo y rojo
- Alerta crítica en-app cuando baja a < 3 días

---

### F3-10 — Dashboard de forecasting
**Prioridad:** Alta | **Esfuerzo:** Medio

Tabla con todas las publicaciones del vendedor mostrando:
- Nombre del producto
- Stock actual
- Velocidad de ventas (unidades/día)
- Días de stock estimados
- Semáforo (🟢🟡🔴)
- Fecha estimada de agotamiento (ej: "se agota el 15 de julio")
- Botón "Marcar como repuesto" para resetear la alerta

Ordenar por defecto: los más urgentes (menor días de stock) primero.

---

### F3-11 — Calendario de eventos MELI
**Prioridad:** Media | **Esfuerzo:** Medio

Mantener un calendario de eventos de alta demanda que ajusta el forecasting:
- Hot Sale (mayo)
- Cyber Monday (noviembre)
- Navidad / Año Nuevo
- Día del Padre / Madre / Niño
- Semana de la Electrónica, etc.

Durante eventos: multiplicar la velocidad de ventas proyectada por un factor (configurable, default: 3x para Hot Sale) para anticipar el aumento de demanda y evitar quiebres de stock justo cuando más se vende.

---

### F3-12 — Modo dry-run (simulación)
**Prioridad:** Alta | **Esfuerzo:** Medio

Antes de activar el repricing real, el vendedor puede correr el motor en modo simulación:
- El algoritmo corre normalmente pero **no ejecuta cambios en MELI**
- Muestra en tiempo real qué precio habría cambiado y por qué
- Después de 24–48hs en dry-run, el vendedor tiene suficiente información para decidir si activar

UI: banner amarillo en el dashboard cuando el modo dry-run está activo: "Simulación activa — el repricing calcula pero NO cambia precios en MELI. [Activar repricing real]"

---

## Criterios de Aceptación (Definition of Done)

- [ ] El motor de repricing cambia precios automáticamente en MELI sin intervención manual
- [ ] Cuando un competidor principal llega a 0 stock, el precio sube en el siguiente ciclo de 15 minutos
- [ ] El precio nunca baja por debajo del `precio_minimo` configurado, bajo ninguna circunstancia
- [ ] El log muestra cada decisión con su motivo en lenguaje claro y legible
- [ ] El modo dry-run muestra exactamente qué haría el algoritmo sin ejecutar cambios
- [ ] El forecasting tiene un error de predicción < 20% comparado con ventas reales en la semana siguiente
- [ ] Las alertas de reposición se disparan con al menos 8 días de anticipación por defecto

---

## Consideraciones Técnicas

1. **Concurrencia**: Si hay múltiples vendedores usando MeliOps simultáneamente, los jobs de repricing deben estar aislados por cuenta. No mezclar tokens de diferentes usuarios.

2. **Idempotencia del repricing**: Si el job falla a mitad de ejecución, debe poder correr nuevamente sin aplicar cambios duplicados.

3. **Logging para debugging**: Guardar suficiente contexto en cada decisión para poder reproducir por qué el algoritmo decidió lo que decidió (precio del competidor en ese momento, stock, etc.).

4. **Comunicar al usuario las limitaciones**: Si MELI rechaza un cambio de precio (por estar fuera del rango del catálogo), mostrarlo claramente en el log con explicación, no silenciarlo.

5. **Primer precio mínimo**: Cuando el usuario no ha ingresado su costo de producto, no se puede calcular el `precio_minimo` automáticamente. En ese caso, requerir que el usuario defina un precio mínimo manual antes de activar el repricing para ese ítem.
