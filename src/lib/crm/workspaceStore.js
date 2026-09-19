export function createWorkspaceStore(initial = {}) {
  const listeners = new Set();
  const state = {
    profile: null,
    collections: {},
    loading: false,
    error: null,
    stale: false,
    ...initial,
  };

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  return {
    getState() { return state; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setProfile(profile) { state.profile = profile; notify(); },
    setLoading(loading) { state.loading = loading; notify(); },
    setError(error) { state.error = error || null; notify(); },
    markStale(stale = true) { state.stale = stale; notify(); },
    setCollection(name, records) {
      state.collections[name] = Array.isArray(records) ? records : [];
      state.stale = false;
      notify();
    },
    replaceCollections(collections) {
      state.collections = { ...collections };
      state.stale = false;
      notify();
    },
    invalidate(...names) {
      names.forEach((name) => { delete state.collections[name]; });
      state.stale = true;
      notify();
    },
    select(name, predicate = () => true) {
      return (state.collections[name] || []).filter(predicate);
    },
    selectById(name, id) {
      return (state.collections[name] || []).find((record) => String(record.id) === String(id)) || null;
    },
    selectRelated(name, foreignKey, id) {
      return (state.collections[name] || []).filter((record) => String(record[foreignKey]) === String(id));
    },
    projectClient(project) {
      return project?.client_id == null ? null : this.selectById('clients', project.client_id);
    },
    projectMembers(project) {
      return project?.id == null ? [] : this.selectRelated('project_members', 'project_id', project.id);
    },
    ticketProject(ticket) {
      return ticket?.project_id == null ? null : this.selectById('projects', ticket.project_id);
    },
    ticketClient(ticket) {
      return ticket?.client_id == null ? null : this.selectById('clients', ticket.client_id);
    },
    invoiceProject(invoice) {
      return invoice?.project_id == null ? null : this.selectById('projects', invoice.project_id);
    },
    invoiceClient(invoice) {
      return invoice?.client_id == null ? null : this.selectById('clients', invoice.client_id);
    },
  };
}
