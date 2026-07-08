import './bootstrap';
import '../css/app.css';

import { DndContext, DragEndEvent, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import {
  BarChart3,
  Camera,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Globe,
  GripVertical,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Chart } from 'chart.js/auto';
import { AuthProvider, useAuth } from './auth';
import { WelcomeView } from './Welcome';
import { QuotePortalView } from './Portal';
import { api, LOGO_URL } from './apiClient';

type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
  document: string;
  company?: string;
  projects_count?: number;
  quotations_count?: number;
};

type Worker = {
  id: number;
  name: string;
  role: string;
};

type Project = {
  id: number;
  code: string;
  client_id: number;
  responsible_worker_id?: number | null;
  name: string;
  type: string;
  description?: string | null;
  complexity: string;
  priority: string;
  status: string;
  progress: number;
  estimated_delivery_at: string;
  estimated_cost: string;
  cover_image_url: string;
  client_access_token: string;
  client: Client;
  responsible?: Worker;
  tasks?: { id: number; status: string }[];
};

type Dashboard = {
  metrics: {
    totalProjects: number;
    activeProjects: number;
    finishedProjects: number;
    delayedProjects: number;
    pendingQuotations: number;
    activeWorkers: number;
  };
  priorityList: Project[];
  recentActivity: { id: number; title: string; description: string; created_at: string }[];
  upcomingDeadlines: Project[];
  chart: { month: string; production: number; sales: number }[];
};

type Quotation = {
  id: number;
  number: string;
  status: string;
  subtotal: string;
  igv: string;
  total: string;
  delivery_time: string;
  client: Client;
  project?: Project;
  items: { id: number; description: string; quantity: number; unit_price: string; subtotal: string }[];
};

const queryClient = new QueryClient();
const statuses = ['Pendiente', 'Diseno', 'Produccion', 'Instalacion', 'Entregado'];
const statusDefaultProgress: Record<string, number> = {
  Pendiente: 5,
  Diseno: 20,
  Produccion: 40,
  Instalacion: 90,
  Entregado: 100,
};
const money = (value: number | string) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value));
const isOverdue = (dateStr: string) => {
  const due = new Date(dateStr);
  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);
  return due < in3Days;
};

const adminNav = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Proyectos', icon: ClipboardList },
  { key: 'kanban', label: 'Kanban', icon: BarChart3 },
  { key: 'clients', label: 'Clientes', icon: Users },
  { key: 'quotations', label: 'Cotizaciones', icon: FileText },
  { key: 'calendar', label: 'Calendario', icon: CalendarDays },
  { key: 'quote-requests', label: 'Solicitudes', icon: ImagePlus },
  { key: 'users', label: 'Usuarios', icon: UserCog },
  { key: 'site', label: 'Sitio web', icon: Globe },
];

const workerNav = [{ key: 'my-tasks', label: 'Mis tareas', icon: ClipboardList }];
const clientNav = [{ key: 'my-projects', label: 'Mis proyectos', icon: ClipboardList }];

function App() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.roles.includes('Administrador') ?? false;
  const isCliente = user?.roles.includes('Cliente') ?? false;
  const nav = isAdmin ? adminNav : isCliente ? clientNav : workerNav;
  const [view, setView] = useState(isAdmin ? 'dashboard' : isCliente ? 'my-projects' : 'my-tasks');
  const [search, setSearch] = useState('');
  const [dark, setDark] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
  }, [dark]);

  // El estado inicial de `view` se calcula en el primer render, cuando `user` todavia
  // es null (la sesion recien se esta verificando) — en ese momento isAdmin/isCliente
  // siempre dan false, asi que `view` queda fijo en 'my-tasks' sin importar el rol real.
  // Este efecto corrige `view` apenas se resuelve el usuario logueado.
  useEffect(() => {
    if (user) {
      setView(isAdmin ? 'dashboard' : isCliente ? 'my-projects' : 'my-tasks');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginView />;

  const goTo = (key: string) => {
    setView(key);
    setMobileNavOpen(false);
  };

  return (
    <div className="app-shell">
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="brand">
          <img className="brand-mark" src={LOGO_URL} alt="Segmentos" />
          <div>
            <strong>Segmentos</strong>
            <span>Mejorando tus espacios</span>
          </div>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button className={`nav-item ${view === item.key ? 'active' : ''}`} key={item.key} onClick={() => goTo(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="theme-toggle" onClick={() => setDark((value) => !value)}>
          <Moon size={17} />
          <span>Modo {dark ? 'claro' : 'oscuro'}</span>
        </button>
        <button
          className="theme-toggle"
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          <LogOut size={17} />
          <span>Cerrar sesion ({user.name})</span>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
            <Menu size={22} />
          </button>
          <div>
            <p className="eyebrow">Gestion integral</p>
            <h1>{nav.find((item) => item.key === view)?.label ?? 'Dashboard'}</h1>
          </div>
          <label className="search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar proyecto, cliente o responsable" />
          </label>
        </header>

        {view === 'dashboard' && isAdmin && <DashboardView />}
        {view === 'projects' && isAdmin && <ProjectsView search={search} />}
        {view === 'kanban' && isAdmin && <KanbanView search={search} />}
        {view === 'clients' && isAdmin && <ClientsView />}
        {view === 'quotations' && isAdmin && <QuotationsView />}
        {view === 'calendar' && isAdmin && <CalendarView />}
        {view === 'quote-requests' && isAdmin && <QuoteRequestsView />}
        {view === 'users' && isAdmin && <UsersView />}
        {view === 'site' && isAdmin && <SiteAdminView />}
        {view === 'my-tasks' && <MyTasksView />}
        {view === 'my-projects' && <ClientProjectsView />}
      </main>
    </div>
  );
}

function LoginView() {
  const { login, error } = useAuth();
  const { register, handleSubmit, formState } = useForm({ defaultValues: { email: 'test@example.com', password: '' } });

  return (
    <div className="login-shell">
      <section className="panel login-card">
        <img className="login-logo" src={LOGO_URL} alt="Segmentos" />
        <PanelTitle title="Segmentos" subtitle="Inicia sesion para continuar" />
        {error && <p className="login-error">{error}</p>}
        <form
          className="form-grid"
          onSubmit={handleSubmit(async (values) => {
            try {
              await login(values.email, values.password);
            } catch {
              // el mensaje de error ya se muestra desde el contexto de auth
            }
          })}
        >
          <label>
            Correo
            <input type="email" {...register('email', { required: true })} />
          </label>
          <label>
            Contrasena
            <input type="password" {...register('password', { required: true })} />
          </label>
          <button className="primary-button" disabled={formState.isSubmitting}>
            Ingresar
          </button>
        </form>
      </section>
    </div>
  );
}

const taskStatuses = ['Pendiente', 'En progreso', 'Terminada'];

type MyTask = {
  id: number;
  title: string;
  status: string;
  estimated_hours: string;
  real_hours: string;
  project: { id: number; code: string; name: string; status: string; progress: number; responsible_worker_id: number | null; client?: Client };
};

function MyTasksView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['my-tasks'], queryFn: async () => (await api.get<MyTask[]>('/my-tasks')).data });

  const taskStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/my-tasks/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  const projectStatusMutation = useMutation({
    mutationFn: ({ id, status, progress }: { id: number; status: string; progress: number }) =>
      api.patch(`/projects/${id}/status`, { status, progress }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  const grouped = useMemo(() => {
    const map = new Map<number, { project: MyTask['project']; tasks: MyTask[] }>();
    data.forEach((task) => {
      if (!map.has(task.project.id)) map.set(task.project.id, { project: task.project, tasks: [] });
      map.get(task.project.id)!.tasks.push(task);
    });
    return Array.from(map.values());
  }, [data]);

  if (isLoading) return <Loading />;

  return (
    <div className="stack">
      {grouped.map(({ project, tasks }) => {
        const isResponsible = project.responsible_worker_id === user?.worker?.id;
        const statusIndex = statuses.indexOf(project.status);

        return (
          <section className="panel" key={project.id}>
            <PanelTitle title={`${project.code} - ${project.name}`} subtitle={project.client?.name ?? ''} />

            {isResponsible && (
              <>
                <div className="kanban-move" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className="kanban-move-button"
                    disabled={statusIndex <= 0}
                    onClick={() =>
                      projectStatusMutation.mutate({
                        id: project.id,
                        status: statuses[statusIndex - 1],
                        progress: statusDefaultProgress[statuses[statusIndex - 1]] ?? 50,
                      })
                    }
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>
                    {project.status} · {project.progress}%
                  </strong>
                  <button
                    type="button"
                    className="kanban-move-button"
                    disabled={statusIndex >= statuses.length - 1}
                    onClick={() =>
                      projectStatusMutation.mutate({
                        id: project.id,
                        status: statuses[statusIndex + 1],
                        progress: statusDefaultProgress[statuses[statusIndex + 1]] ?? 50,
                      })
                    }
                  >
                    <ChevronRight size={16} />
                  </button>
                  <ProjectImageUpload projectId={project.id} invalidateKeys={[['my-tasks']]} />
                </div>
                {project.status === 'Produccion' && (
                  <div className="card-actions" style={{ marginBottom: 14 }}>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        projectStatusMutation.mutate({
                          id: project.id,
                          status: project.status,
                          progress: Math.min(100, project.progress + 10),
                        })
                      }
                    >
                      +10% avance
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        projectStatusMutation.mutate({
                          id: project.id,
                          status: project.status,
                          progress: Math.min(100, project.progress + 25),
                        })
                      }
                    >
                      +25% avance
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="stack">
              {tasks.map((task) => (
                <article className="list-item" key={task.id}>
                  <strong>{task.title}</strong>
                  <span>
                    {task.real_hours}/{task.estimated_hours} hrs
                  </span>
                  <div className="card-actions">
                    <select
                      value={task.status}
                      onChange={(event) => taskStatusMutation.mutate({ id: task.id, status: event.target.value })}
                    >
                      {taskStatuses.map((status) => (
                        <option value={status} key={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      {grouped.length === 0 && <section className="panel">No tienes tareas asignadas por el momento.</section>}
    </div>
  );
}

type ClientProject = {
  id: number;
  code: string;
  name: string;
  status: string;
  progress: number;
  estimated_delivery_at: string;
  cover_image_url: string;
  responsible?: Worker;
  quotations: Quotation[];
};

type MyRequestItem = {
  id: number;
  title: string;
  description: string;
  status: string;
  reference_image_url: string | null;
  quotation: Quotation | null;
  project: { id: number } | null;
};

function ClientProjectsView() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => (await api.get<ClientProject[]>('/my-projects')).data,
  });
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['my-requests'],
    queryFn: async () => (await api.get<MyRequestItem[]>('/my-requests')).data,
  });
  const pendingRequests = requests.filter((request) => !request.project);
  if (isLoading || loadingRequests) return <Loading />;

  return (
    <>
      {pendingRequests.length > 0 && (
        <section className="panel compact-panel">
          <PanelTitle title="Mis solicitudes" subtitle="Estado de tus pedidos de cotizacion" />
          <div className="stack">
            {pendingRequests.map((request) => (
              <article className="list-item" key={request.id}>
                <strong>{request.title} · {request.status}</strong>
                <span>{request.description}</span>
                {request.quotation && (
                  <span>
                    Cotizacion {request.quotation.number}: {money(request.quotation.total)}
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="project-grid">
        {data.map((project) => (
        <article className="project-card" key={project.id}>
          <img src={project.cover_image_url} alt={project.name} />
          <div>
            <span className="code">{project.code}</span>
            <h3>{project.name}</h3>
            <p>Responsable: {project.responsible?.name ?? 'Por asignar'}</p>
            <div className="badge-row">
              <Badge label={project.status} tone={project.status === 'Entregado' ? 'success' : 'normal'} />
            </div>
            <div className="progress"><span style={{ width: `${project.progress}%` }} /></div>
            <small>{project.progress}% avance · entrega {project.estimated_delivery_at}</small>
            {project.quotations.length > 0 && (
              <p>Cotizaciones: {project.quotations.map((q) => `${q.number} (${money(q.total)})`).join(', ')}</p>
            )}
          </div>
        </article>
      ))}
        {data.length === 0 && pendingRequests.length === 0 && (
          <section className="panel">Aun no tienes proyectos ni solicitudes.</section>
        )}
      </div>
    </>
  );
}

function DashboardView() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: async () => (await api.get<Dashboard>('/dashboard')).data });

  if (isLoading || !data) return <Loading />;

  return (
    <>
      <div className="metric-grid">
        <Metric label="Total proyectos" value={data.metrics.totalProjects} />
        <Metric label="Activos" value={data.metrics.activeProjects} />
        <Metric label="Terminados" value={data.metrics.finishedProjects} />
        <Metric label="Retrasados" value={data.metrics.delayedProjects} danger />
        <Metric label="Cotizaciones" value={data.metrics.pendingQuotations} />
        <Metric label="Trabajadores" value={data.metrics.activeWorkers} />
      </div>
      <div className="content-grid">
        <section className="panel panel-wide">
          <PanelTitle title="Produccion y ventas" subtitle="Lectura ejecutiva de avance mensual" />
          <ProductionChart data={data.chart} />
        </section>
        <section className="panel">
          <PanelTitle title="Atender primero" subtitle="Ordenado por prioridad inteligente" />
          <div className="stack">
            {data.priorityList.map((project) => (
              <PriorityItem project={project} key={project.id} />
            ))}
          </div>
        </section>
      </div>
      <div className="content-grid">
        <section className="panel">
          <PanelTitle title="Proximos vencimientos" subtitle="Entregas que requieren seguimiento" />
          <Timeline projects={data.upcomingDeadlines} />
        </section>
        <section className="panel">
          <PanelTitle title="Actividad reciente" subtitle="Cambios y movimientos del equipo" />
          <div className="stack">
            {data.recentActivity.map((item) => (
              <article className="list-item" key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ProjectsView({ search }: { search: string }) {
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: async () => (await api.get<Client[]>('/clients')).data });
  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: async () => (await api.get<Worker[]>('/workers')).data });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: async () => (await api.get<Project[]>('/projects')).data });
  const [formProject, setFormProject] = useState<Project | 'new' | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const query = search.toLowerCase();
  const filtered = projects.filter((project) => `${project.name} ${project.code} ${project.client.name}`.toLowerCase().includes(query));

  return (
    <>
      <button className="primary-button" onClick={() => setFormProject('new')}>
        <Plus size={17} /> Nuevo proyecto
      </button>
      <div className="project-grid">
        {filtered.map((project) => (
          <ProjectCard
            project={project}
            key={project.id}
            onEdit={() => setFormProject(project)}
            onDelete={() => setDeletingProject(project)}
          />
        ))}
      </div>
      {formProject && (
        <ProjectFormModal
          clients={clients}
          workers={workers}
          project={formProject === 'new' ? null : formProject}
          onClose={() => setFormProject(null)}
        />
      )}
      {deletingProject && <DeleteProjectModal project={deletingProject} onClose={() => setDeletingProject(null)} />}
    </>
  );
}

function ProjectFormModal({
  clients,
  workers,
  project,
  onClose,
}: {
  clients: Client[];
  workers: Worker[];
  project: Project | null;
  onClose: () => void;
}) {
  const isEdit = !!project;
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: project
      ? {
          name: project.name,
          client_id: project.client_id,
          type: project.type,
          complexity: project.complexity,
          priority: project.priority,
          estimated_delivery_at: project.estimated_delivery_at?.slice(0, 10),
          responsible_worker_id: project.responsible_worker_id ?? '',
          estimated_cost: project.estimated_cost,
          description: project.description ?? '',
        }
      : {
          type: 'Hogar',
          complexity: 'Media',
          priority: 'Alta',
          estimated_delivery_at: '2026-08-12',
          responsible_worker_id: '',
          estimated_cost: '',
          description: '',
        },
  });

  const mutation = useMutation({
    mutationFn: (payload: unknown) => (isEdit ? api.put(`/projects/${project!.id}`, payload) : api.post('/projects', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Modal title={isEdit ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label>
          Nombre del proyecto
          <input {...register('name', { required: true })} />
        </label>
        <label>
          Cliente
          <select {...register('client_id', { valueAsNumber: true })}>
            {clients.map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select {...register('type')}>
            <option>Hogar</option>
            <option>Empresa</option>
            <option>Proyecto Arquitectonico</option>
          </select>
        </label>
        <label>
          Complejidad
          <select {...register('complexity')}>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
          </select>
        </label>
        <label>
          Prioridad
          <select {...register('priority')}>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
            <option>Urgente</option>
          </select>
        </label>
        <label>
          Entrega estimada
          <input type="date" {...register('estimated_delivery_at')} />
        </label>
        <label>
          Responsable
          <select {...register('responsible_worker_id', { setValueAs: (value) => (value === '' ? null : Number(value)) })}>
            <option value="">Sin asignar</option>
            {workers.map((worker) => (
              <option value={worker.id} key={worker.id}>
                {worker.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Costo estimado
          <input type="number" step="0.01" {...register('estimated_cost', { setValueAs: (value) => (value === '' ? null : Number(value)) })} />
        </label>
        <label>
          Descripcion
          <textarea rows={3} {...register('description')} />
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" disabled={mutation.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.delete(`/projects/${project.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Modal title="Eliminar proyecto" onClose={onClose} narrow>
      <p>
        ¿Seguro que quieres eliminar <strong>{project.name}</strong>? El proyecto se archiva y deja de aparecer en la lista.
      </p>
      <div className="modal-actions">
        <button type="button" className="ghost-button" onClick={onClose}>
          Cancelar
        </button>
        <button className="danger-button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Trash2 size={16} /> Confirmar eliminar
        </button>
      </div>
    </Modal>
  );
}

function KanbanView({ search }: { search: string }) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: async () => (await api.get<Project[]>('/projects')).data });
  const mutation = useMutation({
    mutationFn: ({ id, status, progress }: { id: number; status: string; progress: number }) => api.patch(`/projects/${id}/status`, { status, progress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const moveTo = (id: number, status: string) => {
    mutation.mutate({ id, status, progress: statusDefaultProgress[status] ?? 50 });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const activeId = Number(event.active.id);
    const status = String(event.over?.id ?? '');
    if (!status) return;
    moveTo(activeId, status);
  };

  const onMove = (project: Project, direction: 'prev' | 'next') => {
    const currentIndex = statuses.indexOf(project.status);
    const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= statuses.length) return;
    moveTo(project.id, statuses[nextIndex]);
  };

  const onBump = (project: Project, delta: number) => {
    const progress = Math.min(100, Math.max(0, project.progress + delta));
    mutation.mutate({ id: project.id, status: project.status, progress });
  };

  const query = search.toLowerCase();
  const filtered = projects.filter((project) => `${project.name} ${project.code} ${project.client.name}`.toLowerCase().includes(query));

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {statuses.map((status) => (
          <KanbanColumn
            status={status}
            projects={filtered.filter((project) => project.status === status)}
            onMove={onMove}
            onBump={onBump}
            key={status}
          />
        ))}
      </div>
    </DndContext>
  );
}

function ClientsView() {
  const { data = [], isLoading } = useQuery({ queryKey: ['clients'], queryFn: async () => (await api.get<Client[]>('/clients')).data });
  if (isLoading) return <Loading />;

  return (
    <section className="table-panel">
      <table className="stack-on-mobile">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Documento</th>
            <th>Contacto</th>
            <th>Proyectos</th>
            <th>Cotizaciones</th>
          </tr>
        </thead>
        <tbody>
          {data.map((client) => (
            <tr key={client.id}>
              <td data-label="Cliente">
                <strong>{client.name}</strong>
                <span>{client.company || 'Cliente particular'}</span>
              </td>
              <td data-label="Documento">{client.document}</td>
              <td data-label="Contacto">
                {client.email}
                <br />
                {client.phone}
              </td>
              <td data-label="Proyectos">{client.projects_count}</td>
              <td data-label="Cotizaciones">{client.quotations_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

type AdminUser = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  worker: Worker | null;
  client: Client | null;
};

function UsersView() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<AdminUser[]>('/users')).data });
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const toggleActive = useMutation({
    mutationFn: ({ user, active }: { user: AdminUser; active: boolean }) =>
      active
        ? api.put(`/users/${user.id}`, { name: user.name, email: user.email, is_active: true })
        : api.delete(`/users/${user.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <button
        className="primary-button"
        onClick={() => {
          setEditingUser(null);
          setFormOpen(true);
        }}
      >
        <Plus size={17} /> Nuevo usuario
      </button>
      <section className="table-panel">
        <table className="stack-on-mobile">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <tr key={user.id}>
                <td data-label="Nombre">{user.name}</td>
                <td data-label="Correo">{user.email}</td>
                <td data-label="Rol">{user.roles.join(', ')}</td>
                <td data-label="Estado">
                  <Badge label={user.is_active ? 'Activo' : 'Inactivo'} tone={user.is_active ? 'success' : 'danger'} />
                </td>
                <td>
                  <div className="card-actions">
                    <button
                      className="ghost-button"
                      onClick={() => {
                        setEditingUser(user);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil size={14} /> Editar
                    </button>
                    <button className="ghost-button" onClick={() => toggleActive.mutate({ user, active: !user.is_active })}>
                      {user.is_active ? <Trash2 size={14} /> : <Plus size={14} />} {user.is_active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {formOpen && <UserFormModal user={editingUser} onClose={() => setFormOpen(false)} />}
    </>
  );
}

function UserFormModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const isEdit = !!user;
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch } = useForm({
    defaultValues: isEdit
      ? { name: user!.name, email: user!.email, password: '', is_active: user!.is_active }
      : {
          name: '',
          email: '',
          password: '',
          role: 'Trabajador',
          phone: '',
          worker_role: '',
          document: '',
          address: '',
          company: '',
        },
  });
  const role = !isEdit ? String(watch('role' as never) ?? '') : null;

  const mutation = useMutation({
    mutationFn: (payload: unknown) => (isEdit ? api.put(`/users/${user!.id}`, payload) : api.post('/users', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
  });

  return (
    <Modal title={isEdit ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label>
          Nombre
          <input {...register('name', { required: true })} />
        </label>
        <label>
          Correo
          <input type="email" {...register('email', { required: true })} />
        </label>
        <label>
          {isEdit ? 'Nueva contrasena (opcional)' : 'Contrasena'}
          <input type="password" {...register('password', { required: !isEdit, minLength: 6 })} />
        </label>
        {!isEdit && (
          <>
            <label>
              Rol
              <select {...register('role')}>
                <option value="Administrador">Administrador</option>
                <option value="Trabajador">Trabajador</option>
                <option value="Cliente">Cliente</option>
              </select>
            </label>
            <label>
              Telefono
              <input {...register('phone')} />
            </label>
            {role === 'Trabajador' && (
              <label>
                Especialidad
                <input placeholder="Ej: Acabados" {...register('worker_role')} />
              </label>
            )}
            {role === 'Cliente' && (
              <>
                <label>
                  Documento
                  <input {...register('document')} />
                </label>
                <label>
                  Direccion
                  <input {...register('address')} />
                </label>
                <label>
                  Empresa
                  <input {...register('company')} />
                </label>
              </>
            )}
          </>
        )}
        {isEdit && (
          <label className="checkbox-label">
            <input type="checkbox" {...register('is_active')} /> Cuenta activa
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" disabled={mutation.isPending}>
            {isEdit ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function QuotationsView() {
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: async () => (await api.get<Client[]>('/clients')).data });
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: async () => (await api.get<Project[]>('/projects')).data });
  const { data: quotations = [] } = useQuery({ queryKey: ['quotations'], queryFn: async () => (await api.get<Quotation[]>('/quotations')).data });
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { description: 'Closet premium a medida', quantity: 1, unit_price: 6800, delivery_time: '28 dias calendario' } });

  const mutation = useMutation({
    mutationFn: (payload: unknown) => api.post('/quotations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      reset();
    },
  });

  const downloadPdf = async (id: number, number: string) => {
    const response = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="quotation-layout">
      <section className="panel">
        <PanelTitle title="Cotizador" subtitle="Genera cotizaciones con IGV desde Laravel" />
        <form className="form-grid" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <label>
            Cliente
            <select {...register('client_id', { valueAsNumber: true })}>
              {clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}
            </select>
          </label>
          <label>
            Proyecto
            <select {...register('project_id', { valueAsNumber: true })}>
              {projects.map((project) => <option value={project.id} key={project.id}>{project.code} - {project.name}</option>)}
            </select>
          </label>
          <label>Partida<input {...register('description')} /></label>
          <label>Cantidad<input type="number" {...register('quantity', { valueAsNumber: true })} /></label>
          <label>Precio unitario<input type="number" {...register('unit_price', { valueAsNumber: true })} /></label>
          <label>Tiempo de entrega<input {...register('delivery_time')} /></label>
          <button className="primary-button"><Plus size={17} /> Generar cotizacion</button>
        </form>
      </section>
      <section className="panel">
        <PanelTitle title="Cotizaciones recientes" subtitle="Datos persistidos en base de datos" />
        <div className="stack">
          {quotations.map((quotation) => (
            <article className="quote-card" key={quotation.id}>
              <div>
                <strong>{quotation.number}</strong>
                <span>{quotation.client.name}</span>
              </div>
              <strong>{money(quotation.total)}</strong>
              <button className="ghost-button" onClick={() => downloadPdf(quotation.id, quotation.number)}>
                <FileText size={15} /> Descargar PDF
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

type AdminQuoteRequest = {
  id: number;
  title: string;
  description: string;
  reference_image_url: string | null;
  status: string;
  rejected_reason: string | null;
  client: Client;
  quotation: Quotation | null;
  project: { id: number; code: string } | null;
};

function QuoteRequestsView() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['quote-requests'],
    queryFn: async () => (await api.get<AdminQuoteRequest[]>('/quote-requests')).data,
  });
  const [quotingRequest, setQuotingRequest] = useState<AdminQuoteRequest | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<AdminQuoteRequest | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/quote-requests/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quote-requests'] }),
  });

  if (isLoading) return <Loading />;

  return (
    <>
      <div className="stack">
        {data.map((request) => (
          <article className="panel" key={request.id}>
            <div className="badge-row">
              <Badge
                label={request.status}
                tone={request.status === 'Rechazado' ? 'danger' : request.status === 'Aprobado' ? 'success' : 'normal'}
              />
            </div>
            <h3>{request.title}</h3>
            <p>
              {request.client.name} · {request.client.email} · {request.client.phone}
            </p>
            <p>{request.description}</p>
            {request.reference_image_url && (
              <img src={request.reference_image_url} alt={request.title} style={{ maxWidth: 220, borderRadius: 8 }} />
            )}
            {request.quotation && (
              <p>
                Cotizacion: {request.quotation.number} — {money(request.quotation.total)}
              </p>
            )}
            {request.project && <p>Proyecto creado: {request.project.code}</p>}
            <div className="card-actions">
              {request.status === 'Pendiente' && (
                <button className="ghost-button" onClick={() => statusMutation.mutate({ id: request.id, status: 'Contactado' })}>
                  Marcar contactado
                </button>
              )}
              {request.status !== 'Aprobado' && request.status !== 'Rechazado' && (
                <button className="ghost-button" onClick={() => statusMutation.mutate({ id: request.id, status: 'Rechazado' })}>
                  Rechazar
                </button>
              )}
              {!request.quotation && request.status !== 'Rechazado' && (
                <button className="ghost-button" onClick={() => setQuotingRequest(request)}>
                  Generar cotizacion
                </button>
              )}
              {request.quotation && !request.project && (
                <button className="primary-button" onClick={() => setApprovingRequest(request)}>
                  Aprobar y crear proyecto
                </button>
              )}
            </div>
          </article>
        ))}
        {data.length === 0 && <section className="panel">No hay solicitudes por el momento.</section>}
      </div>
      {quotingRequest && <QuoteRequestQuotationModal request={quotingRequest} onClose={() => setQuotingRequest(null)} />}
      {approvingRequest && <QuoteRequestApproveModal request={approvingRequest} onClose={() => setApprovingRequest(null)} />}
    </>
  );
}

function QuoteRequestQuotationModal({ request, onClose }: { request: AdminQuoteRequest; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { description: request.title, quantity: 1, unit_price: 0, delivery_time: '20 dias calendario' },
  });
  const mutation = useMutation({
    mutationFn: (payload: unknown) => api.post(`/quote-requests/${request.id}/quotation`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      onClose();
    },
  });

  return (
    <Modal title={`Generar cotizacion — ${request.title}`} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label>
          Partida
          <input {...register('description', { required: true })} />
        </label>
        <label>
          Cantidad
          <input type="number" {...register('quantity', { valueAsNumber: true })} />
        </label>
        <label>
          Precio unitario
          <input type="number" step="0.01" {...register('unit_price', { valueAsNumber: true })} />
        </label>
        <label>
          Tiempo de entrega
          <input {...register('delivery_time', { required: true })} />
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" disabled={mutation.isPending}>
            Generar
          </button>
        </div>
      </form>
    </Modal>
  );
}

function QuoteRequestApproveModal({ request, onClose }: { request: AdminQuoteRequest; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { type: 'Hogar', complexity: 'Media', priority: 'Alta', estimated_delivery_at: '' },
  });
  const mutation = useMutation({
    mutationFn: (payload: unknown) => api.post(`/quote-requests/${request.id}/approve`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });

  return (
    <Modal title={`Aprobar y crear proyecto — ${request.title}`} onClose={onClose} narrow>
      <form className="form-grid" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label>
          Tipo
          <select {...register('type')}>
            <option>Hogar</option>
            <option>Empresa</option>
            <option>Proyecto Arquitectonico</option>
          </select>
        </label>
        <label>
          Complejidad
          <select {...register('complexity')}>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
          </select>
        </label>
        <label>
          Prioridad
          <select {...register('priority')}>
            <option>Baja</option>
            <option>Media</option>
            <option>Alta</option>
            <option>Urgente</option>
          </select>
        </label>
        <label>
          Entrega estimada
          <input type="date" {...register('estimated_delivery_at', { required: true })} />
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" disabled={mutation.isPending}>
            Aprobar
          </button>
        </div>
      </form>
    </Modal>
  );
}

type ListFieldConfig = { key: string; label: string; type: 'text' | 'textarea' | 'image' };

function SortableListEditor({
  title,
  endpoint,
  queryKey,
  fields,
  itemLabel,
}: {
  title: string;
  endpoint: string;
  queryKey: string;
  fields: ListFieldConfig[];
  itemLabel: (item: any) => string;
}) {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: async () => (await api.get<any[]>(endpoint)).data });
  const [editing, setEditing] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  if (isLoading) return <Loading />;

  return (
    <section className="panel">
      <PanelTitle title={title} subtitle="Solo se muestra en el sitio publico cuando esta activo" />
      <button
        className="ghost-button"
        onClick={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Plus size={15} /> Agregar
      </button>
      <div className="stack">
        {data.map((item) => (
          <article className="list-item" key={item.id}>
            <strong>
              {itemLabel(item)} {!item.is_active && '(oculto)'}
            </strong>
            <div className="card-actions">
              <button
                className="ghost-button"
                onClick={() => {
                  setEditing(item);
                  setFormOpen(true);
                }}
              >
                <Pencil size={14} /> Editar
              </button>
              <button className="ghost-button" onClick={() => deleteMutation.mutate(item.id)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </article>
        ))}
        {data.length === 0 && <span>Sin elementos todavia.</span>}
      </div>
      {formOpen && (
        <SortableListItemModal
          endpoint={endpoint}
          queryKey={queryKey}
          fields={fields}
          item={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
    </section>
  );
}

function SortableListItemModal({
  endpoint,
  queryKey,
  fields,
  item,
  onClose,
}: {
  endpoint: string;
  queryKey: string;
  fields: ListFieldConfig[];
  item: any;
  onClose: () => void;
}) {
  const isEdit = !!item;
  const queryClient = useQueryClient();
  const defaultValues: Record<string, unknown> = { sort_order: item?.sort_order ?? 0, is_active: item?.is_active ?? true };
  fields.forEach((field) => {
    defaultValues[field.key] = item?.[field.key] ?? '';
  });
  const { register, handleSubmit, setValue, watch } = useForm({ defaultValues });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post<{ url: string }>('/site/upload', formData);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) => (isEdit ? api.put(`${endpoint}/${item.id}`, payload) : api.post(endpoint, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ['public-site'] });
      onClose();
    },
  });

  return (
    <Modal title={isEdit ? 'Editar elemento' : 'Agregar elemento'} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.type === 'textarea' && <textarea rows={3} {...register(field.key)} />}
            {field.type === 'text' && <input {...register(field.key)} />}
            {field.type === 'image' && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const res = await uploadMutation.mutateAsync(file);
                    setValue(field.key, res.data.url);
                  }}
                />
                {String(watch(field.key) ?? '') && (
                  <img src={String(watch(field.key))} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                )}
              </>
            )}
          </label>
        ))}
        <label>
          Orden
          <input type="number" {...register('sort_order', { valueAsNumber: true })} />
        </label>
        <label className="checkbox-label">
          <input type="checkbox" {...register('is_active')} /> Activo (visible en el sitio)
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" disabled={saveMutation.isPending}>
            {isEdit ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type SiteSettingsPayload = {
  id: number;
  company_name: string | null;
  tagline: string | null;
  project_role: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  about_text: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  contact_whatsapp: string | null;
  social_embeds: { platform: string; url: string }[] | null;
  community_platform: string | null;
  community_join_method: string | null;
  community_qr_url: string | null;
};

function SiteAdminView() {
  const [tab, setTab] = useState<'general' | 'services' | 'testimonials' | 'gallery'>('general');

  return (
    <>
      <div className="card-actions">
        <button className={tab === 'general' ? 'primary-button' : 'ghost-button'} onClick={() => setTab('general')}>
          General
        </button>
        <button className={tab === 'services' ? 'primary-button' : 'ghost-button'} onClick={() => setTab('services')}>
          Servicios
        </button>
        <button className={tab === 'testimonials' ? 'primary-button' : 'ghost-button'} onClick={() => setTab('testimonials')}>
          Testimonios
        </button>
        <button className={tab === 'gallery' ? 'primary-button' : 'ghost-button'} onClick={() => setTab('gallery')}>
          Galeria
        </button>
      </div>
      {tab === 'general' && <SiteGeneralForm />}
      {tab === 'services' && (
        <SortableListEditor
          title="Servicios"
          endpoint="/site-services"
          queryKey="site-services"
          itemLabel={(item) => item.title}
          fields={[
            { key: 'title', label: 'Titulo', type: 'text' },
            { key: 'description', label: 'Descripcion', type: 'textarea' },
            { key: 'icon_url', label: 'Icono', type: 'image' },
          ]}
        />
      )}
      {tab === 'testimonials' && (
        <SortableListEditor
          title="Testimonios"
          endpoint="/site-testimonials"
          queryKey="site-testimonials"
          itemLabel={(item) => item.client_name}
          fields={[
            { key: 'client_name', label: 'Nombre del cliente', type: 'text' },
            { key: 'quote', label: 'Testimonio', type: 'textarea' },
            { key: 'avatar_url', label: 'Foto', type: 'image' },
          ]}
        />
      )}
      {tab === 'gallery' && (
        <SortableListEditor
          title="Galeria"
          endpoint="/site-gallery"
          queryKey="site-gallery"
          itemLabel={(item) => item.caption || 'Imagen'}
          fields={[
            { key: 'image_url', label: 'Imagen', type: 'image' },
            { key: 'caption', label: 'Descripcion', type: 'text' },
          ]}
        />
      )}
    </>
  );
}

function SiteGeneralForm() {
  const { data, isLoading } = useQuery({
    queryKey: ['site-settings-admin'],
    queryFn: async () => (await api.get<{ settings: SiteSettingsPayload }>('/site')).data.settings,
  });
  if (isLoading || !data) return <Loading />;
  return <SiteGeneralFormInner initial={data} />;
}

function SiteGeneralFormInner({ initial }: { initial: SiteSettingsPayload }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      company_name: initial.company_name ?? '',
      tagline: initial.tagline ?? '',
      project_role: initial.project_role ?? '',
      hero_title: initial.hero_title ?? '',
      hero_subtitle: initial.hero_subtitle ?? '',
      hero_image_url: initial.hero_image_url ?? '',
      about_text: initial.about_text ?? '',
      contact_phone: initial.contact_phone ?? '',
      contact_email: initial.contact_email ?? '',
      contact_address: initial.contact_address ?? '',
      contact_whatsapp: initial.contact_whatsapp ?? '',
      social_embeds: initial.social_embeds ?? [],
      community_platform: initial.community_platform ?? '',
      community_join_method: initial.community_join_method ?? '',
      community_qr_url: initial.community_qr_url ?? '',
    },
  });
  const embeds = watch('social_embeds');

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post<{ url: string }>('/site/upload', formData);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) => api.put('/site-settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['public-site'] });
    },
  });

  return (
    <section className="panel">
      <PanelTitle title="Informacion general" subtitle="Empresa, hero, quienes somos, contacto y redes sociales" />
      <form className="form-grid" onSubmit={handleSubmit((values) => saveMutation.mutate(values))}>
        <label>
          Nombre de la empresa
          <input {...register('company_name')} />
        </label>
        <label>
          Eslogan
          <input {...register('tagline')} />
        </label>
        <label>
          Rol de proyecto
          <input placeholder="Ej: Ejecucion de obra y mobiliario" {...register('project_role')} />
        </label>
        <label>
          Titulo del hero
          <input {...register('hero_title')} />
        </label>
        <label>
          Subtitulo del hero
          <textarea rows={2} {...register('hero_subtitle')} />
        </label>
        <label>
          Imagen del hero
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const res = await uploadMutation.mutateAsync(file);
              setValue('hero_image_url', res.data.url);
            }}
          />
          {watch('hero_image_url') && <img src={watch('hero_image_url')} alt="" style={{ width: 80, borderRadius: 8 }} />}
        </label>
        <label>
          Quienes somos
          <textarea rows={4} {...register('about_text')} />
        </label>
        <label>
          Telefono de contacto
          <input {...register('contact_phone')} />
        </label>
        <label>
          Correo de contacto
          <input type="email" {...register('contact_email')} />
        </label>
        <label>
          Direccion
          <input {...register('contact_address')} />
        </label>
        <label>
          WhatsApp
          <input {...register('contact_whatsapp')} />
        </label>

        <div>
          <PanelTitle title="Redes sociales" subtitle="Instagram, TikTok u otro link" />
          <div className="stack">
            {(embeds ?? []).map((embed, index) => (
              <div className="embed-row" key={index}>
                <input placeholder="Plataforma" {...register(`social_embeds.${index}.platform` as const)} />
                <input placeholder="URL" {...register(`social_embeds.${index}.url` as const)} />
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    setValue(
                      'social_embeds',
                      (embeds ?? []).filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="ghost-button"
              onClick={() => setValue('social_embeds', [...(embeds ?? []), { platform: 'Instagram', url: '' }])}
            >
              <Plus size={14} /> Agregar red social
            </button>
          </div>
        </div>

        <div>
          <PanelTitle title="Comunidad" subtitle="Grupo o canal al que se unen tus clientes" />
          <div className="form-grid">
            <label>
              Plataforma
              <input placeholder="Ej: WhatsApp" {...register('community_platform')} />
            </label>
            <label>
              Metodo de ingreso
              <input placeholder="Ej: Codigo QR" {...register('community_join_method')} />
            </label>
            <label>
              Imagen del codigo QR
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const res = await uploadMutation.mutateAsync(file);
                  setValue('community_qr_url', res.data.url);
                }}
              />
              {watch('community_qr_url') && <img src={watch('community_qr_url')} alt="" style={{ width: 100, borderRadius: 8 }} />}
            </label>
          </div>
        </div>

        <button className="primary-button" disabled={saveMutation.isPending}>
          Guardar cambios
        </button>
      </form>
    </section>
  );
}

type CalendarEventItem = {
  id: number;
  title: string;
  starts_at: string;
  project?: Project;
};

function CalendarView() {
  const { data = [] } = useQuery({ queryKey: ['calendar-events'], queryFn: async () => (await api.get<CalendarEventItem[]>('/calendar-events')).data });
  const [selected, setSelected] = useState<CalendarEventItem | null>(null);

  return (
    <section className="panel calendar-panel">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        events={data.map((event) => ({ id: String(event.id), title: event.title, date: event.starts_at, extendedProps: { event } }))}
        eventClick={(info) => setSelected(info.event.extendedProps.event as CalendarEventItem)}
        height="auto"
      />
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)} narrow>
          <p>
            <strong>Fecha:</strong> {new Date(selected.starts_at).toLocaleString('es-PE')}
          </p>
          {selected.project ? (
            <>
              <p>
                <strong>Proyecto:</strong> {selected.project.code} - {selected.project.name}
              </p>
              <p>
                <strong>Cliente:</strong> {selected.project.client.name}
              </p>
              <div className="badge-row">
                <Badge label={selected.project.status} tone={selected.project.status === 'Entregado' ? 'success' : 'normal'} />
                <Badge label={`${selected.project.progress}%`} tone="normal" />
              </div>
              <small>Entrega estimada: {selected.project.estimated_delivery_at}</small>
            </>
          ) : (
            <p>Este evento no tiene un proyecto asociado.</p>
          )}
        </Modal>
      )}
    </section>
  );
}

function ProductionChart({ data }: { data: Dashboard['chart'] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.month),
        datasets: [
          { label: 'Produccion', data: data.map((item) => item.production), backgroundColor: '#0f7a4f', borderRadius: 8 },
          { label: 'Ventas / 1000', data: data.map((item) => item.sales / 1000), backgroundColor: '#b7d7c7', borderRadius: 8 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div className="chart-wrap">
      <canvas ref={ref} />
    </div>
  );
}

function KanbanColumn({
  status,
  projects,
  onMove,
  onBump,
}: {
  status: string;
  projects: Project[];
  onMove: (project: Project, direction: 'prev' | 'next') => void;
  onBump: (project: Project, delta: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section className={`kanban-column ${isOver ? 'is-over' : ''}`} ref={setNodeRef}>
      <div className="kanban-title">
        <strong>{status}</strong>
        <span>{projects.length}</span>
      </div>
      {projects.map((project) => <DraggableProject project={project} onMove={onMove} onBump={onBump} key={project.id} />)}
    </section>
  );
}

function DraggableProject({
  project,
  onMove,
  onBump,
}: {
  project: Project;
  onMove: (project: Project, direction: 'prev' | 'next') => void;
  onBump: (project: Project, delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  const currentIndex = statuses.indexOf(project.status);
  const tasksDone = project.tasks?.filter((task) => task.status === 'Terminada').length ?? 0;
  const tasksTotal = project.tasks?.length ?? 0;
  const overdue = project.status !== 'Entregado' && isOverdue(project.estimated_delivery_at);

  return (
    <article className={`kanban-card ${isDragging ? 'is-dragging' : ''} ${overdue ? 'is-overdue' : ''}`} ref={setNodeRef} style={style}>
      <img src={project.cover_image_url} alt={project.name} />
      <strong>{project.name}</strong>
      <span>{project.client.name}</span>
      <div className="badge-row">
        <Badge label={project.priority} tone={project.priority === 'Urgente' ? 'danger' : 'normal'} />
        <Badge label={`${project.progress}%`} tone="normal" />
        {overdue && <Badge label="Atrasado" tone="danger" />}
        {tasksTotal > 0 && (
          <Badge label={`${tasksDone}/${tasksTotal} tareas`} tone={tasksDone === tasksTotal ? 'success' : 'normal'} />
        )}
      </div>
      {project.status === 'Produccion' && (
        <div className="card-actions">
          <button type="button" className="ghost-button" onClick={(event) => { event.stopPropagation(); onBump(project, 10); }}>
            +10%
          </button>
          <button type="button" className="ghost-button" onClick={(event) => { event.stopPropagation(); onBump(project, 25); }}>
            +25%
          </button>
        </div>
      )}
      <div className="kanban-move">
        <button
          type="button"
          className="kanban-move-button"
          disabled={currentIndex <= 0}
          onClick={(event) => {
            event.stopPropagation();
            onMove(project, 'prev');
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="kanban-handle" {...listeners} {...attributes}>
          <GripVertical size={16} />
        </span>
        <button
          type="button"
          className="kanban-move-button"
          disabled={currentIndex >= statuses.length - 1}
          onClick={(event) => {
            event.stopPropagation();
            onMove(project, 'next');
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

function ProjectCard({ project, onEdit, onDelete }: { project: Project; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="project-card">
      <img src={project.cover_image_url} alt={project.name} />
      <div>
        <span className="code">{project.code}</span>
        <h3>{project.name}</h3>
        <p>{project.client.name}</p>
        <div className="badge-row">
          <Badge label={project.status} tone={project.status === 'Entregado' ? 'success' : 'normal'} />
          <Badge label={project.priority} tone={project.priority === 'Urgente' ? 'danger' : 'normal'} />
          <Badge label={project.complexity} tone="normal" />
        </div>
        <div className="progress"><span style={{ width: `${project.progress}%` }} /></div>
        <small>{project.progress}% avance · entrega {project.estimated_delivery_at}</small>
        <div className="card-actions">
          <button className="ghost-button" onClick={onEdit}>
            <Pencil size={14} /> Editar
          </button>
          <button className="ghost-button" onClick={onDelete}>
            <Trash2 size={14} /> Eliminar
          </button>
          <ProjectImageUpload projectId={project.id} invalidateKeys={[['projects'], ['dashboard']]} />
        </div>
      </div>
    </article>
  );
}

function ProjectImageUpload({ projectId, invalidateKeys }: { projectId: number; invalidateKeys: string[][] }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return api.post(`/projects/${projectId}/image`, formData);
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
  });

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) mutation.mutate(file);
          event.target.value = '';
        }}
      />
      <button type="button" className="ghost-button" onClick={() => inputRef.current?.click()} disabled={mutation.isPending}>
        <Camera size={14} /> {mutation.isPending ? 'Subiendo...' : 'Foto'}
      </button>
    </>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return <article className={`metric-card ${danger ? 'danger' : ''}`}><span>{label}</span><strong>{value}</strong></article>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-title"><h2>{title}</h2><p>{subtitle}</p></div>;
}

function Modal({ title, onClose, narrow = false, children }: { title: string; onClose: () => void; narrow?: boolean; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-box ${narrow ? 'modal-box-narrow' : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: 'normal' | 'danger' | 'success' }) {
  return <span className={`badge ${tone}`}>{label}</span>;
}

function PriorityItem({ project }: { project: Project }) {
  return (
    <article className="list-item">
      <strong>{project.name}</strong>
      <span>{project.client.name} · {project.priority} · {project.status}</span>
    </article>
  );
}

function Timeline({ projects }: { projects: Project[] }) {
  return (
    <div className="stack">
      {projects.map((project) => (
        <article className="list-item" key={project.id}>
          <strong>{project.estimated_delivery_at} · {project.name}</strong>
          <span>{project.client.name} · {project.responsible?.name ?? 'Sin responsable'}</span>
        </article>
      ))}
    </div>
  );
}

function Loading() {
  return (
    <section className="panel loading-inline">
      <img src={LOGO_URL} alt="Segmentos" className="loading-logo" />
      <span>Cargando informacion de Segmentos...</span>
    </section>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img src={LOGO_URL} alt="Segmentos" className="loading-logo" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomeView />} />
          <Route path="/portal" element={<QuotePortalView />} />
          <Route
            path="/app/*"
            element={
              <AuthProvider>
                <App />
              </AuthProvider>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
