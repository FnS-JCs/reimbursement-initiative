import { Bill, BillViewStatus } from "@/types";

export type WorkflowRole = "fns" | "sc" | "jc";

export function getVisibleBillStatus(
  bill: Pick<Bill, "paid" | "reimbursed">,
  role: WorkflowRole
): BillViewStatus {
  if (role === "fns") {
    if (bill.reimbursed === "rejected") return "rejected";
    return bill.reimbursed === "reimbursed" ? "reimbursed" : "pending";
  }

  if (role === "jc") {
    if (bill.paid === "rejected") return "rejected";
    if (bill.reimbursed === "reimbursed") return "reimbursed";
    return bill.paid === "paid" ? "paid" : "pending";
  }

  if (bill.reimbursed === "rejected" || bill.paid === "rejected") return "rejected";
  if (bill.reimbursed === "reimbursed") return "reimbursed";
  return bill.paid === "paid" ? "paid" : "pending";
}
