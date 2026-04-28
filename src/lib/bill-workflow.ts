import { Bill, BillViewStatus } from "@/types";

export type WorkflowRole = "fns" | "sc" | "jc";

export function getVisibleBillStatus(
  bill: Pick<Bill, "status" | "is_reimbursed">,
  role: WorkflowRole
): BillViewStatus {
  if (bill.status === "rejected") return "rejected";

  if (role === "fns") {
    return bill.status === "reimbursed" ? "reimbursed" : "pending";
  }

  if (role === "sc") {
    if (bill.is_reimbursed) return "paid";
    return bill.status === "reimbursed" ? "reimbursed" : "pending";
  }

  return bill.is_reimbursed ? "reimbursed" : "pending";
}

