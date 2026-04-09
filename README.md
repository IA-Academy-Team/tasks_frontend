
# TaskApp Frontend

## Descripción
TaskApp Frontend es la interfaz web del sistema de gestión operativa.  
Permite que administradores y empleados trabajen sobre un mismo flujo de tareas, con experiencia enfocada en:

- Visibilidad del trabajo diario.
- Priorización y seguimiento de ejecución.
- Control de cumplimiento y productividad.

El frontend traduce la lógica del backend en vistas operativas claras para uso real de negocio.

## Funcionalidades principales
- Inicio de sesión y control de acceso por rol.
- Recuperación y restablecimiento de contraseña.
- Dashboard administrativo:
  - KPIs operativos.
  - Distribución por estado.
  - Rendimiento por proyecto.
  - Tablas de tareas pendientes y retrasadas.
- Dashboard de empleado:
  - Resumen personal de carga y horas.
  - Tareas próximas a vencer.
  - Sesión activa y actividad reciente.
- CRUD de áreas, empleados y proyectos (según permisos).
- Vista de proyecto con:
  - Lista, Kanban y analítica de tareas.
  - Detalle/edición de tareas.
  - Modal de finalización con minutos reales y evidencia.
- Vista de tareas (incluye tareas sueltas y asignadas de proyecto según rol).
- Notificaciones en tiempo real con navegación contextual.
- Modo oscuro/claro y diseño basado en tokens.

## Casos de uso
- **Administrador**:
  - Crear y organizar estructura operativa.
  - Asignar, reasignar y controlar ejecución de tareas.
  - Supervisar cumplimiento y detectar atrasos.
- **Empleado**:
  - Ver y ejecutar sus tareas asignadas.
  - Actualizar estados de ejecución.
  - Reportar finalización con tiempo real.
  - Consultar su rendimiento operativo diario/semanal.

## Tecnologías utilizadas
- **Core**: React 18 + TypeScript.
- **Build**: Vite.
- **Styling**: Tailwind CSS + sistema de tokens (`theme.css`).
- **UI**: Radix UI + componentes internos.
- **Charts**: Recharts.
- **Estado de sesión**: Context + providers.
- **Routing**: React Router.
- **Realtime**: Socket.IO client (notificaciones).
- **Calidad**: ESLint + TypeScript type-check + Vitest.

## Instalación y ejecución
### 1) Prerrequisitos
- Node.js 20+
- npm 10+
- Backend de TaskApp corriendo (por defecto en `http://localhost:3004`)

### 2) Configurar entorno
```bash
cd frontend
cp .env.example .env
```

Variables principales:
- `VITE_API_URL_DEV=http://localhost:3004`
- `VITE_API_URL_PROD=https://your-backend-domain.com`
- `VITE_API_URL` (fallback)

### 3) Instalar dependencias
```bash
npm install
```

### 4) Ejecutar en desarrollo
```bash
npm run dev
```

App disponible por defecto en:
- `http://localhost:5173`

### Scripts útiles
- `npm run dev`: servidor local.
- `npm run build`: build de producción.
- `npm run type-check`: validación TypeScript.
- `npm run lint`: lint del código.
- `npm run lint:fix`: corrección automática de lint.
- `npm run test`: pruebas con Vitest.

## Estructura del proyecto
```text
frontend/
├─ src/
│  ├─ app/
│  │  ├─ components/       # componentes UI y de dominio visual
│  │  ├─ context/          # contexto de autenticación
│  │  ├─ guards/           # protección por rol y recurso
│  │  ├─ layouts/          # shells admin/employee/auth
│  │  ├─ pages/            # vistas principales
│  │  ├─ providers/        # providers globales (tema/sesión/auth)
│  │  └─ router/           # definición de rutas
│  ├─ modules/             # módulos por dominio (auth, tasks, projects, etc.)
│  ├─ shared/              # cliente API y utilidades compartidas
│  └─ styles/              # tokens, fuentes y estilos globales
└─ ...
```

## Arquitectura
- Arquitectura modular por dominio (`modules/*`) combinada con una capa de aplicación (`app/*`).
- Separación explícita entre:
  - Presentación (pages/components/layouts).
  - Acceso a datos (apis por módulo).
  - Reglas de navegación y permisos (guards + auth context).
- Cliente HTTP centralizado (`shared/api/api.ts`) con:
  - manejo unificado de errores,
  - soporte de cookies de sesión,
  - toasts homogéneos para feedback de UX.

## Flujo de la aplicación
1. Usuario accede a `/login` e inicia sesión.
2. El sistema obtiene sesión/recursos permitidos y redirige por rol:
   - Admin -> `/app/admin/dashboard`
   - Employee -> `/app/employee/dashboard`
3. `ResourceGuard` habilita o bloquea vistas según recursos permitidos.
4. Cada pantalla consume APIs del backend (`/api/*`) para operar entidades.
5. Notificaciones y eventos de cambios se reflejan en tiempo real en el panel flotante.

## Rutas principales
- `/login`
- `/recuperar-contraseña`
- `/restablecer-contraseña`
- `/app/admin/dashboard`
- `/app/employee/dashboard`
- `/areas`
- `/employees`
- `/projects`
- `/projects/:projectId`
- `/tasks/standalone`

## Consideraciones técnicas
- El frontend usa cookies (`credentials: include`) para sesión segura.
- La URL de API cambia por entorno (`VITE_API_URL_DEV` / `VITE_API_URL_PROD`).
- Los permisos visuales y de navegación están protegidos por rol/recurso.
- El diseño usa tokens para mantener consistencia visual y permitir iteraciones rápidas de tema.

## Estado del proyecto
**MVP avanzado / preproducción**  
La aplicación ya cubre los flujos operativos principales de administración y ejecución de tareas con base técnica lista para despliegues controlados.

## Próximos pasos
- Incrementar tests de UI/integración por flujo crítico.
- Refinar microinteracciones y feedback contextual en formularios complejos.
- Añadir guía de componentes (design documentation) para acelerar contribuciones.
- Medir performance y optimizar carga en vistas con alto volumen de datos.
