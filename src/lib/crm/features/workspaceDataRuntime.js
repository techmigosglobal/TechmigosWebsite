/**
 * Owns the authenticated workspace's cache-first, database-authoritative data
 * lifecycle. Browser effects are injected so hydration and failure behavior
 * can be exercised without booting the CRM shell.
 */
export function createWorkspaceDataRuntime({
  state,
  workspaceStore,
  storage,
  loadSnapshot,
  normalizeFinanceRecords,
  render,
  setStatus,
  logger = console,
}) {
  function cacheKey(kind) {
    const userId = state.cacheUserId || state.profile?.auth_user_id || 'session';
    const role = state.profile?.role || 'unknown';
    return `tm_crm_${kind}_${userId}_${role}`;
  }

  function normalizeCollections(source = {}) {
    return Object.fromEntries(Object.keys(state.data).map((name) => [
      name,
      name === 'finances'
        ? normalizeFinanceRecords(source[name])
        : (Array.isArray(source[name]) ? source[name] : []),
    ]));
  }

  async function loadData({ skipCache = false } = {}) {
    workspaceStore.setLoading(true);
    workspaceStore.setError(null);

    try {
      const cached = skipCache ? null : storage.getItem(cacheKey('data'));
      if (cached) {
        state.data = normalizeCollections(JSON.parse(cached));
        setStatus('Syncing with database...', 'success');
        render();
        workspaceStore.markStale(true);
      } else {
        setStatus('Loading Operations & Management data...');
      }
    } catch (error) {
      logger.warn('Cache load failed:', error);
      setStatus('Loading Operations & Management data...');
    }

    try {
      const snapshot = await loadSnapshot();
      state.data = normalizeCollections(snapshot.data);
      try {
        storage.setItem(cacheKey('data'), JSON.stringify(state.data));
      } catch (error) {
        logger.warn('Cache write failed:', error);
      }

      setStatus('', 'success');
      workspaceStore.replaceCollections(state.data);
      render();
    } catch (error) {
      logger.error(error);
      workspaceStore.setError(error instanceof Error ? error : new Error('Sync failed'));
      setStatus(error instanceof Error ? error.message : 'Sync failed', 'error');
    } finally {
      workspaceStore.setLoading(false);
    }
  }

  return { cacheKey, loadData };
}
