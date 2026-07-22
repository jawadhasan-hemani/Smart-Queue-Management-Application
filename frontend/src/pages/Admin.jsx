import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {AlertCircle,CheckCircle2,ClipboardList,Loader2,Lock,Pencil,Plus,RefreshCw,Unlock,UserCheck,Users,X} 
from 'lucide-react';

import { AppShell } from '../components/shell/AppShell';
import { useApp } from '../components/AppContext';
import { formatWait, PriorityBadge } from '../components/shared';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {createService,fetchQueue,fetchServices,serveNext,updateService} 
from '../lib/api';

const NAME_MAX = 100;
const PRIORITIES = ['low', 'medium', 'high'];

const nav = [
  { key: 'services', label: 'Services', icon: ClipboardList },
  { key: 'queue', label: 'Queue', icon: Users },
];

const meta = {
  services: { title: 'Service Management', subtitle: 'Create, edit, and publish advising services' },
  queue: { title: 'Queue Management', subtitle: 'View live queues and serve the next student' },
};

function validateServiceForm(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Service name is required.';
  } else if (values.name.trim().length > NAME_MAX) {
    errors.name = `Service name must be ${NAME_MAX} characters or fewer.`;
  }

  if (!values.description.trim()) {
    errors.description = 'Description is required.';
  }

  if (values.duration === '' || values.duration === null || values.duration === undefined) {
    errors.duration = 'Expected duration (minutes) is required.';
  } else {
    const duration = Number(values.duration);
    if (Number.isNaN(duration) || duration <= 0) {
      errors.duration = 'Expected duration must be a positive number of minutes.';
    } else if (!Number.isInteger(duration)) {
      errors.duration = 'Expected duration must be a whole number of minutes.';
    }
  }

  if (!PRIORITIES.includes(values.priority)) {
    errors.priority = 'Select a priority level.';
  }

  return errors;
}

const emptyForm = { name: '', description: '', duration: '', priority: 'medium', open: true };

function ServiceForm({ initial, onCancel, onSaved }) {
  const [values, setValues] = useState(initial ?? emptyForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(initial?.id);

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validateServiceForm(values);
    setErrors(fieldErrors);
    setServerError('');
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      duration: Number(values.duration),
      priority: values.priority,
      open: values.open,
    };

    setSaving(true);
    try {
      const saved = isEdit ? await updateService(initial.id, payload) : await createService(payload);
      onSaved(saved);
    } catch (err) {
      setServerError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit service' : 'New service'}</CardTitle>
        <CardDescription>
          Fields marked required must be filled in before saving.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {serverError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="svc-name">
              Service name <span className="text-destructive">*</span>
            </label>
            <input
              id="svc-name"
              type="text"
              maxLength={NAME_MAX}
              value={values.name}
              onChange={(e) => setField('name', e.target.value)}
              aria-invalid={Boolean(errors.name)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              placeholder="e.g. General Academic Advising"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-destructive">{errors.name}</span>
              <span className="text-muted-foreground">{values.name.length}/{NAME_MAX}</span>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" htmlFor="svc-description">
              Description <span className="text-destructive">*</span>
            </label>
            <textarea
              id="svc-description"
              rows={3}
              value={values.description}
              onChange={(e) => setField('description', e.target.value)}
              aria-invalid={Boolean(errors.description)}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              placeholder="What students should expect from this service"
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="svc-duration">
                Expected duration (minutes) <span className="text-destructive">*</span>
              </label>
              <input
                id="svc-duration"
                type="number"
                min={1}
                step={1}
                value={values.duration}
                onChange={(e) => setField('duration', e.target.value)}
                aria-invalid={Boolean(errors.duration)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                placeholder="12"
              />
              {errors.duration && <p className="mt-1 text-xs text-destructive">{errors.duration}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="svc-priority">
                Priority level <span className="text-destructive">*</span>
              </label>
              <select
                id="svc-priority"
                value={values.priority}
                onChange={(e) => setField('priority', e.target.value)}
                aria-invalid={Boolean(errors.priority)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive capitalize"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
              {errors.priority && <p className="mt-1 text-xs text-destructive">{errors.priority}</p>}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values.open}
              onChange={(e) => setField('open', e.target.checked)}
              className="size-4 rounded border-input"
            />
            Queue is open for students
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {isEdit ? 'Save changes' : 'Create service'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              <X className="size-4" /> Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const { pushNotification } = useApp();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const list = await fetchServices();
      setServices(list);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(saved) {
    setServices((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      return exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved];
    });
    pushNotification({
      title: formMode === 'create' ? 'Service created' : 'Service updated',
      body: `"${saved.name}" has been saved.`,
      tone: 'success',
    });
    setFormMode(null);
  }

  async function handleToggleOpen(service) {
    setTogglingId(service.id);
    try {
      const saved = await updateService(service.id, {
        name: service.name,
        description: service.description,
        duration: service.duration,
        priority: service.priority,
        open: !service.open,
      });
      setServices((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      pushNotification({
        title: saved.open ? 'Queue opened' : 'Queue closed',
        body: `${saved.name} is now ${saved.open ? 'open' : 'closed'} to students.`,
        tone: 'info',
      });
    } catch (err) {
      pushNotification({ title: 'Could not update service', body: err.message, tone: 'warning' });
    } finally {
      setTogglingId(null);
    }
  }

  if (formMode) {
    return (
      <ServiceForm
        initial={formMode === 'create' ? null : formMode}
        onCancel={() => setFormMode(null)}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading services…' : `${services.length} service${services.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setFormMode('create')}>
            <Plus className="size-3.5" /> New service
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((s) => (
            <Card key={s.id} className={!s.open ? 'opacity-80' : ''}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                  </div>
                  <PriorityBadge priority={s.priority} />
                </div>

                <div className="flex items-center gap-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                  <span>~{s.duration} min avg session</span>
                  <span className="h-4 w-px bg-border" />
                  <span className={s.open ? 'font-medium text-primary' : 'font-medium'}>
                    {s.open ? 'Open' : 'Closed'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setFormMode(s)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleToggleOpen(s)}
                    disabled={togglingId === s.id}
                  >
                    {togglingId === s.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : s.open ? (
                      <Lock className="size-4" />
                    ) : (
                      <Unlock className="size-4" />
                    )}
                    {s.open ? 'Close' : 'Open'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No services yet. Create one to start accepting students into a queue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function QueueManagement() {
  const [services, setServices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [queueData, setQueueData] = useState(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState('');
  const { pushNotification } = useApp();

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const list = await fetchServices();
      setServices(list);
      setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const loadQueue = useCallback(async (serviceId) => {
    if (!serviceId) return;
    setLoadingQueue(true);
    setError('');
    try {
      const data = await fetchQueue(serviceId);
      setQueueData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (selectedId) loadQueue(selectedId);
  }, [selectedId, loadQueue]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedId) ?? null,
    [services, selectedId],
  );

  async function handleServeNext() {
    if (!selectedId) return;
    setServing(true);
    try {
      const result = await serveNext(selectedId);
      setQueueData({
        serviceId: selectedId,
        serviceName: selectedService?.name,
        count: result.queue.length,
        queue: result.queue,
      });
      pushNotification({
        title: 'Now serving',
        body: `${result.served.studentName} is now being served.`,
        tone: 'success',
      });
    } catch (err) {
      pushNotification({ title: 'Could not serve next student', body: err.message, tone: 'warning' });
    } finally {
      setServing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {loadingServices && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selectedId === s.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {s.name}
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => selectedId && loadQueue(selectedId)}
          disabled={loadingQueue || !selectedId}
        >
          <RefreshCw className={`size-3.5 ${loadingQueue ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{selectedService?.name ?? 'Select a service'}</CardTitle>
            <CardDescription>
              {queueData ? `${queueData.count} waiting` : loadingQueue ? 'Loading…' : 'No service selected'}
            </CardDescription>
          </div>
          <Button onClick={handleServeNext} disabled={serving || !queueData?.queue?.length}>
            {serving ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
            Serve next
          </Button>
        </CardHeader>
        <CardContent>
          {loadingQueue ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : queueData?.queue?.length ? (
            <ul className="divide-y divide-border">
              {queueData.queue.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {entry.position}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{entry.studentName}</p>
                      <p className="text-xs text-muted-foreground">{formatWait(entry.estimatedWaitMinutes)}</p>
                    </div>
                  </div>
                  <PriorityBadge priority={entry.priority} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No one is waiting for this service right now.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Admin() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [view, setView] = useState('services');

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  if (!user) return null;

  const { title, subtitle } = meta[view];

  return (
    <AppShell nav={nav} active={view} onNavigate={setView} title={title} subtitle={subtitle}>
      {view === 'services' && <ServiceManagement />}
      {view === 'queue' && <QueueManagement />}
    </AppShell>
  );
}

export default Admin;