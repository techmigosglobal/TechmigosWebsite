/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface Window {
  tmSupabase: any;
  tmCrmReady: Promise<unknown>;
  tmCrm: { repository: any } | null;
  tmCrmPdf: { downloadCrmReportPdf: (...args: any[]) => unknown };
  __resolveTmCrm?: (value: unknown) => void;
}
