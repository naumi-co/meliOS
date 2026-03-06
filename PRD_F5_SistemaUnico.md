# PRD — Fase 5: Sistema Único

> **Dependencias**: Requiere Fases 1–4 completas. Esta fase convierte MeliOps de herramienta de optimización en infraestructura crítica del negocio.
> **Contexto del proyecto**: Ver [`README.md`](./README.md).

---

## Objetivo de la Fase

Eliminar cualquier otro sistema que use el vendedor. Cuando MeliOps gestiona el inventario, emite las facturas y maneja múltiples cuentas, el costo de cambio se vuelve altísimo y el churn cae a casi cero.

Esta fase implica un cambio cualitativo en el producto: deja de ser una herramienta de optimización y se convierte en el **sistema operativo del negocio** de un vendedor de MercadoLibre.

---

## Alcance

### ✅ Incluido en esta fase
- Módulo de inventario propio (stock físico en tiempo real)
- Sincronización bidireccional stock MELI ↔ sistema
- Soporte multi-depósito (depósito propio + MELI Full + sucursales)
- Gestión de órdenes de compra a proveedores
- Facturación electrónica Argentina (AFIP — facturas A y B)
- Facturación México (SAT — CFDI 4.0)
- Facturación masiva en lote
- Portal multi-cuenta para agencias
- Sistema de roles y permisos
- API REST propia para integraciones externas

### ❌ Consideraciones de expansión futura
- Integración con ERPs enterprise (SAP, Oracle)
- Módulo de logística propia con gestión de transportistas
- Marketplace propio (tienda online sincronizada con el stock MELI)
- App mobile nativa para gestión de depósito (picking)

---

## Módulo 5A: Gestión de Inventario

### Problema que resuelve
Los vendedores grandes manejan su stock en planillas de Excel o en sistemas que no están conectados con MELI. El resultado: errores manuales, overselling (vender más de lo que hay), y falta de visibilidad del valor del inventario.

### Modelo de datos

```typescript
// Producto base (independiente de MELI)
interface Product {
  id: string;
  sku: string;           // código interno del vendedor
  meli_item_id?: string; // vinculación con publicación de MELI
  name: string;
  barcode?: string;      // EAN/UPC para identificación
  unit_cost: number;
  supplier_id?: string;
}

// Stock por depósito
interface StockEntry {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;  // vendido pero no enviado
  available_quantity: number; // quantity - reserved
  last_updated: Date;
}

// Depósito
interface Warehouse {
  id: string;
  name: string;
  type: 'own' | 'meli_full' | 'third_party';
  address?: string;
}
```

### Tareas

#### F5-I1 — CRUD de productos e inventario
**Prioridad:** Alta | **Esfuerzo:** Alto

- Alta/edición de productos con SKU propio
- Vinculación producto ↔ publicación de MELI (por item_id o por búsqueda)
- Ajuste manual de stock (con motivo: "inventario inicial", "merma", "diferencia de inventario")
- Historial de movimientos por producto

#### F5-I2 — Sincronización MELI ↔ inventario propio
**Prioridad:** Alta | **Esfuerzo:** Alto

Flujo de sincronización:
1. **Venta en MELI** → descontar de stock disponible en el sistema
2. **Devolución en MELI** → reponer stock (configurable: reponer automáticamente o con confirmación manual)
3. **Actualización de stock en el sistema** → actualizar `available_quantity` en la publicación de MELI vía API

```
POST /items/{item_id}
Body: { "available_quantity": nuevo_stock }
```

Manejo de conflictos: si el stock en MELI y en el sistema difieren, alertar al vendedor para que corrija manualmente.

#### F5-I3 — Multi-depósito
**Prioridad:** Media | **Esfuerzo:** Alto

- Registrar stock en múltiples ubicaciones
- Para MELI Full: consultar stock disponible vía `GET /fulfillment/stock/items`
- Vista consolidada: stock total = propio + Full + otros
- Al vender en MELI: descontar del depósito correspondiente (configurable: primero propio, primero Full, o regla personalizada)

#### F5-I4 — Órdenes de compra a proveedores
**Prioridad:** Media | **Esfuerzo:** Alto

- Registrar proveedores con datos de contacto y términos de pago
- Crear orden de compra: proveedor + lista de productos + cantidades + precio pactado
- Estados: borrador → enviada → confirmada → recibida parcialmente → recibida completa
- Al marcar como "recibida": incrementar stock automáticamente
- Historial de compras por proveedor (útil para negociar condiciones)

#### F5-I5 — Reportes de inventario
**Prioridad:** Media | **Esfuerzo:** Bajo

- **Valorización de inventario**: stock actual × costo unitario por producto y total
- **Rotación de inventario**: días promedio que un producto está en depósito antes de venderse
- **Productos sin movimiento** (+60 días sin venta): candidatos para liquidar o pausar publicación

---

## Módulo 5B: Facturación Electrónica

### Consideraciones generales

La facturación electrónica en Argentina y México tiene requisitos técnicos específicos y debe cumplir con normativas fiscales. Es crítico validar con contadores locales antes de lanzar.

**Importante**: Este módulo debe desarrollarse con asistencia de un profesional contable en cada país. Las reglas cambian frecuentemente y un error puede generar multas.

### Argentina — AFIP

#### F5-F1 — Integración con AFIP (wsfe)
**Prioridad:** Alta | **Esfuerzo:** Alto

AFIP ofrece dos webservices relevantes:
- **WSAA**: autenticación (obtener tokens)
- **WSFE**: facturación electrónica (emitir facturas)

Flujo de autenticación AFIP:
```
1. Generar certificado digital (el vendedor debe tramitarlo en AFIP)
2. Firmar un XML de login con el certificado
3. Llamar a WSAA para obtener un token temporario (24hs)
4. Usar el token para llamar a WSFE
```

Tipos de comprobante a soportar:
- **Factura A**: para responsables inscriptos (empresas con IVA)
- **Factura B**: para consumidores finales y monotributistas
- **Nota de crédito A/B**: para devoluciones/anulaciones

Campos requeridos por AFIP:
- CUIT del emisor (el vendedor)
- CUIT del receptor (o "Consumidor Final" si no tiene)
- Detalle de ítems con descripción, cantidad, precio unitario, IVA
- Condición de IVA del emisor y receptor
- Punto de venta (configurado en AFIP)

#### F5-F2 — Mapeo de órdenes MELI a facturas
**Prioridad:** Alta | **Esfuerzo:** Medio

Por cada orden de MELI:
1. Obtener datos del comprador: nombre, CUIT/DNI (si lo proporcionó), dirección
2. Determinar tipo de factura: A (si tiene CUIT de empresa) o B (resto)
3. Pre-completar el formulario de factura con los datos de la orden
4. El vendedor revisa y confirma (o activa facturación automática)

MercadoLibre puede proveer el CUIT del comprador si lo registró. Si no, emitir factura B a consumidor final.

#### F5-F3 — Facturación masiva
**Prioridad:** Alta | **Esfuerzo:** Medio

- Vista de "órdenes pendientes de facturar" (todas las ventas del período sin factura emitida)
- Selección masiva: "facturar todas las órdenes de hoy"
- Regla automática: si el comprador no tiene CUIT registrado → automáticamente factura B a consumidor final
- Procesamiento en batch: emitir N facturas en background, notificar al terminar
- PDF de cada factura disponible para descarga

### México — SAT (CFDI 4.0)

#### F5-F4 — Integración con PAC (Proveedor Autorizado de Certificación)
**Prioridad:** Alta | **Esfuerzo:** Alto

En México, las facturas electrónicas (CFDI) deben ser timbradas por un **PAC** autorizado por el SAT. MeliOps actúa como intermediario entre el vendedor y el PAC.

PACs recomendados para integrar: Finkok, SW SapienTec, o similar (verificar disponibilidad de API REST).

Flujo:
```
1. Vendedor registra su RFC y certificado CSD (obtiene en SAT)
2. MeliOps construye el XML del CFDI con los datos de la venta
3. Enviar al PAC para timbrado (obtener UUID y sello del SAT)
4. El CFDI timbrado es la factura válida legalmente
5. Enviar PDF + XML al comprador (obligatorio)
```

Versión requerida: CFDI 4.0 (vigente desde 2022).

#### F5-F5 — Complemento de carta porte (si aplica)
**Prioridad:** Baja | **Esfuerzo:** Alto

Para ventas donde el vendedor gestiona el transporte (no Envíos MELI), puede requerirse el complemento de Carta Porte. Evaluar si es necesario según el perfil de los clientes de MeliOps en México.

---

## Módulo 5C: Multi-cuenta y Equipos

### Problema que resuelve
Hay dos casos de uso:
1. **Agencias de MercadoLibre**: empresas que manejan las cuentas MELI de múltiples clientes
2. **Vendedores grandes con equipo**: el dueño, un operador de stock, y un contador, cada uno con acceso a lo que necesita

### Tareas

#### F5-T1 — Portal multi-cuenta
**Prioridad:** Alta | **Esfuerzo:** Alto

- Un usuario de MeliOps puede vincular N cuentas de MercadoLibre
- Vista "todas las cuentas": dashboard consolidado con KPIs sumados
- Cambiar entre cuentas con un click (sin cerrar sesión)
- Cada cuenta tiene su propia configuración de repricing, alertas, etc.

Para agencias:
- El owner de la agencia puede invitar a clientes a vincular sus cuentas
- El cliente autoriza el acceso con un click (OAuth de MELI)
- La agencia gestiona la cuenta pero el cliente puede revocar el acceso en cualquier momento

#### F5-T2 — Roles y permisos
**Prioridad:** Media | **Esfuerzo:** Medio

Roles predefinidos:

| Rol | Acceso |
|-----|--------|
| Admin | Todo: configuración, repricing, facturas, cuentas |
| Operador | Ver dashboard, gestionar stock, ver alertas. Sin acceso a finanzas ni configuración de repricing |
| Contador | Solo módulo financiero: P&L, facturas, exportaciones. Sin acceso a repricing ni competidores |
| Viewer | Solo lectura de dashboard y reportes. Sin acciones |

El Admin puede crear roles personalizados combinando permisos granulares.

#### F5-T3 — Auditoría de acciones
**Prioridad:** Baja | **Esfuerzo:** Bajo

Log de auditoría: quién hizo qué y cuándo. Importante para agencias y para negocios con múltiples operadores.
```
2025-06-15 14:32 | carlos@empresa.com | Cambio manual de precio | Auriculares XM4 | $89.999 → $95.000
2025-06-15 09:15 | sistema (repricing) | Cambio automático de precio | Mouse Logitech | $23.400 → $24.900
```

---

## Módulo 5D: API Propia para Integraciones

### Para quién es
Vendedores grandes que ya usan un ERP (SAP, Odoo, Dynamics) y quieren que MeliOps sea el hub de conexión con MELI, sin tener que construir su propia integración.

### Tareas

#### F5-A1 — REST API documentada
**Prioridad:** Baja | **Esfuerzo:** Alto

Endpoints mínimos a exponer:
```
GET  /api/v1/items              → listado de publicaciones con márgenes
GET  /api/v1/items/{id}         → detalle de una publicación
POST /api/v1/items/{id}/price   → actualizar precio (pasa por el motor de repricing)
GET  /api/v1/stock              → inventario actual
POST /api/v1/stock/adjust       → ajustar stock manualmente
GET  /api/v1/orders             → ventas (con filtros de fecha)
GET  /api/v1/analytics/pl       → P&L del período
```

Autenticación: API Key por cuenta. Documentación en formato OpenAPI/Swagger.

#### F5-A2 — Webhooks
**Prioridad:** Baja | **Esfuerzo:** Medio

Notificaciones en tiempo real para sistemas externos:
- `order.created`: nueva venta
- `stock.low`: alerta de stock bajo
- `price.changed`: precio cambiado por el repricing
- `alert.triggered`: alerta de competidor

---

## Modelo de Precios para Fase 5

| Plan | Precio | Cuentas MELI | Usuarios | Facturación |
|------|--------|--------------|----------|-------------|
| Business | USD 200/mes | 1 | 3 | No |
| Enterprise | USD 400/mes | 3 | 10 | Sí (AR o MX) |
| Agency | USD 800/mes | 10 | Ilimitado | Sí (ambos países) |
| Enterprise+ | Custom | Ilimitado | Ilimitado | Sí + API propia |

---

## Criterios de Aceptación (Definition of Done)

**Inventario:**
- [ ] El stock en MeliOps y en MELI siempre coinciden (diferencia máxima: 1 unidad por condición de race condition)
- [ ] Cada venta descuenta automáticamente del stock en menos de 2 minutos
- [ ] La valorización del inventario concilia con el P&L de la Fase 4

**Facturación Argentina:**
- [ ] Las facturas generadas son aceptadas por AFIP (código de CAE obtenido)
- [ ] La facturación masiva puede procesar 100 facturas en menos de 5 minutos
- [ ] El PDF generado cumple con los requisitos visuales de AFIP

**Facturación México:**
- [ ] Los CFDI generados son timbrados correctamente por el PAC
- [ ] El XML del CFDI cumple con el esquema XSD del SAT versión 4.0

**Multi-cuenta:**
- [ ] Un usuario puede gestionar 10 cuentas de MELI simultáneamente sin degradación de performance
- [ ] Los permisos de roles se aplican correctamente (un Contador no puede ver el módulo de competidores)

---

## Consideraciones Técnicas Críticas

1. **Facturación es regulación, no solo features**: Antes de lanzar cualquier módulo de facturación, validar el flujo completo con un contador matriculado en el país correspondiente. Un error en la estructura del CFDI o en los campos de AFIP puede generar problemas legales para el vendedor.

2. **Manejo de stock en tiempo real**: El mayor riesgo es el overselling (vender más de lo que hay). Usar transacciones de base de datos (ACID) para decrementar stock. Nunca confiar en lecturas de stock sin lock cuando se está procesando una venta.

3. **Arquitectura multi-tenant desde el inicio**: Desde la Fase 1 asegurarse de que todos los datos están correctamente aislados por `account_id`. La Fase 5 hace esto crítico porque múltiples cuentas corren en la misma infraestructura.

4. **Backup y recuperación**: Los datos de stock e inventario son críticos para el negocio del vendedor. Definir política de backup (mínimo: backup diario con retención de 30 días, restore probado mensualmente).

5. **Compliance fiscal**: Las regulaciones de AFIP y SAT cambian. Diseñar el módulo de facturación como un plugin intercambiable, no acoplado al core del producto. Así, cuando cambien las reglas (por ej., nuevas versiones de CFDI), se puede actualizar sin afectar el resto.
