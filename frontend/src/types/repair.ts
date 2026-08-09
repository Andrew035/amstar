export interface VehicleRepair {
  id?: number;
  customerName: string;
  vehicleDetails: string;
  serviceType: string;
  severity: number;
  entryDate: string;
  expectedCompletionDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priorityScore?: number;
}
