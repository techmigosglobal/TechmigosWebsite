/**
 * Form mutations are delegated from the CRM root just like button actions.
 * Keeping this workflow separate prevents a renderer refresh from registering
 * duplicate submit handlers and keeps relationship/action logic in one place.
 */
export function createCrmFormEvents({
  events,
  state,
  els,
  isEmployee,
  isCompanyAdmin,
  portal,
  repository,
  toast,
  loadData,
  replaceSafeMarkup,
  renderTicketDetail,
  handleCrmEditSubmit,
  submitProjectFolder,
  submitDataReview,
  syncIdentity,
}) {
  function bind() {
    events.on('submit', async (event) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || !events.isSurface(form)) return;
      if (form.matches('#crm-edit-form')) {
        event.preventDefault();
        return handleCrmEditSubmit(form);
      }
      if (form.matches('[data-ticket-message-form]')) {
        event.preventDefault();
        const ticketId = form.dataset.ticketMessageId;
        const submitButton = form.querySelector('button[type="submit"]');
        const body = Object.fromEntries(new FormData(form).entries());
        body.internal = isEmployee() || body.visibility === 'internal';
        delete body.visibility;
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Sending…';
        }
        try {
          await portal(`/api/portal/tickets/${encodeURIComponent(ticketId)}/messages`, { method: 'POST', body: JSON.stringify(body) });
          toast(body.internal ? 'Internal note saved.' : 'External reply sent.');
          await loadData();
          const updatedTicket = state.data.tickets.find((item) => String(item.id) === String(ticketId));
          if (updatedTicket) replaceSafeMarkup(els.modalBody, renderTicketDetail(updatedTicket));
        } catch (error) {
          toast(error instanceof Error ? error.message : 'Could not send ticket message.');
        } finally {
          if (submitButton?.isConnected) {
            submitButton.disabled = false;
            submitButton.textContent = isEmployee() ? 'Save internal note' : 'Send message';
          }
        }
        return;
      }
      if (form.matches('#project-folder-form')) {
        event.preventDefault();
        return submitProjectFolder(form);
      }
      if (form.matches('#project-members-form')) {
        event.preventDefault();
        const ids = [...new FormData(form).getAll('profile_id')].map(Number);
        try {
          if (!repository?.setProjectMembers) throw new Error('Operations repository is unavailable. Please refresh the page.');
          await repository.setProjectMembers(Number(form.dataset.projectMembersProjectId), ids);
          els.modal.classList.remove('open');
          toast('Project team updated.');
          await loadData();
        } catch (error) { toast(error instanceof Error ? error.message : 'Could not update project members.'); }
        return;
      }
      if (form.matches('#crm-profile-form')) {
        event.preventDefault();
        if (!isCompanyAdmin()) return;
        const body = { name: form.querySelector('[name="name"]')?.value.trim(), email: form.querySelector('[name="email"]')?.value.trim() };
        try {
          if (state.profile?.id) await portal(`/api/portal/profiles/${state.profile.id}`, { method: 'PATCH', body: JSON.stringify(body) });
          else { state.profile = { ...state.profile, ...body }; syncIdentity({ ...state.profile, ...body }); }
          els.modal.classList.remove('open');
          toast('Profile updated');
          if (state.profile?.id) await loadData();
        } catch (error) { toast(error instanceof Error ? error.message : 'Profile update failed'); }
        return;
      }
      if (form.matches('#crm-data-review-form')) {
        event.preventDefault();
        return submitDataReview(form);
      }
    });
  }

  return { bind };
}
