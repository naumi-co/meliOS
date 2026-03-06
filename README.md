# MeliOps — Plataforma de Optimización para Vendedores de MercadoLibre

## Visión del Proyecto

MeliOps es una plataforma SaaS B2B cuyo objetivo es convertirse en el **sistema operativo único** que necesita un vendedor serio de MercadoLibre.

El problema central: los vendedores medianos y grandes de MELI operan a ciegas. No saben su margen real por publicación, no monitorean a sus competidores sistemáticamente, pierden el Buy Box sin darse cuenta, se quedan sin stock en sus mejores productos y dejan dinero sobre la mesa cuando la competencia se debilita.

El ecosistema de herramientas para vendedores de MercadoLibre está **años atrás** del de Amazon, donde existen decenas de herramientas maduras (Helium 10, Jungle Scout, Seller Snap, BQool, etc.). Esa brecha es la oportunidad.

---

## Cliente Ideal (ICP)

- Vendedor de MercadoLibre con **50+ SKUs activos**
- Stock propio (no dropshipping)
- Ventas mensuales de **USD 3.000 en adelante**
- Opera en Argentina, México o Brasil
- Ya es Mercado Líder o está cerca de serlo
- Vende en publicaciones de **catálogo** (compite contra otros vendedores en la misma publicación)

---

## Propuesta de Valor

1. **Margen neto real** — Saber exactamente cuánto se gana por producto después de comisiones MELI, envío, cuotas e impuestos
2. **Repricing dinámico** — Ajustar precios automáticamente 24/7: bajar para ganar Buy Box, subir cuando la competencia se debilita
3. **Inteligencia competitiva** — Monitor en tiempo real de precios, stock y reputación de competidores
4. **Forecasting de stock** — Predecir cuándo se agota cada SKU y alertar para reposición a tiempo
5. **Suite completa** — En fases avanzadas: gestión de Ads, P&L por producto, control de inventario y facturación electrónica

---

## Roadmap de Alto Nivel

El producto se construye en **5 fases incrementales**. Cada fase entrega valor independiente y financia la siguiente.

| Fase | Nombre | Timeline | Propuesta de valor |
|------|--------|----------|--------------------|
| F1 | La Radiografía | Semanas 1–3 | Dashboard de margen neto real por publicación |
| F2 | El Radar | Semanas 4–7 | Monitor de competidores + alertas en tiempo real |
| F3 | El Piloto Automático | Semanas 8–14 | Repricing dinámico + forecasting de stock |
| F4 | El Cerebro | Semanas 15–24 | Ads, devoluciones, lanzamientos, P&L financiero |
| F5 | Sistema Único | Mes 6+ | Stock integrado + facturación + multi-cuenta |

Cada fase tiene su propio PRD con tareas detalladas:
- [`PRD_F1_Radiografia.md`](./PRD_F1_Radiografia.md)
- [`PRD_F2_Radar.md`](./PRD_F2_Radar.md)
- [`PRD_F3_Piloto.md`](./PRD_F3_Piloto.md)
- [`PRD_F4_Cerebro.md`](./PRD_F4_Cerebro.md)
- [`PRD_F5_SistemaUnico.md`](./PRD_F5_SistemaUnico.md)

---

## Stack Tecnológico Sugerido

> Estas decisiones son orientativas. Ajustar según preferencia del equipo.

**Backend**
- Node.js + TypeScript (o Python/FastAPI)
- PostgreSQL — datos transaccionales (publicaciones, ventas, márgenes)
- Redis — caché de precios y jobs de repricing
- BullMQ (o similar) — cola de tareas para sincronización periódica con MELI API

**Frontend**
- React + TypeScript
- Tailwind CSS
- Recharts o Chart.js para gráficos de precios e historial

**Infraestructura**
- Docker + docker-compose para desarrollo local
- Railway / Render / AWS para producción
- Cron jobs para sincronización cada 15 minutos

**Integraciones externas**
- MercadoLibre API (OAuth 2.0, REST)
- AFIP (facturación Argentina) — Fase 5
- SAT/CFDI (facturación México) — Fase 5

---

## Integración con MercadoLibre API

### Autenticación
MercadoLibre usa OAuth 2.0. El flujo es:
1. El usuario hace click en "Conectar cuenta MELI"
2. Redirige a `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=...`
3. MELI devuelve un `code` al callback
4. Se intercambia el `code` por `access_token` + `refresh_token`
5. El `access_token` dura 6 horas; usar `refresh_token` para renovar

### Endpoints clave (Fase 1 y 2)
```
GET /users/me                          → datos del usuario autenticado
GET /users/{user_id}/items/search      → listar todas las publicaciones
GET /items/{item_id}                   → detalle de una publicación (precio, stock, etc.)
GET /orders/search?seller={id}         → historial de ventas
GET /items/{item_id}/shipping_options  → opciones y costo de envío
GET /categories/{category_id}/fees     → comisiones por categoría
POST /items/{item_id}                  → actualizar precio (para repricing)
```

### Rate limits
- 600 requests por minuto por `access_token`
- Diseñar el sistema con colas y backoff exponencial
- Para catálogos grandes, usar paginación y procesamiento en batch

---

## Modelo de Negocio

| Plan | Precio | Incluye |
|------|--------|---------|
| Starter | USD 15/mes | Fase 1 (margen neto) — hasta 100 SKUs |
| Pro | USD 80/mes | Fases 1+2+3 (repricing + radar) — hasta 500 SKUs |
| Business | USD 200/mes | Fases 1+2+3+4 (suite completa) — SKUs ilimitados |
| Enterprise | USD 400+/mes | Fase 5 + multi-cuenta + facturación + API propia |

---

## Principios de Diseño del Producto

1. **Valor inmediato** — El vendedor tiene que ver algo útil en los primeros 5 minutos de uso
2. **Transparencia** — El sistema siempre explica por qué hizo lo que hizo (especialmente en repricing)
3. **Control humano** — El vendedor puede pausar cualquier automatización en cualquier momento
4. **Mobile-friendly** — Muchos vendedores gestionan desde el celular
5. **Margen neto como norte** — Todas las decisiones del sistema optimizan el margen neto, nunca solo el precio o el volumen de forma aislada

---

## Métricas de Éxito

- **Activación**: % de usuarios que completan la conexión OAuth y ven su primer dashboard en la sesión 1
- **Aha moment**: % de usuarios que descubren al menos 1 publicación en rojo en la primera semana
- **Retención M1**: % de usuarios activos al mes de haberse registrado
- **Expansión**: % de usuarios que suben de plan en los primeros 90 días
- **NPS**: objetivo > 50 desde el primer mes
