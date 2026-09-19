export function createSupportRuntime({ state, els, renderTicketDetail, replaceSafeMarkup, renderTickets }) {
  function handleInput(element) {
    if (!element?.matches?.('#tic-search')) return false;
    state.ticketSearch = element.value;
    renderTickets();
    return true;
  }

  function handleChange(element) {
    if (element?.matches?.('#tic-status-filter')) state.ticketStatusFilter = element.value;
    else if (element?.matches?.('#tic-priority-filter')) state.ticketPriorityFilter = element.value;
    else return false;
    renderTickets();
    return true;
  }

  function handleClick(element, event) {
    if (element.matches('[data-ticket-detail]')) {
      event.stopPropagation();
      if (event.target?.closest?.('[data-row-select],[data-edit-resource],[data-delete-resource],[data-quick-patch]')) return true;
      const ticket = state.data.tickets.find((item) => String(item.id) === String(element.dataset.ticketDetail));
      if (!ticket) return true;
      state.selectedTicketId = ticket.id;
      els.modalTitle.textContent = 'Ticket details';
      replaceSafeMarkup(els.modalBody, `<div class="ticket-reference-drawer-content">${renderTicketDetail(ticket)}</div>`);
      els.modal.classList.add('open');
      return true;
    }
    if (!element.matches('#tic-view-board, #tic-view-list')) return false;
    state.ticketView = element.id === 'tic-view-board' ? 'board' : 'list';
    renderTickets();
    return true;
  }

  return { handleClick, handleInput, handleChange };
}
