import { replaceSafeMarkup } from '../safeMarkup.js';

/**
 * Browser actions for the private project drive. Rendering stays in files.js;
 * this module owns only the user actions that need the repository boundary.
 */
export function createFilesRuntime(context) {
  const {
    state,
    els,
    isCompanyAdmin,
    canWrite,
    portal,
    toast,
    loadData,
    escapeHtml,
    projectDeliveryPeople,
    renderFiles,
    window: browserWindow = globalThis.window,
    navigator: browserNavigator = globalThis.navigator,
    confirmAction = (message) => globalThis.confirm(message),
  } = context;

  function handleFileWorkspaceNavigation(element) {
    if (element.matches('[data-project-files-open]')) {
      browserWindow.location.href = `/company/files?project=${encodeURIComponent(element.dataset.projectFilesOpen || '')}`;
      return true;
    }
    if (element.matches('[data-project-files-select]')) {
      state.fileProjectPicker = false;
      state.fileProjectId = element.dataset.projectFilesSelect || '';
      state.fileFolderId = '';
      state.fileSelectedId = null;
      state.fileSearch = '';
      renderFiles();
      return true;
    }
    if (element.matches('[data-files-projects-back]')) {
      state.fileProjectPicker = true;
      state.fileProjectId = '';
      state.fileFolderId = '';
      state.fileSelectedId = null;
      state.fileSearch = '';
      renderFiles();
      return true;
    }
    if (!element.matches('[data-project-files-view]')) return false;
    state.fileView = element.dataset.projectFilesView || 'grid';
    renderFiles();
    return true;
  }

  function handleProjectFolderAction(element) {
    if (element.matches('[data-project-folder-create]')) {
      createProjectFolder();
      return true;
    }
    if (element.matches('[data-project-folder-open]')) {
      state.fileFolderId = element.dataset.projectFolderOpen || '';
      state.fileSelectedId = null;
      renderFiles();
      return true;
    }
    if (!element.matches('[data-project-folder-rename-start]')) return false;
    renameProjectFolder(element.dataset.projectFolderRenameStart);
    return true;
  }

  async function handleProjectFileAction(element, event) {
    if (element.matches('[data-project-file-select]')) {
      state.fileSelectedId = element.dataset.projectFileSelect || null;
      renderFiles();
      return true;
    }
    if (element.matches('[data-project-file-clear]')) {
      state.fileSelectedId = null;
      renderFiles();
      return true;
    }
    if (element.matches('[data-project-file-open], [data-project-file-download]')) {
      await openProjectFile(element);
      return true;
    }
    if (element.matches('[data-project-file-share]')) {
      await shareProjectFile(element);
      return true;
    }
    if (element.matches('[data-project-file-delete]')) {
      await deleteProjectFile(element, event);
      return true;
    }
    if (!element.matches('[data-project-members-manage], #project-members-manage')) return false;
    openProjectMembers(state.fileProjectId);
    return true;
  }

  async function openProjectFile(element) {
    try {
      const download = element.matches('[data-project-file-download]');
      const fileId = element.dataset.projectFileOpen || element.dataset.projectFileDownload;
      const url = await browserWindow.tmCrm.repository.getProjectFileUrl(fileId, { download });
      browserWindow.open(url, '_blank', 'noopener');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not access project file.');
    }
  }

  async function shareProjectFile(element) {
    const link = `${browserWindow.location.origin}/company/files?project=${encodeURIComponent(state.fileProjectId || '')}&file=${encodeURIComponent(element.dataset.projectFileShare || '')}`;
    try {
      await browserNavigator.clipboard.writeText(link);
      toast('Workspace link copied.');
    } catch {
      toast(link);
    }
  }

  async function deleteProjectFile(element, event) {
    event.stopPropagation();
    if (!confirmAction('Delete this internal project file?')) return;
    try {
      await browserWindow.tmCrm.repository.deleteProjectFile(element.dataset.projectFileDelete);
      state.fileSelectedId = null;
      toast('Project file deleted.');
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not delete project file.');
    }
  }

  async function handleClick(element, event) {
    if (handleFileWorkspaceNavigation(element)) return true;
    if (handleProjectFolderAction(element)) return true;
    return handleProjectFileAction(element, event);
  }

  function handleInput(element) {
    if (!element?.matches?.('#project-files-search')) return false;
    state.fileSearch = element.value;
    renderFiles();
    return true;
  }

  async function handleChange(element) {
    if (element?.matches?.('#project-files-folder')) {
      state.fileFolderId = element.value;
      state.fileSelectedId = null;
      renderFiles();
      return true;
    }
    if (!element?.matches?.('[data-project-file-upload]')) return false;
    await uploadProjectFiles(element, element.files);
    return true;
  }

  async function uploadProjectFiles(input, fileList) {
    const uploadFiles = Array.from(fileList || []).filter((file) => file && typeof file.size === 'number');
    const projectId = Number(state.fileProjectId);
    const folderId = state.fileFolderId ? Number(state.fileFolderId) : null;
    if (!uploadFiles.length || !Number.isInteger(projectId) || !canWrite('project_files')) return;
    input && (input.disabled = true);
    try {
      for (const file of uploadFiles) await browserWindow.tmCrm.repository.uploadProjectFile(projectId, folderId, file);
      toast(`${uploadFiles.length} ${uploadFiles.length === 1 ? 'file' : 'files'} uploaded.`);
      state.fileSelectedId = null;
      await loadData();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not upload project files.');
    } finally {
      if (input?.isConnected) { input.disabled = false; input.value = ''; }
    }
  }

  function openProjectFolderDialog(folderId = '') {
    const projectId = Number(state.fileProjectId);
    const editing = Boolean(folderId);
    if (!Number.isInteger(projectId) || (!editing && !canWrite('project_folders')) || (editing && !isCompanyAdmin())) return;
    const folder = state.data.project_folders.find((item) => String(item.id) === String(folderId));
    els.modalTitle.textContent = editing ? 'Rename folder' : 'Create folder';
    replaceSafeMarkup(els.modalBody, `<form id="project-folder-form" class="crm-form-grid" data-project-folder-project-id="${escapeHtml(projectId)}" data-project-folder-id="${escapeHtml(folderId)}"><label class="wide">Folder name<input name="name" required maxlength="120" autocomplete="off" value="${escapeHtml(folder?.name || '')}" placeholder="e.g. Deliverables" /></label><p class="crm-help wide">Folder names can be up to 120 characters. Access follows the project’s role and membership policy.</p><div class="crm-toolbar wide"><button class="crm-button" type="button" data-drawer-cancel>Cancel</button><button class="crm-button primary" type="submit">${editing ? 'Save name' : 'Create folder'}</button></div><p class="crm-form-status wide" data-form-submit-status role="status"></p></form>`);
    els.modal.classList.add('open');
    els.modalBody.querySelector('[name="name"]')?.focus();
  }

  function createProjectFolder() {
    openProjectFolderDialog();
  }

  function renameProjectFolder(folderId) {
    openProjectFolderDialog(folderId);
  }

  async function submitProjectFolder(form) {
    const projectId = Number(form.dataset.projectFolderProjectId);
    const folderId = form.dataset.projectFolderId || '';
    const name = String(new FormData(form).get('name') || '').trim();
    const submitButton = form.querySelector('button[type="submit"]');
    const formStatus = form.querySelector('[data-form-submit-status]');
    if (!name) {
      if (formStatus) formStatus.textContent = 'Folder name is required.';
      return;
    }
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = folderId ? 'Saving…' : 'Creating…';
    }
    try {
      const response = folderId
        ? await portal(`/api/portal/project_folders/${encodeURIComponent(folderId)}`, { method: 'PATCH', body: JSON.stringify({ name }) })
        : await portal('/api/portal/project_folders', { method: 'POST', body: JSON.stringify({ project_id: projectId, name, created_by: state.profile.auth_user_id }) });
      if (!folderId && response.item?.id) state.fileFolderId = String(response.item.id);
      els.modal.classList.remove('open');
      toast(folderId ? 'Folder renamed.' : 'Folder created.');
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : folderId ? 'Could not rename folder.' : 'Could not create folder.';
      if (formStatus) formStatus.textContent = message;
      toast(message);
    } finally {
      if (submitButton?.isConnected) {
        submitButton.disabled = false;
        submitButton.textContent = folderId ? 'Save name' : 'Create folder';
      }
    }
  }

  function openProjectMembers(projectId) {
    if (!isCompanyAdmin()) return toast('Only company admins can assign project teams.');
    const assigned = new Set(state.data.project_members
      .filter((member) => String(member.project_id) === String(projectId))
      .map((member) => String(member.profile_id)));
    const people = projectDeliveryPeople();
    els.modalTitle.textContent = 'Assign project team';
    replaceSafeMarkup(els.modalBody, `<form id="project-members-form" class="project-members-form" data-project-members-project-id="${escapeHtml(projectId)}"><p class="project-members-help">Select every active admin or employee who should have access to this project, its tickets, and its internal files.</p><div class="project-members-list">${people.map((person) => {
      const roleLabel = person.role === 'company_admin' ? 'Admin' : 'Employee';
      const details = [roleLabel, person.department, person.email || person.username].filter(Boolean).join(' · ');
      return `<label class="project-member-option"><input type="checkbox" name="profile_id" value="${person.id}"${assigned.has(String(person.id)) ? ' checked' : ''} /><span class="project-member-option-copy"><strong>${escapeHtml(person.name || person.email || 'Unnamed user')}</strong><small>${escapeHtml(details)}</small></span></label>`;
    }).join('') || '<p class="crm-empty">No active company users available.</p>'}</div><button class="crm-button primary" type="submit">Save assignment</button></form>`);
    els.modal.classList.add('open');
  }

  return {
    uploadProjectFiles,
    openProjectFolderDialog,
    createProjectFolder,
    renameProjectFolder,
    submitProjectFolder,
    openProjectMembers,
    handleClick,
    handleInput,
    handleChange,
  };
}
