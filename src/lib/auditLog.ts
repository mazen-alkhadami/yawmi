import { createClient } from "@/lib/supabase/client";

export interface AuditLogInput {
  companyId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  actionType:
    | "request_approved"
    | "request_rejected"
    | "employee_transferred"
    | "bulk_update"
    | "employee_updated"
    | "branch_updated"
    | "announcement_sent";
  targetSummary: string;
  metadata?: Record<string, any>;
}

/**
 * Safely record a management action into public.audit_logs without blocking UI flow.
 */
export async function logAuditAction(input: AuditLogInput): Promise<void> {
  if (!input.companyId) return;
  try {
    const supabase = createClient();
    await supabase.from("audit_logs").insert([
      {
        company_id: input.companyId,
        actor_id: input.actorId || null,
        actor_name: input.actorName || null,
        actor_role: input.actorRole || null,
        action_type: input.actionType,
        target_summary: input.targetSummary,
        metadata: input.metadata || {},
      },
    ]);
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
}
