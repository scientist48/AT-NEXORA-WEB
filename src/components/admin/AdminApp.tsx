import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type SubmitEvent } from 'react';

/* ───────────────────────── Types ───────────────────────── */

const STATUSES = ['new', 'contacted', 'in_progress', 'completed', 'archived'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  new: 'New',
  contacted: 'Contacted',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_STYLE: Record<Status, string> = {
  new: 'bg-lime text-ink',
  contacted: 'bg-ice text-navy',
  in_progress: 'bg-navy text-pearl',
  completed: 'bg-paper text-navy ring-1 ring-inset ring-navy/30',
  archived: 'bg-silver text-ink-soft',
};

interface Inquiry {
  id: string;
  name: string;
  email: string;
  company: string;
  service: string;
  budget: string;
  message: string;
  consent: number;
  status: Status;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Recent {
  id: string;
  name: string;
  company: string;
  service: string;
  status: Status;
  created_at: string;
}

interface ListResponse {
  items: Inquiry[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  stats: Record<'total' | Status, number>;
  recent: Recent[];
}

interface Filters {
  q: string;
  status: '' | Status;
  service: string;
  from: string;
  to: string;
  sort: 'newest' | 'oldest';
  page: number;
}

const EMPTY_FILTERS: Filters = { q: '', status: '', service: '', from: '', to: '', sort: 'newest', page: 1 };

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* ───────────────────────── Helpers ───────────────────────── */

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const fmt = (iso: string) => dateFmt.format(new Date(iso));
const fmtShort = (iso: string) => shortFmt.format(new Date(iso));

function filtersFromUrl(): Filters {
  const p = new URLSearchParams(window.location.search);
  const status = p.get('status') ?? '';
  return {
    q: p.get('q') ?? '',
    status: (STATUSES as readonly string[]).includes(status) ? (status as Status) : '',
    service: p.get('service') ?? '',
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
    sort: p.get('sort') === 'oldest' ? 'oldest' : 'newest',
    page: Math.max(1, Number(p.get('page')) || 1),
  };
}

function toQuery(f: Filters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.status) p.set('status', f.status);
  if (f.service) p.set('service', f.service);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.sort !== 'newest') p.set('sort', f.sort);
  if (f.page > 1) p.set('page', String(f.page));
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

/* ───────────────────────── Small UI pieces ───────────────────────── */

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-3 text-ink-soft">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
      {label}
    </span>
  );
}

const inputCls =
  'block w-full rounded-[0.625rem] border border-navy/25 bg-paper px-3.5 py-2.5 text-[0.9375rem] text-ink transition-colors hover:border-navy/50 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20';
const labelCls = 'mb-1.5 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-soft';

function Field({ label, htmlFor, children, className = '' }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* ───────────────────────── Main app ───────────────────────── */

export default function AdminApp({ services }: { services: string[] }) {
  const [session, setSession] = useState<{ username: string; csrfToken: string } | null>(null);
  const [filters, setFilters] = useState<Filters>(() => filtersFromUrl());
  const [search, setSearch] = useState(filters.q);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('id'));
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((kind: 'ok' | 'error', text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ kind, text });
    toastTimer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/json');
      if (init.body) headers.set('Content-Type', 'application/json');
      if (init.method && init.method !== 'GET' && session) headers.set('X-CSRF-Token', session.csrfToken);
      const res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.replace('/admin/login/');
        throw new ApiError(401, 'Your session has ended. Please sign in again.');
      }
      if (!res.ok || body.ok === false) throw new ApiError(res.status, body.message ?? `Request failed (${res.status}).`);
      return body as T;
    },
    [session],
  );

  // Session bootstrap
  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        if (res.status === 401) return window.location.replace('/admin/login/');
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.message ?? 'Could not load session.');
        setSession({ username: body.username, csrfToken: body.csrfToken });
      })
      .catch((e: Error) => {
        setListError(e.message);
        setLoading(false);
      });
  }, []);

  // Debounced search → filters
  useEffect(() => {
    const t = window.setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim(), page: 1 })), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  // Keep the URL in sync so views can be bookmarked and refreshed.
  useEffect(() => {
    history.replaceState(null, '', `/admin/${toQuery(filters, { id: selectedId ?? '' })}`);
  }, [filters, selectedId]);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setListError('');
    try {
      const res = await api<ListResponse>(`/api/admin/inquiries${toQuery(filters, { pageSize: '20' })}`);
      setData(res);
      if (res.page > res.pages && res.pages >= 1) setFilters((f) => ({ ...f, page: res.pages }));
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, filters, session]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const hasFilters = filters.q || filters.status || filters.service || filters.from || filters.to;

  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST' });
    } catch {
      /* fall through */
    }
    window.location.replace('/admin/login/');
  };

  const statCards = useMemo(
    () => [
      { key: '' as const, label: 'Total', value: data?.stats.total ?? 0 },
      ...STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], value: data?.stats[s] ?? 0 })),
    ],
    [data],
  );

  return (
    <div className="shell pb-20 pt-8 md:pt-12">
      {/* Title bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-navy">Inquiry management</p>
          <h1 className="t-d3 mt-3 text-navy">Project inquiries</h1>
        </div>
        <div className="flex items-center gap-3">
          {session && <span className="text-sm text-ink-soft">Signed in as <strong className="font-medium text-navy">{session.username}</strong></span>}
          <button type="button" onClick={() => void load()} className="btn btn-ghost !min-h-10 !px-4 !py-2 text-sm" disabled={loading}>
            Refresh
          </button>
          <button type="button" onClick={() => void logout()} className="btn btn-primary !min-h-10 !px-4 !py-2 text-sm">
            Sign out
          </button>
        </div>
      </div>

      {/* Overview */}
      <section aria-label="Overview" className="mt-8 grid gap-4 lg:grid-cols-12 lg:items-start">
        <ul className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3 lg:col-span-8">
          {statCards.map((c) => {
            const active = filters.status === c.key;
            return (
              <li key={c.label}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ status: c.key })}
                  className={`flex h-full w-full flex-col items-start rounded-[var(--radius-frame)] border p-4 text-left transition-colors ${
                    active ? 'border-navy bg-navy text-pearl' : 'border-silver bg-paper text-navy hover:border-navy/40'
                  }`}
                >
                  <span className={`font-mono text-[0.6875rem] uppercase tracking-[0.12em] ${active ? 'text-navy-mist' : 'text-ink-soft'}`}>{c.label}</span>
                  <span className="mt-2 font-display text-[2rem] font-semibold leading-none tracking-[-0.03em]">{data ? c.value : '–'}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="rounded-[var(--radius-frame)] border border-silver bg-paper p-4 lg:col-span-4">
          <h2 className={labelCls}>Most recent</h2>
          {!data ? (
            <p className="text-sm text-ink-soft">–</p>
          ) : data.recent.length === 0 ? (
            <p className="text-sm text-ink-soft">No inquiries yet.</p>
          ) : (
            <ul className="divide-y divide-silver">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelectedId(r.id)} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-navy">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-navy">{r.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{fmtShort(r.created_at)} · {r.service}</span>
                    </span>
                    <StatusBadge status={r.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Filters */}
      <section aria-label="Search and filters" className="mt-8 rounded-[var(--radius-frame)] border border-silver bg-paper p-4 sm:p-5">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search" htmlFor="f-q" className="sm:col-span-2">
            <input id="f-q" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, company, message or ID" className={inputCls} />
          </Field>
          <Field label="Status" htmlFor="f-status">
            <select id="f-status" value={filters.status} onChange={(e) => update({ status: e.target.value as Filters['status'] })} className={inputCls}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service" htmlFor="f-service">
            <select id="f-service" value={filters.service} onChange={(e) => update({ service: e.target.value })} className={inputCls}>
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="From" htmlFor="f-from">
            <input id="f-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => update({ from: e.target.value })} className={inputCls} />
          </Field>
          <Field label="To" htmlFor="f-to">
            <input id="f-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => update({ to: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Sort" htmlFor="f-sort" className="sm:col-span-2">
            <select id="f-sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value as Filters['sort'] })} className={inputCls}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </Field>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p role="status" aria-live="polite" className="text-ink-soft">
            {data ? `${data.total} ${data.total === 1 ? 'inquiry' : 'inquiries'}${hasFilters ? ' match the current filters' : ''}` : ''}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
              }}
              className="font-medium text-navy underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* List */}
      <section aria-label="Inquiries" aria-busy={loading} className="mt-6">
        {listError ? (
          <div role="alert" className="rounded-[var(--radius-frame)] border border-danger/30 bg-paper p-6">
            <p className="font-medium text-danger">Could not load inquiries.</p>
            <p className="mt-1 text-sm text-ink-soft">{listError}</p>
            <button type="button" onClick={() => void load()} className="btn btn-primary mt-4 !min-h-10 text-sm">
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="rounded-[var(--radius-frame)] border border-silver bg-paper p-10 text-center">
            <Spinner label="Loading inquiries…" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded-[var(--radius-frame)] border border-dashed border-navy/25 bg-paper p-10 text-center">
            <p className="font-display text-xl font-semibold text-navy">{hasFilters ? 'No inquiries match these filters.' : 'No inquiries yet.'}</p>
            <p className="mt-2 text-sm text-ink-soft">{hasFilters ? 'Try a different search or clear the filters.' : 'New submissions from the contact form will appear here.'}</p>
          </div>
        ) : (
          <div className={`overflow-hidden rounded-[var(--radius-frame)] border border-silver bg-paper transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <div className="hidden grid-cols-[8rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_8rem_9rem] gap-4 border-b border-silver bg-pearl px-5 py-3 lg:grid">
              {['Reference', 'Client', 'Service', 'Budget', 'Status', 'Received'].map((h) => (
                <span key={h} className={labelCls + ' !mb-0'}>
                  {h}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-silver">
              {data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="grid w-full gap-x-4 gap-y-1.5 px-4 py-4 text-left transition-colors hover:bg-ice-soft focus-visible:bg-ice-soft sm:px-5 lg:grid-cols-[8rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_8rem_9rem] lg:items-center"
                    aria-label={`Open inquiry ${item.id} from ${item.name}`}
                  >
                    <span className="flex items-center justify-between gap-3 lg:block">
                      <span className="font-mono text-xs text-ink-soft">{item.id}</span>
                      <span className="lg:hidden">
                        <StatusBadge status={item.status} />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-navy">{item.name}</span>
                      <span className="block truncate text-sm text-ink-soft">
                        {item.email}
                        {item.company ? ` · ${item.company}` : ''}
                      </span>
                    </span>
                    <span className="truncate text-sm text-ink">{item.service}</span>
                    <span className="hidden truncate text-sm text-ink-soft lg:block">{item.budget}</span>
                    <span className="hidden lg:block">
                      <StatusBadge status={item.status} />
                    </span>
                    <span className="text-xs text-ink-soft lg:text-sm">{fmt(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.pages > 1 && (
          <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-4">
            <button type="button" className="btn btn-ghost !min-h-10 !px-4 text-sm" disabled={filters.page <= 1 || loading} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
              Previous
            </button>
            <span className="text-sm text-ink-soft">
              Page {data.page} of {data.pages}
            </span>
            <button type="button" className="btn btn-ghost !min-h-10 !px-4 text-sm" disabled={filters.page >= data.pages || loading} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
              Next
            </button>
          </nav>
        )}
      </section>

      {selectedId && session && (
        <InquiryDrawer
          id={selectedId}
          api={api}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
          onDeleted={() => {
            setSelectedId(null);
            notify('ok', 'Inquiry deleted.');
            void load();
          }}
          notify={notify}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4">
        {toast && (
          <p
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-full px-5 py-3 text-sm font-medium shadow-lg ${toast.kind === 'ok' ? 'bg-navy text-pearl' : 'bg-danger text-paper'}`}
          >
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Detail drawer ───────────────────────── */

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;

function InquiryDrawer({
  id,
  api,
  onClose,
  onChanged,
  onDeleted,
  notify,
}: {
  id: string;
  api: Api;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
  notify: (kind: 'ok' | 'error', text: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<Inquiry | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<'' | 'status' | 'notes' | 'delete'>('');

  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      if (d?.open) d.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    setError('');
    api<{ item: Inquiry }>(`/api/admin/inquiries/${encodeURIComponent(id)}`)
      .then((r) => {
        if (cancelled) return;
        setItem(r.item);
        setNotes(r.item.notes);
      })
      .catch((e: ApiError) => !cancelled && setError(e.status === 404 ? 'This inquiry no longer exists.' : e.message));
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  const patch = async (body: Partial<Pick<Inquiry, 'status' | 'notes'>>, kind: 'status' | 'notes') => {
    setSaving(kind);
    try {
      const r = await api<{ item: Inquiry }>(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
      setItem(r.item);
      if (kind === 'notes') setNotes(r.item.notes);
      notify('ok', kind === 'status' ? `Status changed to ${STATUS_LABEL[r.item.status]}.` : 'Notes saved.');
      onChanged();
    } catch (e) {
      notify('error', (e as Error).message);
    } finally {
      setSaving('');
    }
  };

  const remove = async () => {
    setSaving('delete');
    try {
      await api(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: 'DELETE' });
      confirmDialog.current?.close();
      onDeleted();
    } catch (e) {
      notify('error', (e as Error).message);
      setSaving('');
    }
  };

  const notesDirty = item !== null && notes.trim() !== item.notes;

  const requestClose = () => {
    if (notesDirty && !window.confirm('Discard unsaved notes?')) return;
    onClose();
  };

  const onNotesSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (notesDirty) void patch({ notes }, 'notes');
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="inq-title"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => e.target === dialog.current && requestClose()}
      className="admin-drawer m-0 ml-auto h-dvh max-h-none w-full max-w-2xl border-0 bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-none items-center justify-between gap-4 border-b border-silver px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="font-mono text-xs text-ink-soft">{id}</p>
            <h2 id="inq-title" className="truncate font-display text-2xl font-semibold tracking-[-0.025em] text-navy">
              {item?.name ?? 'Inquiry'}
            </h2>
          </div>
          <button type="button" onClick={requestClose} className="grid h-11 w-11 flex-none place-items-center rounded-full border border-navy/20 text-navy hover:bg-navy hover:text-pearl" aria-label="Close inquiry">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-8">
          {error ? (
            <p role="alert" className="rounded-[0.625rem] border border-danger/30 p-4 text-danger">
              {error}
            </p>
          ) : !item ? (
            <Spinner label="Loading inquiry…" />
          ) : (
            <div className="grid gap-8">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={item.status} />
                <span className="text-sm text-ink-soft">Received {fmt(item.created_at)}</span>
              </div>

              <dl className="grid gap-x-8 gap-y-5 border-y border-silver py-6 sm:grid-cols-2">
                {[
                  ['Email', <a key="e" href={`mailto:${item.email}`} className="break-all font-medium text-navy underline underline-offset-4">{item.email}</a>],
                  ['Company', item.company || '—'],
                  ['Service required', item.service],
                  ['Budget range', item.budget],
                  ['Submitted', fmt(item.created_at)],
                  ['Last updated', fmt(item.updated_at)],
                  ['Privacy consent', item.consent ? 'Given' : 'Not recorded'],
                  ['Reference', <span key="r" className="font-mono text-sm">{item.id}</span>],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <dt className={labelCls}>{k}</dt>
                    <dd className="text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <h3 className={labelCls}>Project description</h3>
                <p className="whitespace-pre-wrap break-words rounded-[0.625rem] bg-pearl p-4 leading-relaxed text-ink">{item.message}</p>
              </div>

              <div>
                <label htmlFor="inq-status" className={labelCls}>
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <select
                    id="inq-status"
                    value={item.status}
                    disabled={saving !== ''}
                    onChange={(e) => void patch({ status: e.target.value as Status }, 'status')}
                    className={inputCls + ' max-w-xs'}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  {saving === 'status' && <Spinner label="Saving…" />}
                </div>
              </div>

              <form onSubmit={onNotesSubmit}>
                <label htmlFor="inq-notes" className={labelCls}>
                  Internal notes <span className="normal-case tracking-normal">(private, never shown to the client)</span>
                </label>
                <textarea id="inq-notes" rows={6} maxLength={10000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls + ' resize-y'} placeholder="Call notes, next steps, follow-up dates…" />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button type="submit" className="btn btn-primary !min-h-10 !px-5 text-sm" disabled={!notesDirty || saving !== ''}>
                    {saving === 'notes' ? 'Saving…' : 'Save notes'}
                  </button>
                  {notesDirty && saving !== 'notes' && <span className="text-sm text-ink-soft">Unsaved changes</span>}
                </div>
              </form>

              <div className="flex flex-wrap gap-3 border-t border-silver pt-6">
                <a href={`mailto:${item.email}?subject=${encodeURIComponent(`Your enquiry ${item.id} — AT NEXORA Technologies`)}`} className="btn btn-ghost !min-h-10 !px-5 text-sm">
                  Reply by email
                </a>
                <button type="button" onClick={() => confirmDialog.current?.showModal()} className="btn !min-h-10 border-danger/40 !px-5 text-sm text-danger hover:bg-danger hover:text-paper" disabled={saving !== ''}>
                  Delete inquiry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <dialog ref={confirmDialog} aria-labelledby="confirm-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-panel)] border-0 bg-paper p-6 text-ink shadow-2xl backdrop:bg-ink/50">
        <h3 id="confirm-title" className="font-display text-xl font-semibold text-navy">
          Delete this inquiry?
        </h3>
        <p className="mt-2 text-ink-soft">
          {item ? `${item.name} (${item.id})` : id} will be permanently removed, including internal notes. This cannot be undone.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-ghost !min-h-10 !px-5 text-sm" onClick={() => confirmDialog.current?.close()} disabled={saving === 'delete'}>
            Cancel
          </button>
          <button type="button" className="btn !min-h-10 bg-danger !px-5 text-sm text-paper hover:bg-ink" onClick={() => void remove()} disabled={saving === 'delete'}>
            {saving === 'delete' ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </dialog>
    </dialog>
  );
}
