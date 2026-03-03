# Documento de Requerimientos – Tasks

## 1. Descripción General

**Tasks** es una aplicación web de gestión de proyectos y tareas basada en tableros tipo Kanban. Permite crear proyectos, organizar tareas por columnas editables, asignarlas a personas o grupos y visualizar el progreso de forma clara y centralizada.

El sistema contará con un **sidebar lateral** como eje principal de navegación.

---

## 2. Estructura de Navegación (Sidebar)

El sidebar lateral contendrá las siguientes opciones:

1. **Agregar Proyecto**
2. **Proyectos** (desplegable)
3. **Grupos**

El sidebar debe estar siempre visible y permitir una navegación rápida entre vistas.

---

## 3. Vista: Agregar Proyecto

### 3.1 Creación del Proyecto

Al seleccionar **Agregar Proyecto**, el sistema debe mostrar un formulario con los siguientes campos:

* **Nombre del proyecto** (campo de texto obligatorio)

### 3.2 Asignación de Usuarios y Grupos

Una vez ingresado el nombre del proyecto:

* Se mostrará una **barra de búsqueda** para agregar participantes al proyecto.
* La búsqueda permitirá:

  * Buscar **usuarios por nombre**.
  * Buscar y agregar **grupos completos**.
* Los usuarios o grupos seleccionados quedarán asociados al proyecto.

### 3.3 Tablero del Proyecto

Después de crear el proyecto, se mostrará el tablero Kanban con las siguientes características:

#### Columnas por defecto

* Asignada
* En proceso
* En revisión
* Producción

#### Reglas de columnas

* El **nombre de las columnas debe ser editable**.
* Cada columna será un contenedor visual (div) para las tareas.

#### Creación de tareas

* Cada columna tendrá un botón o ícono **“+”**.
* Al hacer clic en el botón “+”, se abrirá un **modal** para crear una tarea.

#### Modal de creación de tarea

El modal debe incluir los siguientes campos:

* **Descripción de la tarea** (campo de texto)
* **Fecha de inicio** (selector de fecha)
* **Fecha de fin** (selector de fecha)
* **Asignar a** (selector de usuario perteneciente al proyecto)

Al guardar, la tarea aparecerá en la columna correspondiente.

---

## 4. Vista: Proyectos

### 4.1 Listado de Proyectos

En la opción **Proyectos** del sidebar:

* Se mostrará una lista de todos los proyectos creados.
* Cada proyecto será seleccionable.

### 4.2 Visualización de un Proyecto

Al hacer clic sobre un proyecto:

* Se cargará el **tablero Kanban** correspondiente a ese proyecto.
* Se mostrarán:

  * Las columnas configuradas para el proyecto.
  * Las tareas asociadas a cada columna.

El usuario podrá:

* Mover tareas entre columnas.
* Crear nuevas tareas.
* Visualizar fechas y responsables.

---

## 5. Vista: Grupos

### 5.1 Creación de Grupo

Al seleccionar **Grupos**:

* Se mostrará un formulario para crear un nuevo grupo.

Campos requeridos:

* **Nombre del grupo** (campo de texto obligatorio)

### 5.2 Asignación de Personas al Grupo

Después de ingresar el nombre del grupo:

* Se mostrará un **buscador de personas**.
* El buscador permitirá:

  * Buscar usuarios por nombre.
  * Agregar múltiples usuarios al grupo.

Los usuarios seleccionados quedarán asociados permanentemente al grupo.

---

## 6. Reglas Generales del Sistema

* Un proyecto puede tener múltiples usuarios y grupos.
* Un grupo puede ser reutilizado en distintos proyectos.
* Una tarea solo puede estar en una columna a la vez.
* Solo se pueden asignar tareas a usuarios que pertenezcan al proyecto.

---

## 7. Consideraciones de Interfaz

* Interfaz limpia, clara y responsive.
* Uso de modales para creación y edición.
* Drag & drop para mover tareas entre columnas.
* Feedback visual al crear, editar o mover elementos.

---

## 8. Alcance Inicial (MVP)

* Gestión de proyectos
* Gestión de grupos
* Tableros Kanban editables
* Asignación de tareas con fechas y responsables

No se incluyen en esta fase:

* Reportes avanzados
* Automatizaciones
* Integraciones externas

---

**Fin del documento de requerimientos – Tasks**
