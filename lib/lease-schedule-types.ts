import type { LessorInfo, LesseeInfo, SignatoryEntry } from './types'

// ─── Per-vehicle entry on a Lease Schedule ────────────────────────────────────

export interface LeaseScheduleVehicleEntry {
  // From vehicles_on_order
  id: number
  vin: string | null
  model_year: string | null
  oem: string | null
  vehicle_line: string | null
  color: string | null
  body_style?: string | null
  stock_number?: string | null

  // User-entered financial terms for this vehicle
  lease_start_date: string   // ISO date YYYY-MM-DD
  term: number               // months
  net_cap_cost: number
  monthly_payment: number
  residual_value: number
}

// ─── Form data collected across all 4 steps ───────────────────────────────────

export interface LeaseScheduleFormData extends LessorInfo, LesseeInfo {
  vehicles: LeaseScheduleVehicleEntry[]
  lesseeSignatories: SignatoryEntry[]
  lessorSignatoryName: string
  lessorSignatoryEmail: string
  lessorSignatoryTitle: string
  // Optional link to the parent Master Lease Agreement
  masterLeaseRef?: string   // e.g. "Master Lease Agreement dated April 24, 2026"
  scheduleDate?: string     // ISO date — date of this schedule
}

// ─── Database row (snake_case) ────────────────────────────────────────────────

export interface LeaseScheduleRecord {
  id: number
  lessor_name: string | null
  lessor_address: string | null
  lessor_po_box: string | null
  lessor_city: string | null
  lessor_state: string | null
  lessor_zip: string | null

  lessee_name: string | null
  lessee_type: string | null
  lessee_first_name: string | null
  lessee_last_name: string | null
  lessee_location: string | null
  lessee_address: string | null
  lessee_city: string | null
  lessee_state: string | null
  lessee_zip: string | null
  lessee_phone: string | null
  lessee_email: string | null

  lease_type: string | null
  contract_structure: string | null
  customer_type: string | null
  vehicle_use: string | null
  department: string | null
  department_other: string | null

  vehicles_json: string | null   // JSON.stringify(LeaseScheduleVehicleEntry[])

  lessor_signer_name: string | null
  lessor_signer_email: string | null
  lessor_signer_title: string | null
  customer_signer_name: string | null
  customer_signer_email: string | null
  co_lessee_signer_name: string | null

  master_lease_ref: string | null
  schedule_date: string | null   // ISO date

  docusign_envelope_id: string | null
  doc_status: string | null

  is_active: boolean
  created_at: string
  signed_at: string | null
}

// ─── Template data shape (what the Handlebars template receives) ──────────────

export interface LeaseScheduleTemplateData {
  lessor: {
    name: string
    address: string
    po_box: string | null
    city: string
    state: string
    zip: string
  }
  lessee: {
    name: string
    address: string
    city: string
    state: string
    zip: string
    phone: string | null
    email: string
  }
  schedule: {
    schedule_date: string | null   // formatted date string
    master_lease_ref: string | null
  }
  vehicles: LeaseScheduleVehicleEntry[]
  signatures: {
    lessee_signer_name: string
    lessee_signer_title: string | null
    co_lessee_signer_name: string | null
    lessor_name: string
    lessor_signer_name: string
    lessor_signer_title: string
  }
}
