export type ApiResult<T> = { data: T; error: null } | { data: null; error: Error };

/**
 * Backend adapter boundary.
 * Replace these mock implementations with Supabase, Firebase or a custom REST/GraphQL client.
 * Keeping these calls centralized avoids coupling page components to any specific backend.
 */
export const backend = {
  async createProject(payload: Record<string, unknown>): Promise<ApiResult<Record<string, unknown>>> {
    return { data: { id: crypto.randomUUID(), ...payload }, error: null };
  },
  async createUser(payload: Record<string, unknown>): Promise<ApiResult<Record<string, unknown>>> {
    return { data: { id: crypto.randomUUID(), ...payload }, error: null };
  },
  async replyToTicket(ticketId: string, message: string): Promise<ApiResult<{ ticketId: string; message: string }>> {
    return { data: { ticketId, message }, error: null };
  },
  async uploadFile(file: File): Promise<ApiResult<{ name: string; size: number }>> {
    return { data: { name: file.name, size: file.size }, error: null };
  },
  async saveSettings(payload: Record<string, unknown>): Promise<ApiResult<Record<string, unknown>>> {
    return { data: payload, error: null };
  }
};
