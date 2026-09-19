import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Live identities are secrets; do not persist traces, screenshots, or DOM
// snapshots containing login interactions for this mutating acceptance test.
test.use({ trace: 'off', screenshot: 'off' });

async function signIn(page, baseUrl, identity, destination) {
  await page.goto(`${baseUrl}/login`);
  await page.getByLabel(/username or email/i).fill(identity.email);
  await page.locator('#password').fill(identity.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${destination.replace('/', '\\/')}(?:\\/|$)`), { timeout: 20_000 });
}

test('live Client-to-Admin support conversation keeps internal notes private and cleans up', async ({ browser }, testInfo) => {
  test.skip(process.env.CRM_LIVE_REQUIRED !== '1', 'Run npm run test:e2e:live to enable hosted write workflows.');
  test.setTimeout(60_000);

  const admin = { email: process.env.CRM_ADMIN_EMAIL, password: process.env.CRM_ADMIN_PASSWORD };
  const client = { email: process.env.CRM_CLIENT_EMAIL, password: process.env.CRM_CLIENT_PASSWORD };
  if (!admin.email || !admin.password || !client.email || !client.password) {
    throw new Error('Live support lifecycle requires CRM_ADMIN_EMAIL/PASSWORD and CRM_CLIENT_EMAIL/PASSWORD.');
  }

  const baseUrl = new URL(String(testInfo.project.use.baseURL || 'http://127.0.0.1:4321')).origin;
  const clientContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const clientPage = await clientContext.newPage();
  const adminPage = await adminContext.newPage();
  const ticketSubject = `Codex support lifecycle ${randomUUID()}`;
  const clientReply = `Client reply ${randomUUID()}`;
  const internalNote = `Internal-only note ${randomUUID()}`;
  const adminReply = `Admin external reply ${randomUUID()}`;
  let ticketId = null;
  let adminSignedIn = false;

  try {
    // Validate the cleanup identity before creating any hosted fixture.
    await signIn(adminPage, baseUrl, admin, '/company');
    adminSignedIn = true;
    await signIn(clientPage, baseUrl, client, '/client');
    await expect(clientPage.locator('#ticket-form')).toBeVisible();

    await clientPage.locator('#ticket-form [name="subject"]').fill(ticketSubject);
    await clientPage.locator('#ticket-form [name="priority"]').selectOption('high');
    await clientPage.locator('#ticket-form [name="description"]').fill(`Support lifecycle verification ${randomUUID()}`);
    const ticketCreated = clientPage.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST' && url.pathname.endsWith('/rest/v1/crm_tickets');
    });
    await clientPage.getByRole('button', { name: /submit ticket/i }).click();
    const ticketResponse = await ticketCreated;
    expect(ticketResponse.ok(), 'the client ticket insert should succeed').toBeTruthy();
    const ticketPayload = await ticketResponse.json();
    const ticket = Array.isArray(ticketPayload) ? ticketPayload[0] : ticketPayload;
    ticketId = Number(ticket?.id);
    expect(Number.isSafeInteger(ticketId) && ticketId > 0, 'the created ticket should return a safe id').toBeTruthy();

    const clientTicket = clientPage.locator('#tickets-list article').filter({ hasText: ticketSubject });
    await expect(clientTicket).toBeVisible();
    await clientTicket.getByRole('button', { name: /open conversation/i }).click();
    await expect(clientPage.locator('#conversation-panel')).toBeVisible();
    await clientPage.locator('#message-form textarea[name="body"]').fill(clientReply);
    await clientPage.locator('#message-form').getByRole('button', { name: /send reply/i }).click();
    await expect(clientPage.locator('#conversation-messages')).toContainText(clientReply);

    await adminPage.goto(`${baseUrl}/company/support`);
    await expect(adminPage.locator('.crm-app')).toHaveAttribute('data-crm-active-tab', 'support');
    await adminPage.evaluate(() => window.tmCrmReady);
    const adminRepositoryHasTicket = await adminPage.evaluate(async (id) => {
      const result = await window.tmCrm.repository.request('/api/portal/tickets');
      return (result.items || []).some((item) => String(item.id) === String(id));
    }, ticketId);
    expect(adminRepositoryHasTicket, 'the Admin workspace repository should expose the new ticket').toBeTruthy();
    await adminPage.reload({ waitUntil: 'domcontentloaded' });
    await expect(adminPage.locator('.crm-app')).toHaveAttribute('data-crm-active-tab', 'support');
    const adminTicket = adminPage.locator('[data-ticket-detail]').filter({ hasText: ticketSubject }).first();
    await expect(adminTicket).toBeVisible({ timeout: 20_000 });
    await adminTicket.click();

    const replyForm = adminPage.locator(`[data-ticket-message-form][data-ticket-message-id="${ticketId}"]`);
    await expect(replyForm).toBeVisible();
    await replyForm.locator('[name="message"]').fill(internalNote);
    await replyForm.locator('[name="visibility"]').selectOption('internal');
    await replyForm.getByRole('button', { name: /send message/i }).click();
    await expect(adminPage.locator('.ticket-reference-conversation-list')).toContainText(internalNote);

    const refreshedReplyForm = adminPage.locator(`[data-ticket-message-form][data-ticket-message-id="${ticketId}"]`);
    await refreshedReplyForm.locator('[name="message"]').fill(adminReply);
    await refreshedReplyForm.locator('[name="visibility"]').selectOption('external');
    await refreshedReplyForm.getByRole('button', { name: /send message/i }).click();
    await expect(adminPage.locator('.ticket-reference-conversation-list')).toContainText(adminReply);

    await adminPage.locator(`[data-quick-patch="tickets"][data-quick-id="${ticketId}"][data-quick-field="status"][data-quick-value="resolved"]`).click();

    await clientPage.reload();
    const resolvedClientTicket = clientPage.locator('#tickets-list article').filter({ hasText: ticketSubject });
    await expect(resolvedClientTicket).toContainText('resolved');
    await resolvedClientTicket.getByRole('button', { name: /open conversation/i }).click();
    await expect(clientPage.locator('#conversation-messages')).toContainText(clientReply);
    await expect(clientPage.locator('#conversation-messages')).toContainText(adminReply);
    await expect(clientPage.locator('#conversation-messages')).not.toContainText(internalNote);
  } finally {
    try {
      if (!adminSignedIn) {
        await signIn(adminPage, baseUrl, admin, '/company');
        adminSignedIn = true;
      }
      if (!ticketId) {
        ticketId = await adminPage.evaluate(async (subject) => {
          const { data, error } = await window.tmSupabase
            .from('crm_tickets')
            .select('id')
            .eq('subject', subject)
            .limit(2);
          if (error) throw new Error(error.message);
          if ((data || []).length > 1) throw new Error('More than one live test ticket matched; refusing cleanup.');
          return data?.[0]?.id ? Number(data[0].id) : null;
        }, ticketSubject);
      }
      if (ticketId) {
        const cleanup = await adminPage.evaluate(async ({ id, reason }) => {
          await window.tmCrmReady;
          await window.tmCrm.repository.purgeConfirmedRecords([{ resource: 'tickets', id }], reason);
          const { data, error } = await window.tmSupabase.from('crm_tickets').select('id').eq('id', id).limit(1);
          if (error) throw new Error(error.message);
          return (data || []).length === 0;
        }, { id: ticketId, reason: `Codex support lifecycle E2E cleanup ${ticketSubject}` });
        expect(cleanup, 'the audited cleanup should remove the test ticket').toBeTruthy();
      }
    } finally {
      await Promise.all([clientContext.close(), adminContext.close()]);
    }
  }
});
