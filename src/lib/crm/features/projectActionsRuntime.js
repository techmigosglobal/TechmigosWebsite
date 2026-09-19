/* Project list and detail actions dispatched from the CRM root. */

export function createProjectActionsRuntime({ state, documentRef, renderProjects, els, renderProjectDetail, replaceSafeMarkup }) {
  function updateStatusFilter(element, clear = false) {
    state.projectStatusFilter = clear ? '' : element.dataset.projectStatusTab || '';
    if (clear) state.projectSearch = '';
    renderProjects();
    return true;
  }

  function toggleProjectMenu(element, event) {
    event.stopPropagation();
    documentRef.querySelectorAll('.project-reference-menu.is-open').forEach((menu) => menu.classList.remove('is-open'));
    const menu = [...documentRef.querySelectorAll('[data-project-menu-panel]')]
      .find((item) => item.dataset.projectMenuPanel === element.dataset.projectMenuTrigger);
    menu?.classList.toggle('is-open');
    element.setAttribute('aria-expanded', menu?.classList.contains('is-open') ? 'true' : 'false');
    return true;
  }

  function openProjectDetail(element) {
    const project = state.data.projects.find((item) => String(item.id) === String(element.dataset.projectDetail));
    if (!project) return true;
    els.modalTitle.textContent = 'Project details';
    replaceSafeMarkup(els.modalBody, renderProjectDetail(project));
    els.modal.classList.add('open');
    return true;
  }

  function handleInput(element) {
    if (!element?.matches?.('#pm-search')) return false;
    state.projectSearch = element.value;
    renderProjects();
    return true;
  }

  function handleChange(element) {
    if (!element?.matches?.('#project-status-filter')) return false;
    state.projectStatusFilter = element.value;
    renderProjects();
    return true;
  }

  function handleClick(element, event) {
    if (element.matches('[data-project-status-tab]')) return updateStatusFilter(element);
    if (element.matches('[data-project-clear-filters]')) return updateStatusFilter(element, true);
    if (element.matches('[data-project-menu-trigger]')) return toggleProjectMenu(element, event);
    if (element.matches('[data-project-detail]')) {
      event.stopPropagation();
      return openProjectDetail(element);
    }
    return false;
  }

  return { handleClick, handleInput, handleChange };
}
