export type VehicleBehavior =
  | "NORMAL"
  | "SPEEDING"
  | "FLEEING"
  | "STOPPED";

export interface SimulatedVehicle {
  vehicleId: string;
  plate: string;
  vin: string;
  make: string;
  model: string;
  positionMiles: number;
  speedMph: number;
  behavior: VehicleBehavior;
}

export interface SimulatorStatus {
  running: boolean;
  tick: number;
  vehicleCount: number;
  incidentId: string | null;
}

export interface AuditEvent {
  id: string;
  incidentId: string;
  action: string;
  actor: string;
  details: string | null;
  createdAt: string;
}
