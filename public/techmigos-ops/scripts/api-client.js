(() => {
  const waitForRepository = async () => (await window.tmCrmReady).repository;
  const call = async (path, options = {}) => (await waitForRepository()).request(path, options);
  const json = (value) => JSON.stringify(value);
  const numberOrNull = (value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };
  const projectStatus = (value) => ({ Planning: 'planning', 'In Progress': 'active', 'On Track': 'active', 'At Risk': 'active', Completed: 'completed' }[value] || String(value || 'planning').toLowerCase().replace(/\s+/g, '_'));
  const projectHealth = (value) => ({ 'On Track': 'on_track', 'At Risk': 'at_risk' }[value] || 'on_track');
  const profileRole = (value) => ({ Admin: 'company_admin', Client: 'client' }[value] || 'company_member');

  window.TechMigosAPI = {
    list: (resource) => call(`/api/portal/${resource}`),
    createProject: (payload) => call('/api/portal/projects', { method: 'POST', body: json({
      name: payload.name,
      client_id: numberOrNull(payload.client_id),
      client_name: payload.client || null,
      project_manager: payload.projectManager,
      budget: numberOrNull(payload.budget) || 0,
      status: projectStatus(payload.status),
      health: projectHealth(payload.status),
      due_date: payload.endDate || null,
      notes: payload.notes || null,
    }) }),
    createUser: (payload) => call('/api/portal/profiles', { method: 'POST', body: json({
      operation: 'invite',
      name: payload.name,
      email: payload.email,
      role: profileRole(payload.role),
      status: String(payload.status || 'Active').toLowerCase() === 'active' ? 'active' : 'invited',
      department: payload.department || null,
      client_id: numberOrNull(payload.client_id),
    }) }),
    replyToTicket: (ticketId, message, internal = false) => call(`/api/portal/tickets/${encodeURIComponent(ticketId)}/messages`, { method: 'POST', body: json({ message, internal }) }),
    listTicketMessages: (ticketId) => call(`/api/portal/tickets/${encodeURIComponent(ticketId)}/messages`),
    uploadFile: async (file, projectId) => {
      const id = numberOrNull(projectId || window.__TECHMIGOS_DEFAULT_PROJECT_ID__);
      if (!id) throw new Error('Choose a project before uploading files.');
      const item = await (await waitForRepository()).uploadProjectFile(id, null, file);
      return { ok: true, data: item };
    },
    saveSettings: (payload) => call('/api/portal/settings/company', { method: 'PATCH', body: json(payload) }),
    archiveRecord: (kind, id) => call(`/api/portal/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    downloadProjectFile: async (id) => (await waitForRepository()).getProjectFileUrl(id, { download: true }),
  };
})();
