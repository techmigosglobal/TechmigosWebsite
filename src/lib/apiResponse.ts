export type FieldErrors = Record<string, string>;

type JsonEnvelope = {
  ok: boolean;
  data?: unknown;
  error?: string;
  fieldErrors?: FieldErrors;
};

function json(body: JsonEnvelope, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function jsonOk(data?: unknown) {
  if (data === undefined) {
    return json({ ok: true }, 200);
  }
  return json({ ok: true, data }, 200);
}

export function jsonError(error: string, status = 400, fieldErrors?: FieldErrors) {
  const body: JsonEnvelope = { ok: false, error };
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    body.fieldErrors = fieldErrors;
  }
  return json(body, status);
}
