    import { canAccessCrmRoute, hrefForRoute } from '../lib/crm/routePolicy.js';
    import { createWorkspaceStore } from '../lib/crm/workspaceStore.js';
    import { createWorkspaceDataRuntime } from '../lib/crm/features/workspaceDataRuntime.js';
    import { createWorkspaceNavigationClickHandler } from '../lib/crm/features/workspaceNavigationActions.js';
    import { canCreate as canCreateResourceRole } from '../lib/crm/permissions.js';
    import {
      invoiceEffectiveStatus,
      invoicePaidAmount,
      invoiceBalance,
      invoiceTotal,
      isSettledFinance,
      isSettledInvoice,
      normalizeFinanceRecords,
      normalizedStatus,
      selectFinanceSheetRows,
      FINANCE_SETTLED_TRANSACTION_STATUSES as SETTLED_INVOICE_TRANSACTION_STATUSES,
      sumAmounts,
    } from '../lib/crm/finance.js';
    import { renderDashboard as renderDashboardFeature } from '../lib/crm/features/dashboard.js';
    import { renderAnalytics as renderAnalyticsFeature } from '../lib/crm/features/analytics.js';
    import { renderReports as renderReportsFeature } from '../lib/crm/features/reports.js';
    import { buildReportDefinitions } from '../lib/crm/features/reportData.js';
    import { renderFilesReference as renderFilesFeature } from '../lib/crm/features/files.js';
    import { createFilesRuntime } from '../lib/crm/features/filesRuntime.js';
    import { renderProjects as renderProjectsFeature, renderProjectDetail } from '../lib/crm/features/projects.js';
    import { renderTickets as renderTicketsFeature, renderTicketDetail } from '../lib/crm/features/support.js';
    import { createSupportRuntime } from '../lib/crm/features/supportRuntime.js';
    import { createPeopleFeatures, createPeopleSelectionActions } from '../lib/crm/features/people.js';
    import { renderUsers as renderUsersFeature } from '../lib/crm/features/users.js';
    import { renderSettings as renderSettingsFeature } from '../lib/crm/features/settings.js';
    import { createSettingsRuntime } from '../lib/crm/features/settingsRuntime.js';
    import { createFinanceProofRuntime } from '../lib/crm/features/financeProofRuntime.js';
    import { createReportExportRuntime } from '../lib/crm/features/reportExportRuntime.js';
    import { closeDialogLayers, dismissDialogFromClick, trapDialogTab } from '../lib/crm/features/dialogUtils.js';
    import { renderFinance as renderFinanceFeature } from '../lib/crm/features/finance.js';
    import { renderInvoiceBuilder as renderInvoiceBuilderFeature } from '../lib/crm/features/invoiceBuilder.js';
    import { initInvoiceBuilder as initInvoiceBuilderFeature } from '../lib/crm/features/invoiceBuilderRuntime.js';
    import { initAccounting as initAccountingFeature } from '../lib/crm/features/financeRuntime.js';
    import { createFinanceLedgerRuntime } from '../lib/crm/features/financeLedgerRuntime.js';
    import { createFinanceActionsRuntime } from '../lib/crm/features/financeActionsRuntime.js';
    import { createProjectActionsRuntime } from '../lib/crm/features/projectActionsRuntime.js';
    import { crmIconMarkup } from '../lib/crm/icons.js';
    import { findClientName, findProjectName, filterWorkspaceRows, generateProfileUsername as createProfileUsername, generateTemporaryPassword as createTemporaryPassword, removeCachedWorkspaceRecord, sanitizeWorkspacePayload, validateWorkspacePayload, workspaceRoleLabel } from '../lib/crm/features/workspaceUtils.js';
    import { buildUpiPaymentUri, buildUpiQrUrl, getInvoicePrintName, invoiceBranding } from '../lib/crm/invoice.js';
    import { renderInvoiceHtml } from '../lib/crm/invoiceHtml.js';
    import { setPopupDocument } from '../lib/crm/popup.js';
    import { replaceSafeMarkup } from '../lib/crm/safeMarkup.js';
    import { badge, compactMoney, currentWeekLabel, daysUntil, dueBadge, escapeHtml, metric, money, nice, pageHead, rowActions as renderRowActions, statusTone, table } from '../lib/crm/ui.js';
    import { createOperationsForms } from '../lib/crm/features/operationsForms.js';
    import { createOperationsWorkflow } from '../lib/crm/features/operationsWorkflow.js';
    import { createOperationsOverlays } from '../lib/crm/features/operationsOverlays.js';
    import { createRecordActions } from '../lib/crm/features/recordActions.js';
    import { createWorkspaceContext } from '../lib/crm/features/workspaceContext.js';
    import { createInvoicePreviewRuntime } from '../lib/crm/features/invoicePreviewRuntime.js';
    import { createCrmDelegatedEvents } from '../lib/crm/features/delegatedEvents.js';
    import { createCrmFormEvents } from '../lib/crm/features/formEvents.js';

    const workspaceStore = createWorkspaceStore();

    const activeTab = document.querySelector('[data-crm-active-tab]')?.dataset.crmActiveTab || 'dashboard';

    const state = {
      active: activeTab,
      search: '',
      financeStatusFilter: '',
      financeProofFilter: 'all',
      financeEditMode: false,
      financeDensity: 'comfortable',
      profile: null,
      companySettings: {},
      invoiceSettings: {},
      cacheUserId: null,
      selectedProjectId: null,
      selectedTicketId: null,
      selectedClientId: null,
      selectedEmployeeId: null,
      financeSheet: 'all',
      invoiceBuilderActive: false,
      invoiceBuilderId: null,
      reportType: 'executive',
      reportFrom: '',
      reportTo: '',
      projectStatusFilter: '',
      clientStatusFilter: '',
      usersSearch: '',
      usersRoleFilter: 'all',
      usersStatusFilter: 'all',
      usersSection: 'directory',
      userCreateClientId: '',
      accTab: 'overview',
      accSubTab: 'all',
      accSearch: '',
      accTxPage: 1,
      accSelectedId: null,
      accInlineFinanceId: null,
      accInlineFinanceType: null,
      invoiceBuilderActions: null,
      projectView: 'board',
      projectSearch: '',
      dashboardProjectSearch: '',
      dashboardProjectStatusFilter: '',
      fileProjectId: '',
      fileFolderId: '',
      fileProjectPicker: false,
      fileRenameId: null,
      fileSearch: '',
      fileView: 'grid',
      fileSelectedId: null,
      ticketView: 'list',
      ticketStatusFilter: '',
      ticketPriorityFilter: '',
      ticketSearch: '',
      saveTimers: new Map(),
      rowSaveStates: new Map(),
      data: {
        clients: [],
        projects: [],
        tickets: [],
        invoices: [],
        invoice_items: [],
        finances: [],
        activities: [],
        profiles: [],
        project_members: [],
        project_folders: [],
        project_files: [],
        ticket_messages: [],
      },
    };

    const els = {
      nav: document.getElementById('crm-nav'),
      view: document.getElementById('crm-view'),
      search: document.getElementById('crm-search'),
      status: document.getElementById('crm-status'),
      toast: document.getElementById('crm-toast'),
      modal: document.getElementById('crm-modal'),
      modalTitle: document.getElementById('crm-modal-title'),
      modalBody: document.getElementById('crm-modal-body'),
      invoiceModal: document.getElementById('invoice-modal'),
      invoicePreview: document.getElementById('invoice-preview'),
      invoicePreviewTitle: document.getElementById('invoice-preview-title'),
      actionbar: document.getElementById('crm-actionbar'),
      selectedCount: document.getElementById('crm-selected-count'),
      invoiceHover: document.getElementById('invoice-hover-preview'),
      proofPreviewModal: document.getElementById('proof-preview-modal'),
      proofPreviewBody: document.getElementById('proof-preview-body'),
    };

    const {
      proofIconMarkup,
      outstandingInvoiceRows,
      outstandingInvoiceAmount,
      outstandingExpenseRows,
      outstandingExpenseAmount,
      invoicePaymentProfile,
      invoiceLedgerRecord,
      invoiceLedgerEntryRows,
      incomeRows,
      expenseRows,
      toast,
      showToast,
      setStatus,
      isCompanyAdmin,
      canWrite,
      isEmployee,
      canUpdate,
      canDelete,
      portal,
      logout,
      clientName,
      projectName,
      filtered,
      rowActions,
      syncNavVisibility,
      syncIdentity,
    } = createWorkspaceContext({
      state,
      els,
      findClientName,
      findProjectName,
      filterWorkspaceRows,
      renderRowActions,
      workspaceRoleLabel,
      invoiceBranding,
    });

    const {
      printInvoiceMarkup,
      showInvoice,
      handleHover: handleInvoiceHover,
      handleHoverEnd: handleInvoiceHoverEnd,
    } = createInvoicePreviewRuntime({
      els,
      portal,
      setStatus,
      showToast,
      invoicePaymentProfile,
      clientName,
      invoiceEffectiveStatus,
      invoiceTotal,
      invoicePaidAmount,
      invoiceBalance,
      statusTone,
      badge,
      money,
      escapeHtml,
      renderInvoiceHtml,
      replaceSafeMarkup,
      setPopupDocument,
      windowRef: window,
    });

    const financeLedgerRuntime = createFinanceLedgerRuntime({
      state,
      portal,
      toast,
      render,
      bindActions,
      normalizePayload,
      validateWorkspacePayload,
      crmCacheKey,
      initAccountingFeature,
      expenseRows,
      incomeRows,
    });
    const {
      validateLedgerInput,
      moveLedgerFocus,
      inlineFinanceRowKey,
      inlineFinancePayload,
      upsertFinanceRecord,
      upsertInvoiceRecord,
      scheduleInlineFinanceSave,
      saveInlineFinanceRow,
      initAccounting,
      scheduleSave,
    } = financeLedgerRuntime;

    const operationsForms = createOperationsForms({
      state,
      escapeHtml,
      financeProofFieldMarkup: (...args) => financeProofFieldMarkup(...args),
      crmProjectIcon,
      normalizePayload: (resource, body) => sanitizeWorkspacePayload(resource, body),
      employeesFromState: (...args) => employeesFromState(...args),
      selectOpts,
    });
    const {
      formMarkup,
      chevron: operationsChevronIcon,
      projectDeliveryPeople,
      projectPayloadFromForm,
      projectMemberIds,
      bindDrawerSections: bindOperationsDrawerSections,
      syncDrawerState: syncOperationsDrawerState,
      syncProfileClientLinkFields,
      refreshLinkedClientProjectFields,
    } = operationsForms;

    function bindProfileClientLinkFields(form) {
      syncProfileClientLinkFields(form);
    }

    function bindLinkedClientProjectFields(form) {
      refreshLinkedClientProjectFields(form);
    }

    const operationsOverlays = createOperationsOverlays({
      state,
      els,
      escapeHtml,
      badge,
      compactMoney,
      invoiceBalance,
      invoiceEffectiveStatus,
      nice,
      statusTone,
      canAccessCrmRoute,
      isCompanyAdmin,
      bindActions,
      toast,
      loadData,
      repository: {
        purgeConfirmedRecords: (...args) => window.tmCrm.repository.purgeConfirmedRecords(...args),
      },
    });
    const {
      showCreatedLoginDialog,
      openDataReview,
      submitDataReview,
      openNotifications,
      openProfileManagement,
    } = operationsOverlays;

    const operationsWorkflow = createOperationsWorkflow({
      state,
      els,
      escapeHtml,
      employeesFromState: (...args) => employeesFromState(...args),
      formMarkup,
      selectOpts,
      projectPayloadFromForm,
      projectMemberIds,
      bindOperationsDrawerSections,
      bindLinkedClientProjectFields,
      bindFinanceProofField: (...args) => bindFinanceProofField(...args),
      bindProfileClientLinkFields,
      portal,
      toast,
      loadData,
      render,
      canWrite,
      isCompanyAdmin,
      isEmployee,
      canUpdate,
      findRecord,
      normalizePayload,
      validateWorkspacePayload,
      generateProfileUsername: (raw) => createProfileUsername(raw, state.data.profiles),
      createTemporaryPassword,
      nice,
      showCreatedLoginDialog,
      openInvoiceCreateIntegrated: (...args) => openInvoiceCreateIntegrated(...args),
      openInvoiceEditIntegrated: (...args) => openInvoiceEditIntegrated(...args),
      repository: {
        setProjectMembers: (...args) => window.tmCrm.repository.setProjectMembers(...args),
      },
    });
    const {
      openCreate,
      openEdit,
      handleCrmEditSubmit,
    } = operationsWorkflow;

    const {
      duplicateRecord,
      deleteRecord,
      quickPatch,
      updateSelectionBar,
      clearSelection,
      bulkDelete,
      bulkExport,
      exportRows,
      downloadCsv,
    } = createRecordActions({
      state,
      els,
      canWrite,
      canUpdate,
      canDelete,
      isCompanyAdmin,
      toast,
      portal,
      loadData,
      findRecord,
      normalizePayload,
    });

    const filesRuntime = createFilesRuntime({
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
      window,
      navigator,
      confirmAction: (message) => confirm(message),
    });
    const {
      uploadProjectFiles,
      submitProjectFolder,
    } = filesRuntime;
    const { saveSettingsSection } = createSettingsRuntime({ state, portal, toast });
    const supportRuntime = createSupportRuntime({
      state,
      els,
      renderTicketDetail: renderTicketDetailView,
      replaceSafeMarkup,
      renderTickets,
    });
    const financeProofRuntime = createFinanceProofRuntime({
      state,
      els,
      escapeHtml,
      proofIconMarkup,
      portal,
      toast,
      loadData,
      render,
    });
    const {
      resolveProofUrl,
      loadAutoProofPreviews,
      openProofPreview,
      openProofInNewTab,
      financeProofFieldMarkup,
      bindFinanceProofField,
    } = financeProofRuntime;
    const reportExportRuntime = createReportExportRuntime({
      state,
      currentReport,
      financeSheetRows,
      invoiceTotal,
      invoicePaidAmount,
      isSettledFinance,
      invoiceEffectiveStatus,
      compactMoney,
      resolveProofUrl,
      escapeHtml,
      downloadCsv,
      setPopupDocument,
      toast,
      renderReports,
      bindActions,
      documentRef: document,
    });
    const {
      printFinancePdf,
    } = reportExportRuntime;
    const financeActions = createFinanceActionsRuntime({
      state,
      render,
      renderFinance,
      bindActions,
      showInvoice,
      printInvoiceMarkup,
      getInvoicePrintName,
      showToast,
      openProofInNewTab,
      openProofPreview,
      printFinancePdf,
      portal,
      upsertFinanceRecord,
      inlineFinanceRowKey,
      inlineFinancePayload,
      scheduleInlineFinanceSave,
      validateLedgerInput,
      saveInlineFinanceRow,
      confirmAction: (message) => confirm(message),
      removeCachedWorkspaceRecord,
      storage: sessionStorage,
      crmCacheKey,
      loadData,
      toast,
      documentRef: document,
      clearTimeoutFn: clearTimeout,
    });
    const projectActions = createProjectActionsRuntime({
      state,
      documentRef: document,
      renderProjects,
      els,
      renderProjectDetail: renderProjectDetailView,
      replaceSafeMarkup,
    });

    function renderDashboard() {
      return renderDashboardFeature({
        state,
        els,
        isEmployee,
        pageHead,
        metric,
        canWrite,
        crmProjectIcon,
        escapeHtml,
        clientName,
        incomeRows,
        expenseRows,
        sumAmounts,
        outstandingInvoiceRows,
        invoiceBalance,
        compactMoney,
      });
    }

    function renderFiles() {
      return renderFilesFeature({
        state,
        els,
        isCompanyAdmin,
        canWrite,
        crmProjectIcon,
        escapeHtml,
        clientName,
      });
    }

    function crmProjectIcon(name) {
      return crmIconMarkup(name);
    }

    function canCreate(resource) {
      return canCreateResourceRole(state.profile?.role, resource);
    }

    function renderProjectDetailView(project) {
      return renderProjectDetail(project, {
        state,
        canWrite,
        canUpdate,
        isEmployee,
        crmProjectIcon,
        escapeHtml,
        clientName,
        compactMoney,
        daysUntil,
        dueBadge,
        badge,
        statusTone,
      });
    }

    function renderTicketDetailView(ticket) {
      return renderTicketDetail(ticket, {
        state,
        assignedUserName,
        clientName,
        projectName,
        crmProjectIcon,
        canCreate,
        canUpdate,
        isEmployee,
        isCompanyAdmin,
        escapeHtml,
        badge,
        nice,
      });
    }

    function renderProjects() {
      return renderProjectsFeature({
        state,
        els,
        canWrite,
        canUpdate,
        isEmployee,
        crmProjectIcon,
        escapeHtml,
        clientName,
        compactMoney,
        nice,
        statusTone,
      });
    }

    function renderTickets() {
      return renderTicketsFeature({
        state,
        els,
        assignedUserName,
        clientName,
        projectName,
        crmProjectIcon,
        canWrite,
        canUpdate,
        escapeHtml,
        table,
        rowActions,
        badge,
        statusTone,
        nice,
        onRerender: () => { renderTickets(); bindActions(); },
      });
    }
    function financeSheetRows() {
      return selectFinanceSheetRows({
        sheet: state.financeSheet,
        financeRecords: state.data.finances,
        invoiceRecords: state.data.invoices,
        selectIncomeRows: incomeRows,
        clientName,
        projectName,
      });
    }

    function financeSheetTabs() {
      const sheets = [
        ['all', 'All Records'],
        ['income', 'Income'],
        ['expenses', 'Expenses'],
        ['salary', 'Salary'],
        ['invoices', 'Invoices'],
      ];
      return `<div class="crm-sheet-tabs" role="tablist" aria-label="Finance sheets">${sheets.map(([key, label]) => `<button class="crm-sheet-tab ${state.financeSheet === key ? 'active' : ''}" data-finance-sheet="${key}" type="button" role="tab" aria-selected="${state.financeSheet === key}">${label}</button>`).join('')}</div>`;
    }

    function renderFinance() {
      return renderFinanceFeature({
        state,
        els,
        incomeRows,
        expenseRows,
        sumAmounts,
        normalizedStatus,
        outstandingInvoiceAmount,
        outstandingExpenseAmount,
        outstandingExpenseRows,
        canWrite,
        isCompanyAdmin,
        renderInvoiceBuilder,
        SETTLED_INVOICE_TRANSACTION_STATUSES,
        invoiceLedgerEntryRows,
        invoiceLedgerRecord,
        invoiceTotal,
        invoiceEffectiveStatus,
        invoicePaidAmount,
        isSettledInvoice,
        invoiceBalance,
        proofIconMarkup,
        crmProjectIcon,
        pageHead,
        escapeHtml,
        nice,
        table,
        initAccounting,
        initInvoiceBuilder,
        loadAutoProofPreviews,
        financeSheetTabs,
        badge,
      });
    }
    function renderInvoiceBuilder() {
      return renderInvoiceBuilderFeature({ state, escapeHtml });
    }
    function initInvoiceBuilder() {
      return initInvoiceBuilderFeature({
        bindActions,
        buildUpiPaymentUri,
        buildUpiQrUrl,
        escapeHtml,
        invoiceBranding,
        invoiceEffectiveStatus,
        invoicePaidAmount,
        invoicePaymentProfile,
        loadData,
        portal,
        renderFinance,
        showToast,
        state,
        upsertInvoiceRecord,
      });
    }

    function renderAnalytics() {
      return renderAnalyticsFeature({
        state,
        els,
        isEmployee,
        incomeRows,
        expenseRows,
        sumAmounts,
        groupCount,
        escapeHtml,
        nice,
        compactMoney,
        invoiceBalance,
        metric,
        crmProjectIcon,
        pageHead,
        currentWeekLabel,
        employeesFromState,
      });
    }
    function ensureReportDates() {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      if (!state.reportFrom) state.reportFrom = monthStart;
      if (!state.reportTo) state.reportTo = today;
    }

    function reportDefinitions() {
      return buildReportDefinitions({
        state,
        isEmployee,
        incomeRows,
        expenseRows,
        sumAmounts,
        outstandingInvoiceAmount,
        compactMoney,
        clientName,
        ensureReportDates,
      });
    }

    function currentReport() {
      const reports = reportDefinitions();
      if (isEmployee() && !['executive', 'projects', 'tickets'].includes(state.reportType)) state.reportType = 'executive';
      return reports[state.reportType] || reports.executive;
    }

    function reportTypesForRole() {
      const types = [
        ['executive', 'Executive Summary'],
        ['finance', 'Finance'],
        ['projects', 'Projects'],
        ['tickets', 'Support Tickets'],
        ['clients', 'Clients'],
      ];
      return isEmployee() ? types.filter(([key]) => ['executive', 'projects', 'tickets'].includes(key)) : types;
    }

    function reportTableRows(report) {
      return report.rows.map((row) => `<tr>${report.columns.map(([key]) => `<td>${escapeHtml(row[key] ?? '-')}</td>`).join('')}</tr>`).join('');
    }

    function renderReports() {
      ensureReportDates();
      return renderReportsFeature({
        state,
        els,
        pageHead,
        crmProjectIcon,
        escapeHtml,
        table,
        reportTableRows,
        metric,
        report: currentReport(),
        typeOptions: reportTypesForRole(),
      });
    }

    const peopleFeatures = createPeopleFeatures({
      state,
      els,
      filtered,
      invoiceBalance,
      invoiceTotal,
      invoiceEffectiveStatus,
      compactMoney,
      badge,
      escapeHtml,
      crmProjectIcon,
      canWrite,
      rowActions,
      pageHead,
      metric,
      table,
      nice,
      isCompanyAdmin,
    });
    const {
      usersAdminTabs,
      renderClients,
      renderEmployees,
      employeesFromState,
      employeeProjects,
      assignedUserName,
    } = peopleFeatures;
    const peopleActions = createPeopleSelectionActions({ state, renderUsers, renderClients, renderEmployees });


    function renderUsers() {
      return renderUsersFeature({
        state,
        els,
        employeeProjects,
        clientName,
        rowActions,
        usersAdminTabs,
        pageHead,
        metric,
        badge,
        crmProjectIcon,
        table,
        escapeHtml,
        nice,
        renderEmployees,
        renderClients,
      });
    }
    async function renderSettings() {
      return renderSettingsFeature({
        state,
        els,
        isCompanyAdmin,
        pageHead,
        escapeHtml,
        badge,
        crmProjectIcon,
        portal,
      });
    }



    function render() {
      workspaceStore.replaceCollections(state.data);
      workspaceStore.setProfile(state.profile);
      // Update notification badge
      const pendingCount = state.data.tickets.filter((t) => !['resolved','closed'].includes(t.status)).length
        + state.data.invoices.filter((i) => ['sent','overdue'].includes(invoiceEffectiveStatus(i))).length;
      const badgeEl = document.getElementById('crm-badge');
      if (badgeEl) { badgeEl.textContent = pendingCount; badgeEl.style.display = pendingCount ? '' : 'none'; }
      if (state.active === 'dashboard') renderDashboard();
      if (state.active === 'projects') renderProjects();
      if (state.active === 'files') renderFiles();
      if (state.active === 'support') renderTickets();
      if (state.active === 'finance') renderFinance();
      if (state.active === 'analytics') renderAnalytics();
      if (state.active === 'reports') renderReports();
      if (state.active === 'clients') renderClients();
      if (state.active === 'employees') renderEmployees();
      if (state.active === 'users') renderUsers();
      if (state.active === 'settings') renderSettings();
      bindActions();
    }

    function bindActions() {
      bindCrmDelegatedActions();
      updateSelectionBar();
    }

    function bindCrmDelegatedActions() {
      if (bindCrmDelegatedActions.bound) return;
      bindCrmDelegatedActions.bound = true;
      const crmRoot = document.querySelector('.crm-app');
      if (!crmRoot) return;
      const delegatedEvents = createCrmDelegatedEvents(crmRoot);
      const crmSurface = delegatedEvents.isSurface;
      createCrmFormEvents({
        events: delegatedEvents,
        state,
        els,
        isEmployee,
        isCompanyAdmin,
        portal,
        repository: window.tmCrm?.repository,
        toast,
        loadData,
        replaceSafeMarkup,
        renderTicketDetail: renderTicketDetailView,
        handleCrmEditSubmit,
        submitProjectFolder,
        submitDataReview,
        syncIdentity,
      }).bind();

      const handleWorkspaceNavigationClick = createWorkspaceNavigationClickHandler({
        state,
        document,
        window,
        navigator,
        confirmAction: (message) => confirm(message),
        replaceSafeMarkup,
        operationsChevronIcon,
        toggleSidebar,
        openNotifications,
        openProfileManagement,
        logout,
        loadData,
        toast,
        saveSettingsSection,
        renderUsers,
        openCreate,
        openDataReview,
      });

      delegatedEvents.on('click', async (event) => {
        const element = delegatedEvents.closestAction(event);
        if (!element) return;
        if (await handleWorkspaceNavigationClick(element, event)) return;
        if (dismissDialogFromClick(element, event, els)) return;
        if (await filesRuntime.handleClick(element, event)) return;
        if (supportRuntime.handleClick(element, event)) return;
        if (state.invoiceBuilderActions && await state.invoiceBuilderActions.handleClick(element, event)) return;
        if (await financeActions.handleClick(element, event)) return;
        if (projectActions.handleClick(element, event)) return;
        if (peopleActions.handleClick(element, event)) return;
        if (element.matches('#print-invoice')) {
          const invoiceNumber = els.invoicePreview?.dataset.invoiceNumber || 'invoice';
          const markup = els.invoicePreview?.innerHTML || '';
          if (markup) printInvoiceMarkup(markup, getInvoicePrintName(invoiceNumber));
          return;
        }
        if (element.matches('[data-edit-resource]')) {
          event.stopPropagation();
          return openEdit(element.dataset.editResource, element.dataset.editId);
        }
        if (element.matches('[data-duplicate-resource]')) {
          event.stopPropagation();
          return duplicateRecord(element.dataset.duplicateResource, element.dataset.duplicateId);
        }
        if (element.matches('[data-delete-resource]')) {
          event.stopPropagation();
          return deleteRecord(element.dataset.deleteResource, element.dataset.deleteId);
        }
        if (element.matches('[data-quick-patch]')) {
          event.stopPropagation();
          return quickPatch(element);
        }
        if (element.matches('[data-create]')) return openCreate(element.dataset.create);
        if (element.matches('[data-export]')) return exportRows(element.dataset.export);
        if (reportExportRuntime.handleClick(element)) return;
        if (element.matches('[data-bulk-delete]')) return bulkDelete();
        if (element.matches('[data-bulk-export]')) return bulkExport();
        if (element.matches('[data-clear-selection]')) return clearSelection();
        if (element.matches('[data-jump]')) {
          if (!canAccessCrmRoute(state.profile?.role, element.dataset.jump)) {
            toast('You do not have access to that workspace area.');
            return;
          }
          const target = hrefForRoute(element.dataset.jump);
          if (target) window.location.href = target;
        }
      });

      delegatedEvents.on('mouseover', (event) => handleInvoiceHover(event, crmSurface));
      delegatedEvents.on('mouseout', (event) => handleInvoiceHoverEnd(event, crmSurface));

      delegatedEvents.on('input', (event) => {
        const element = event.target instanceof Element ? event.target : null;
        if (element === els.search) {
          state.search = els.search.value;
          render();
          return;
        }
        if (state.invoiceBuilderActions?.handleInput(element)) return;
        if (financeActions.handleInput(element, { isSurface: crmSurface })
          || projectActions.handleInput(element)
          || supportRuntime.handleInput(element)
          || filesRuntime.handleInput(element)
          || peopleActions.handleInput(element)) return;
        if (element?.matches('[data-row-id] [data-field], [data-row-id][data-field]')) {
          scheduleSave(element);
        }
      });

      delegatedEvents.on('blur', (event) => {
        const element = event.target instanceof Element ? event.target : null;
        financeActions.handleBlur(element, { isSurface: crmSurface });
      }, true);

      delegatedEvents.on('change', async (event) => {
        const field = event.target instanceof Element ? event.target : null;
        const invoiceBuilder = state.invoiceBuilderActions;
        const drawerForm = field?.closest('#crm-edit-form');
        if (drawerForm) {
          if (field.matches('[name="role"], [name="client_id"]') && drawerForm.querySelector('[name="role"]') && drawerForm.querySelector('[name="client_id"]')) {
            syncProfileClientLinkFields(drawerForm);
          }
          if (field.matches('[name="client_id"]') && drawerForm.querySelector('[name="project_id"]')) {
            refreshLinkedClientProjectFields(drawerForm);
          }
          if (field.matches('[name="project_id"]')) {
            const project = state.data.projects.find((item) => String(item.id) === String(field.value));
            if (project?.client_id) {
              const clientSelect = drawerForm.querySelector('[name="client_id"]');
              if (clientSelect) clientSelect.value = String(project.client_id);
            }
          }
          if (field.matches('[name="role"]')) syncOperationsDrawerState(drawerForm);
        }
        if (invoiceBuilder && await invoiceBuilder.handleChange(field)) return;
        if (await financeProofRuntime.handleChange(field)) return;
        if (financeActions.handleChange(field)) return;
        if (await filesRuntime.handleChange(field)) return;
        if (projectActions.handleChange(field)) return;
        if (supportRuntime.handleChange(field)) return;
        if (peopleActions.handleChange(field)) return;
        if (reportExportRuntime.handleChange(field)) return;
        if (field?.matches('[data-row-id] [data-field], [data-row-id][data-field]')) {
          scheduleSave(field);
          return;
        }
        const element = event.target instanceof Element ? event.target.closest('[data-row-select]') : null;
        if (element && crmSurface(element)) updateSelectionBar();
      });

      delegatedEvents.on('dragover', (event) => {
        const zone = event.target instanceof Element ? event.target.closest('.files-reference-dropzone') : null;
        if (!zone || !crmSurface(zone)) return;
        event.preventDefault();
        zone.classList.add('is-dragging');
      });

      delegatedEvents.on('dragleave', (event) => {
        const zone = event.target instanceof Element ? event.target.closest('.files-reference-dropzone') : null;
        if (zone && crmSurface(zone)) zone.classList.remove('is-dragging');
      });

      delegatedEvents.on('drop', (event) => {
        const zone = event.target instanceof Element ? event.target.closest('.files-reference-dropzone') : null;
        if (!zone || !crmSurface(zone)) return;
        event.preventDefault();
        zone.classList.remove('is-dragging');
        uploadProjectFiles(null, event.dataTransfer?.files);
      });

      delegatedEvents.on('keydown', (event) => {
        if (event.key === 'Tab') {
          const openModal = [...document.querySelectorAll('.crm-modal.open')].find((modal) => crmSurface(modal));
          if (trapDialogTab(event, openModal)) return;
        }
        const ledgerField = event.target instanceof Element
          ? event.target.closest('.crm-table--ledger [data-field]')
          : null;
        if (ledgerField && crmSurface(ledgerField)) {
          if (event.key === 'Enter') {
            event.preventDefault();
            moveLedgerFocus(ledgerField, event.shiftKey ? -1 : 1);
            return;
          }
          if (event.altKey && event.key === 'ArrowRight') {
            event.preventDefault();
            moveLedgerFocus(ledgerField, 1);
            return;
          }
          if (event.altKey && event.key === 'ArrowLeft') {
            event.preventDefault();
            moveLedgerFocus(ledgerField, -1);
            return;
          }
        }
        if (event.key === '/' && document.activeElement !== els.search) {
          event.preventDefault();
          els.search.focus();
          return;
        }
        if (event.key === 'Escape') {
          closeDialogLayers({ modal: els.modal, invoiceModal: els.invoiceModal, proofPreviewModal: els.proofPreviewModal, root: crmRoot });
          return;
        }
        if (!['Enter', ' '].includes(event.key)) return;
        const element = event.target instanceof Element ? event.target.closest('[data-ticket-detail]') : null;
        if (!element || !crmSurface(element) || event.target.closest('button,input,select,textarea,a')) return;
        event.preventDefault();
        element.click();
      });
    }

    function toggleSidebar() {
      const app = document.querySelector('.crm-app');
      app.classList.toggle('sidebar-collapsed');
      const collapsed = app.classList.contains('sidebar-collapsed');
      localStorage.setItem('tm_crm_sidebar_collapsed', collapsed ? '1' : '0');
      const collapseControl = document.getElementById('crm-collapse');
      collapseControl?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      collapseControl?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      collapseControl?.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    }

    function dataKey(resource) {
      return resource === 'finance' ? 'finances' : resource;
    }

    function findRecord(resource, id) {
      return (state.data[dataKey(resource)] || []).find((item) => String(item.id) === String(id));
    }

    function normalizePayload(resource, body) {
      return sanitizeWorkspacePayload(resource, body);
    }

    function selectOpts(options, current) {
      return options.map(([value, label]) => `<option value="${value}"${String(current) === String(value) ? ' selected' : ''}>${label}</option>`).join('');
    }

    function openInvoiceCreateIntegrated() {
      state.financeSheet = 'invoices';
      state.invoiceBuilderActive = true;
      state.invoiceBuilderId = null;
      renderFinance();
      bindActions();
    }

    function openInvoiceEditIntegrated(id) {
      state.financeSheet = 'invoices';
      state.invoiceBuilderActive = true;
      state.invoiceBuilderId = id;
      renderFinance();
      bindActions();
    }

    const workspaceDataRuntime = createWorkspaceDataRuntime({
      state,
      workspaceStore,
      storage: sessionStorage,
      loadSnapshot: () => window.tmCrm.repository.loadWorkspaceSnapshot(),
      normalizeFinanceRecords,
      render,
      setStatus,
    });

    function crmCacheKey(kind) {
      return workspaceDataRuntime.cacheKey(kind);
    }

    function loadData(options) {
      return workspaceDataRuntime.loadData(options);
    }

    async function boot() {
      try {
        if (!window.tmSupabase) throw new Error('Supabase is not configured for this deployment.');
        const { data: { session } } = await window.tmSupabase.auth.getSession();
        if (!session) return logout();
        state.cacheUserId = session.user.id;
        if (state.active === 'files') {
          const fileParams = new URLSearchParams(window.location.search);
          state.fileProjectId = fileParams.get('project') || '';
          state.fileSelectedId = fileParams.get('file') || null;
          state.fileProjectPicker = !fileParams.get('project');
        }
        const sidebarCollapsed = localStorage.getItem('tm_crm_sidebar_collapsed') === '1'
          || window.matchMedia('(max-width: 900px)').matches;
        if (sidebarCollapsed) {
          document.querySelector('.crm-app')?.classList.add('sidebar-collapsed');
        }
        const collapseControl = document.getElementById('crm-collapse');
        collapseControl?.setAttribute('aria-expanded', sidebarCollapsed ? 'false' : 'true');
        collapseControl?.setAttribute('aria-label', sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
        collapseControl?.setAttribute('title', sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');

        // Live clock
        function updateClock() {
          const now = new Date();
          const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
          document.getElementById('crm-clock-time').textContent = time;
          document.getElementById('crm-clock-date').textContent = date;
        }
        updateClock();
        setInterval(updateClock, 30000);

        // Try profile from cache
        try {
          const cachedProfile = sessionStorage.getItem(`tm_crm_profile_${state.cacheUserId}`);
          if (cachedProfile) {
            state.profile = JSON.parse(cachedProfile);
          }
        } catch (e) {
          console.warn('Profile cache read failed:', e);
        }

        const me = await portal('/api/portal/me');
        const companyRoles = new Set(['company_admin', 'company_member']);
        if (me.destination !== '/company' || !companyRoles.has(me.profile?.role)) {
          await window.tmSupabase.auth.signOut();
          window.location.replace('/login');
          return;
        }
        state.profile = me.profile;
        if (isCompanyAdmin()) {
          try { state.companySettings = (await portal('/api/portal/settings/company')).settings || {}; }
          catch { state.companySettings = {}; }
        }
        if (!canAccessCrmRoute(state.profile?.role, state.active)) {
          window.location.replace('/company');
          return;
        }
        try {
          sessionStorage.setItem(`tm_crm_profile_${state.cacheUserId}`, JSON.stringify(state.profile));
        } catch (e) {
          console.warn('Profile cache write failed:', e);
        }

        syncIdentity(me.profile);
        document.getElementById('crm-company-name').textContent = 'TechMigos';
        syncNavVisibility();
        if (isCompanyAdmin()) {
          try { state.invoiceSettings = (await portal('/api/portal/settings/invoice')).settings || {}; }
          catch { state.invoiceSettings = {}; }
        }
        await loadData();
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Could not load Operations & Management.', 'error');
        setTimeout(logout, 1200);
      }
    }

    bindCrmDelegatedActions();
    boot();
