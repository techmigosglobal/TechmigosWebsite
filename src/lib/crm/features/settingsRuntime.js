/**
 * Browser actions for administrator settings. The Settings renderer stays
 * responsible for markup; this module owns persistence feedback and PATCHes.
 */
export function createSettingsRuntime({ state, portal, toast }) {
  async function saveSettingsSection(formId, endpoint, statusId, extraTransform) {
    const form = document.getElementById(formId);
    const statusEl = document.getElementById(statusId);
    if (!form || !statusEl) return false;
    statusEl.style.display = 'none';
    try {
      let data = Object.fromEntries(new FormData(form).entries());
      if (extraTransform) data = extraTransform(data);
      const result = await portal(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
      const category = /\/settings\/invoice(?:$|[?])/i.test(endpoint) ? 'invoiceSettings' : 'companySettings';
      if (state && result?.settings && category in state) state[category] = { ...result.settings };
      statusEl.textContent = '✓ Saved';
      statusEl.style.color = '#22c55e';
      statusEl.style.display = '';
      toast('Settings saved successfully.');
      setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
      return true;
    } catch (error) {
      statusEl.textContent = '✗ Save failed';
      statusEl.style.color = '#ef4444';
      statusEl.style.display = '';
      toast(error instanceof Error ? error.message : 'Save failed.');
      return false;
    }
  }

  return { saveSettingsSection };
}
