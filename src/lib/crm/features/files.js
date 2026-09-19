import { replaceSafeMarkup } from '../safeMarkup.js';

export function renderFilesReference(context) {
  const { state, els, isCompanyAdmin, canWrite, crmProjectIcon, escapeHtml, clientName } = context;
  const projects = state.data.projects || [];
  const projectFolders = state.data.project_folders || [];
  const projectFiles = state.data.project_files || [];
  const requestedProjectId = String(state.fileProjectId || '');
  const selectedProjectId = state.fileProjectPicker ? '' : (projects.some((project) => String(project.id) === requestedProjectId) ? requestedProjectId : String(projects[0]?.id || ''));
  const project = projects.find((item) => String(item.id) === selectedProjectId);
  state.fileProjectId = selectedProjectId;
  const selectedFolderId = String(state.fileFolderId || '');
  const folders = projectFolders.filter((folder) => String(folder.project_id) === selectedProjectId).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const query = String(state.fileSearch || '').trim().toLowerCase();
  const visibleFiles = projectFiles.filter((file) => String(file.project_id) === selectedProjectId && (!selectedFolderId || String(file.folder_id || '') === selectedFolderId));
  const files = (query ? visibleFiles.filter((file) => String(file.original_name || '').toLowerCase().includes(query)) : visibleFiles).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const selectedFile = files.find((file) => String(file.id) === String(state.fileSelectedId)) || visibleFiles.find((file) => String(file.id) === String(state.fileSelectedId));
  const profileByAuthId = new Map((state.data.profiles || []).map((profile) => [String(profile.auth_user_id), profile]));
  const humanSize = (size) => {
    const bytes = Number(size || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const fileKind = (file) => {
    const mime = String(file?.mime_type || '').toLowerCase();
    const name = String(file?.original_name || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
    if (mime.includes('figma') || name.endsWith('.fig') || name.endsWith('.figma')) return 'design';
    if (mime.includes('zip') || mime.includes('archive') || /\.(zip|rar|7z|tar|gz)$/.test(name)) return 'archive';
    if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(csv|xls|xlsx)$/.test(name)) return 'spreadsheet';
    if (mime.includes('presentation') || /\.(ppt|pptx|key)$/.test(name)) return 'presentation';
    if (mime.includes('word') || mime.includes('document') || /\.(doc|docx|odt|rtf|txt)$/.test(name)) return 'document';
    if (mime.startsWith('video/')) return 'video';
    return 'generic';
  };
  const fileIcon = (file) => ({ image: crmProjectIcon('image'), pdf: crmProjectIcon('reports'), design: crmProjectIcon('layers'), archive: crmProjectIcon('archive'), spreadsheet: crmProjectIcon('spreadsheet'), presentation: crmProjectIcon('presentation'), document: crmProjectIcon('document'), video: crmProjectIcon('video'), generic: crmProjectIcon('file') }[fileKind(file)] || crmProjectIcon('file'));
  const folderTone = (folder, index = 0) => {
    const name = String(folder?.name || '').toLowerCase();
    if (name.includes('design')) return 'orange';
    if (name.includes('document')) return 'blue';
    if (name.includes('development') || name.includes('dev')) return 'green';
    if (name.includes('asset')) return 'purple';
    if (name.includes('feedback')) return 'red';
    if (name.includes('archive')) return 'brown';
    return ['blue', 'orange', 'green', 'purple', 'red', 'brown'][index % 6];
  };
  const fileDate = (file) => file?.created_at ? new Date(file.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fileCount = (projectId, folderId = null) => projectFiles.filter((file) => String(file.project_id) === String(projectId) && (folderId === null || String(file.folder_id || '') === String(folderId))).length;
  const projectNav = projects.map((item) => `<button class="files-reference-project-nav-item${String(item.id) === selectedProjectId ? ' active' : ''}" data-project-files-select="${item.id}" type="button"><span class="files-reference-project-nav-icon">${crmProjectIcon('folder')}</span><span><strong>${escapeHtml(item.name)}</strong><small>${fileCount(item.id)} ${fileCount(item.id) === 1 ? 'file' : 'files'}</small></span></button>`).join('');
  const folderCards = folders.map((folder, index) => `<article class="files-reference-folder-card files-reference-folder-card--${folderTone(folder, index)}${String(folder.id) === selectedFolderId ? ' active' : ''}"><button data-project-folder-open="${folder.id}" type="button"><span class="files-reference-folder-icon">${crmProjectIcon('folder')}</span><strong>${escapeHtml(folder.name)}</strong><small>${fileCount(selectedProjectId, folder.id)} ${fileCount(selectedProjectId, folder.id) === 1 ? 'file' : 'files'}</small></button>${isCompanyAdmin() ? `<button class="files-reference-folder-more" data-project-folder-rename-start="${folder.id}" type="button" aria-label="Rename ${escapeHtml(folder.name)}">•••</button>` : ''}</article>`).join('');
  const fileCards = files.map((file) => {
    const uploader = profileByAuthId.get(String(file.uploaded_by));
    const kind = fileKind(file);
    return `<button class="files-reference-file-card files-reference-file-card--${kind}${String(file.id) === String(state.fileSelectedId) ? ' active' : ''}" data-project-file-select="${file.id}" type="button"><span class="files-reference-file-icon">${fileIcon(file)}</span><span class="files-reference-file-copy"><strong>${escapeHtml(file.original_name || 'Untitled file')}</strong><small>${escapeHtml(file.mime_type || 'File')} · ${humanSize(file.size_bytes)}</small><small>${escapeHtml(uploader?.name || 'Company member')} · ${fileDate(file)}</small></span><span class="files-reference-file-chevron" aria-hidden="true">›</span></button>`;
  }).join('');
  const previewKind = (file) => {
    const mime = String(file?.mime_type || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf' || mime.includes('pdf')) return 'pdf';
    return 'unsupported';
  };
  const selectedFilePreview = selectedFile ? `<div class="files-reference-preview" data-project-file-preview="${selectedFile.id}"><div class="files-reference-preview-loading"><span>${fileIcon(selectedFile)}</span><p>Loading preview…</p></div></div>` : '';
  const selectedFileDetail = selectedFile ? `<div class="files-reference-detail-heading"><span class="files-reference-detail-icon files-reference-detail-icon--${fileKind(selectedFile)}">${fileIcon(selectedFile)}</span><div><h2>${escapeHtml(selectedFile.original_name || 'Untitled file')}</h2><p>${escapeHtml(selectedFile.mime_type || 'File')} · ${humanSize(selectedFile.size_bytes)}</p></div></div>${selectedFilePreview}<dl class="files-reference-detail-meta"><div><dt>Uploaded by</dt><dd>${escapeHtml(profileByAuthId.get(String(selectedFile.uploaded_by))?.name || 'Company member')}</dd></div><div><dt>Added</dt><dd>${fileDate(selectedFile)}</dd></div><div><dt>Access</dt><dd><span class="files-reference-visibility">${crmProjectIcon('lock')} Internal workspace</span></dd></div></dl><div class="files-reference-detail-actions"><button class="crm-button primary" data-project-file-open="${selectedFile.id}" type="button">Open preview</button><button class="crm-button" data-project-file-download="${selectedFile.id}" type="button">Download</button><button class="crm-button" data-project-file-share="${selectedFile.id}" type="button">Copy link</button>${isCompanyAdmin() ? `<button class="crm-button danger" data-project-file-delete="${selectedFile.id}" type="button">Delete</button>` : ''}</div>` : `<div class="files-reference-detail-empty"><span>${crmProjectIcon('folder')}</span><strong>Select a file</strong><p>Choose a file to preview metadata and available actions.</p></div>`;
  const emptyWorkspace = !project ? `<div class="files-reference-empty"><div class="files-reference-empty-illustration">${crmProjectIcon('folder')}</div><h2>${projects.length ? 'Select a project' : 'No projects assigned'}</h2><p>${projects.length ? 'Choose a project to browse its live files and folders.' : 'Your assigned project files will appear here.'}</p></div>` : (!folders.length && !files.length ? `<div class="files-reference-empty"><div class="files-reference-empty-illustration">${crmProjectIcon('folder')}</div><h2>No files yet</h2><p>Upload a document or create a folder to get started.</p><button class="files-reference-empty-action" data-project-folder-create type="button">+ New folder</button></div>` : '');
  const uploadAllowed = Boolean(project && canWrite('project_files'));
  const folderContent = !selectedFolderId && folders.length ? `<div class="files-reference-folder-grid" aria-label="Folders">${folderCards}</div>` : '';
  const fileContent = (selectedFolderId || !folders.length) && files.length ? `<div class="files-reference-files-${state.fileView === 'list' ? 'list' : 'grid'}" aria-label="Files">${fileCards}</div>` : '';
  const emptyFolder = project && selectedFolderId && !files.length ? `<div class="files-reference-empty"><div class="files-reference-empty-illustration">${crmProjectIcon('folder')}</div><h2>No files in this folder</h2><p>Upload a file here or return to All Files to choose another folder.</p></div>` : '';

  replaceSafeMarkup(els.view, `<section class="files-reference-header"><div><h1>Project Files</h1><p>Organize, access, and share project documents securely.</p></div>${uploadAllowed ? `<label class="crm-button primary files-reference-header-upload">+ Upload files<input type="file" data-project-file-upload="${selectedProjectId}" multiple hidden /></label>` : ''}</section><section class="files-reference-layout"><aside class="files-reference-project-nav" aria-label="Project navigation"><div class="files-reference-project-nav-head"><div><h2>Projects</h2><p>Choose a workspace</p></div><span>${projects.length}</span></div><div class="files-reference-project-nav-list">${projectNav || '<p class="crm-empty">No assigned projects.</p>'}</div></aside><div class="files-reference-browser"><header class="files-reference-browser-head"><div><div class="files-reference-breadcrumb"><span>Project Files</span><b>/</b><strong>${escapeHtml(project?.name || 'No project')}</strong>${selectedFolderId ? `<b>/</b><strong>${escapeHtml(folders.find((folder) => String(folder.id) === selectedFolderId)?.name || 'Folder')}</strong>` : ''}</div><p>${files.length} ${files.length === 1 ? 'file' : 'files'} ${selectedFolderId ? 'in this folder' : 'in this workspace'}</p></div><div class="files-reference-browser-actions"><button class="files-reference-view-button${state.fileView !== 'list' ? ' active' : ''}" data-project-files-view="grid" type="button" aria-label="Grid view" aria-pressed="${state.fileView !== 'list'}">${crmProjectIcon('layers')}</button><button class="files-reference-view-button${state.fileView === 'list' ? ' active' : ''}" data-project-files-view="list" type="button" aria-label="List view" aria-pressed="${state.fileView === 'list'}">${crmProjectIcon('reports')}</button><select id="project-files-folder" class="files-reference-sort" aria-label="Filter by folder"><option value="">All folders</option>${folders.map((folder) => `<option value="${folder.id}"${String(folder.id) === selectedFolderId ? ' selected' : ''}>${escapeHtml(folder.name)}</option>`).join('')}</select><button class="crm-button" data-project-folder-create type="button" ${project ? '' : 'disabled'}>+ New folder</button>${isCompanyAdmin() && project ? '<button class="crm-button" id="project-members-manage" type="button">Assign team</button>' : ''}</div></header><label class="files-reference-dropzone${uploadAllowed ? '' : ' is-disabled'}"><span class="files-reference-dropzone-icon">${crmProjectIcon('upload')}</span><span><strong>${uploadAllowed ? `Drop files here or browse ${selectedFolderId ? 'in this folder' : ''}` : 'File upload unavailable'}</strong><small>${uploadAllowed ? 'Documents, images, and PDFs up to 50 MB' : 'You do not have upload permission for this workspace.'}</small></span>${uploadAllowed ? `<input type="file" data-project-file-upload="${selectedProjectId}" multiple hidden />` : ''}</label><div class="files-reference-content">${emptyWorkspace || emptyFolder || folderContent || fileContent || '<p class="crm-empty">No files match the current search.</p>'}</div></div><aside class="files-reference-detail" aria-label="File details"><header><h2>File details</h2><button class="files-reference-detail-close" data-project-file-clear type="button" aria-label="Close file details">×</button></header>${selectedFileDetail}</aside></section>`);
  const browserActions = els.view.querySelector('.files-reference-browser-actions');
  if (browserActions) replaceSafeMarkup(browserActions, `<label class="files-reference-field files-reference-field--search"><span class="sr-only">Find a file</span><span class="files-reference-search-wrap"><span class="files-reference-search-icon" aria-hidden="true">⌕</span><input id="project-files-search" class="files-reference-input" value="${escapeHtml(state.fileSearch)}" placeholder="Search files" /></span></label>${browserActions.innerHTML}`);
  const projectNavAside = els.view.querySelector('.files-reference-project-nav');
  if (projectNavAside && project) {
    const clientLabel = project.client_name || clientName(project.client_id) || 'Internal project';
    replaceSafeMarkup(projectNavAside, `<button class="files-reference-projects-back" data-files-projects-back type="button">←&nbsp; Projects</button><div class="files-reference-selected-project"><span class="files-reference-selected-project-mark">${escapeHtml(String(project.name || 'P').trim().slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(project.name)}</strong><small>Project #${escapeHtml(project.id)} · ${escapeHtml(clientLabel)}</small></span></div><div class="files-reference-project-nav-list"><button class="files-reference-project-nav-item files-reference-project-nav-item--blue${!selectedFolderId ? ' active' : ''}" data-project-folder-open="" type="button"><span class="files-reference-project-nav-icon">${crmProjectIcon('folder')}</span><span><strong>All Files</strong><small>${fileCount(selectedProjectId)} ${fileCount(selectedProjectId) === 1 ? 'file' : 'files'}</small></span></button>${folders.map((folder, index) => `<button class="files-reference-project-nav-item files-reference-project-nav-item--${folderTone(folder, index)}${String(folder.id) === selectedFolderId ? ' active' : ''}" data-project-folder-open="${folder.id}" type="button"><span class="files-reference-project-nav-icon">${crmProjectIcon('folder')}</span><span><strong>${escapeHtml(folder.name)}</strong><small>${fileCount(selectedProjectId, folder.id)} ${fileCount(selectedProjectId, folder.id) === 1 ? 'file' : 'files'}</small></span></button>`).join('')}</div><button class="files-reference-new-folder" data-project-folder-create type="button">+&nbsp; New Folder</button>`);
    const filesHeading = els.view.querySelector('.files-reference-header h1');
    const filesSubtitle = els.view.querySelector('.files-reference-header p');
    if (filesHeading) filesHeading.textContent = 'All Files';
    if (filesSubtitle) filesSubtitle.textContent = `${project.name} · ${files.length} ${files.length === 1 ? 'item' : 'items'}`;
  }

  const loadFilePreview = async (file) => {
    const preview = els.view.querySelector(`[data-project-file-preview="${file.id}"]`);
    if (!preview) return;
    const kind = previewKind(file);
    if (kind === 'unsupported') {
      replaceSafeMarkup(preview, `<div class="files-reference-preview-empty"><span>${fileIcon(file)}</span><strong>Preview unavailable</strong><p>Use Open preview or Download to view this file.</p></div>`);
      return;
    }
    try {
      const url = await window.tmCrm.repository.getProjectFileUrl(file.id);
      if (!preview.isConnected || String(state.fileSelectedId) !== String(file.id)) return;
      const label = escapeHtml(file.original_name || 'selected file');
      const loading = `<div class="files-reference-preview-loading" data-project-file-preview-loading><span>${fileIcon(file)}</span><p>Loading preview…</p></div>`;
      replaceSafeMarkup(preview, kind === 'image'
        ? `${loading}<img src="${escapeHtml(url)}" alt="Preview of ${label}" />`
        : `${loading}<iframe src="${escapeHtml(url)}" title="Preview of ${label}"></iframe>`);
      const showPreviewError = () => {
        if (preview.isConnected) replaceSafeMarkup(preview, `<div class="files-reference-preview-empty"><span>${fileIcon(file)}</span><strong>Preview unavailable</strong><p>Use Open preview or Download to view this file.</p></div>`);
      };
      const media = preview.querySelector('img, iframe');
      media?.addEventListener('load', () => preview.querySelector('[data-project-file-preview-loading]')?.remove(), { once: true });
      media?.addEventListener('error', showPreviewError, { once: true });
      if (media instanceof HTMLImageElement && media.complete) {
        if (media.naturalWidth > 0) media.dispatchEvent(new Event('load'));
        else showPreviewError();
      }
    } catch (error) {
      if (preview.isConnected) replaceSafeMarkup(preview, `<div class="files-reference-preview-empty"><span>${fileIcon(file)}</span><strong>Preview unavailable</strong><p>${escapeHtml(error instanceof Error ? error.message : 'The secure preview could not be loaded.')}</p></div>`);
    }
  };
  if (selectedFile) requestAnimationFrame(() => loadFilePreview(selectedFile));

}
