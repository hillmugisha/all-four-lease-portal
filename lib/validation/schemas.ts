import { z } from 'zod'

// ─── Primitives ───────────────────────────────────────────────────────────────

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
export const EmailSchema = z.string().email()
export const UuidSchema = z.string().uuid()

// ─── Bulk ID arrays ───────────────────────────────────────────────────────────

// For tables with string/UUID primary keys (leases, etc.)
export const StringIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID required'),
})

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: EmailSchema,
})

// ─── Lease form sections (camelCase — from the form wizard) ──────────────────

export const LessorInfoSchema = z.object({
  lessorName: z.string().min(1),
  lessorAddress: z.string().min(1),
  lessorPoBox: z.string(),
  lessorCity: z.string().min(1),
  lessorState: z.string().min(1),
  lessorZip: z.string().min(1),
})

export const LesseeInfoSchema = z.object({
  leaseType: z.string(),
  contractStructure: z.string(),
  customerType: z.string(),
  vehicleUse: z.string(),
  department: z.string().optional(),
  departmentOther: z.string().optional(),
  lesseeType: z.enum(['business', 'individual', '']),
  lesseeName: z.string(),
  location: z.string().optional(),
  lesseeFirstName: z.string().optional(),
  lesseeLastName: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  phone: z.string(),
  email: z.string().email(),
  billingContactFirstName: z.string().optional(),
  billingContactLastName: z.string().optional(),
  billingContactEmail: z.string().optional(),
})

export const VehicleInfoSchema = z.object({
  condition: z.enum(['NEW', 'USED']),
  year: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  bodyStyle: z.string(),
  vin: z.string(),
  odometer: z.string(),
})

export const FinancialInputsSchema = z.object({
  leaseDate: IsoDateSchema,
  numPayments: z.number().int().min(1),
  firstPaymentDate: IsoDateSchema,
  paymentDay: z.number().int().min(1).max(31),
  vehicleAgreedValue: z.number().positive(),
  taxes: z.number().min(0),
  titleRegFees: z.number().min(0),
  acquisitionFee: z.number().min(0),
  docFee: z.number().min(0),
  priorLeaseBalance: z.number().min(0),
  optionalProducts: z.number().min(0),
  capCostReduction: z.number().min(0),
  residualValue: z.number().min(0),
  rentCharge: z.number().min(0),
  monthlySalesTax: z.number().min(0),
  milesPerYear: z.number().positive(),
  excessMileageRate: z.number().min(0),
  dispositionFee: z.number().min(0),
  earlyTerminationFee: z.number().min(0),
  purchaseOptionFee: z.number().min(0),
  tradeinYear: z.string(),
  tradeinMake: z.string(),
  tradeinModel: z.string(),
  tradeinGrossAllowance: z.number().min(0),
  tradeinPriorBalance: z.number().min(0),
  customerSignerName: z.string(),
  customerSignerEmail: z.string(),
})

export const SignatoryEntrySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: EmailSchema,
  jobTitle: z.string().optional(),
})

export const SignaturesInfoSchema = z.object({
  lesseeSignatories: z.array(SignatoryEntrySchema).min(1).max(2),
  lessorSignatoryName: z.string().min(1),
  lessorSignatoryEmail: EmailSchema,
  lessorSignatoryTitle: z.string(),
})

// Full lease form data (camelCase) — from the form wizard (send-to-docusign, generate-pdf, etc.)
export const LeaseFormDataSchema = LessorInfoSchema
  .merge(LesseeInfoSchema)
  .merge(VehicleInfoSchema)
  .merge(FinancialInputsSchema)
  .merge(SignaturesInfoSchema)
  .extend({
    is_master_lease: z.boolean().optional(),
    vehicles_json: z.string().optional(),
  })

// ─── send-to-docusign request body ───────────────────────────────────────────

export const SendToDocusignBodySchema = z.object({
  formData: LeaseFormDataSchema,
  selectedDocs: z.object({
    lease: z.boolean(),
    insurance: z.boolean(),
    ach: z.boolean(),
  }).optional(),
  vooStockNumber: z.string().nullable().optional(),
  supplementalData: z.record(z.unknown()).nullable().optional(),
})

// ─── Lease create body (snake_case — POST /api/leases) ───────────────────────

export const LeaseCreateBodySchema = z.object({
  // Lessor
  lessor_name: z.string().min(1),
  lessor_address: z.string().min(1),
  lessor_po_box: z.string().nullable().optional(),
  lessor_city: z.string().min(1),
  lessor_state: z.string().min(1),
  lessor_zip: z.string().min(1),
  // Lessee
  lessee_name: z.string().min(1),
  lessee_address: z.string().min(1),
  lessee_city: z.string().min(1),
  lessee_state: z.string().min(1),
  lessee_zip: z.string().min(1),
  lessee_phone: z.string().nullable().optional(),
  lessee_email: z.string().email(),
  lessee_type: z.enum(['business', 'individual']).nullable().optional(),
  lessee_first_name: z.string().nullable().optional(),
  lessee_last_name: z.string().nullable().optional(),
  lessee_location: z.string().nullable().optional(),
  // Classification
  lease_type: z.string().nullable().optional(),
  contract_structure: z.string().nullable().optional(),
  customer_type: z.string().nullable().optional(),
  vehicle_use: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  department_other: z.string().nullable().optional(),
  // Lease date
  lease_date: IsoDateSchema,
  // Vehicle
  vehicle_condition: z.enum(['NEW', 'USED']),
  vehicle_year: z.string().min(1),
  vehicle_make: z.string().min(1),
  vehicle_model: z.string().min(1),
  vehicle_body_style: z.string(),
  vehicle_vin: z.string(),
  vehicle_odometer: z.string().nullable().optional(),
  // Financial inputs
  vehicle_agreed_value: z.number().positive(),
  taxes: z.number().min(0),
  title_reg_fees: z.number().min(0),
  acquisition_fee: z.number().min(0),
  doc_fee: z.number().min(0),
  prior_lease_balance: z.number().min(0),
  optional_products: z.number().min(0),
  cap_cost_reduction: z.number().min(0),
  residual_value: z.number().min(0),
  rent_charge: z.number().min(0),
  num_payments: z.number().int().min(1),
  monthly_sales_tax: z.number().min(0),
  first_payment_date: IsoDateSchema,
  payment_day: z.number().int().min(1).max(31),
  miles_per_year: z.number().positive(),
  excess_mileage_rate: z.number().min(0),
  disposition_fee: z.number().min(0),
  early_termination_fee: z.number().min(0),
  purchase_option_fee: z.number().min(0),
  // Trade-in
  tradein_year: z.string().nullable().optional(),
  tradein_make: z.string().nullable().optional(),
  tradein_model: z.string().nullable().optional(),
  tradein_gross_allowance: z.number().min(0).optional(),
  tradein_prior_balance: z.number().min(0).optional(),
  // Signer
  customer_signer_name: z.string().nullable().optional(),
  customer_signer_email: z.string().nullable().optional(),
  // Status
  doc_status: z.enum(['draft', 'sent', 'customer_signed', 'completed', 'generated']).optional(),
  // Master lease
  is_master_lease: z.boolean().nullable().optional(),
  vehicles_json: z.string().nullable().optional(),
  // MLA link
  mla_id: UuidSchema.nullable().optional(),
  // VOO
  voo_stock_number: z.string().nullable().optional(),
  supplemental_data: z.record(z.unknown()).nullable().optional(),
})

// ─── Lease partial update (PATCH /api/leases/[id]) ───────────────────────────
// All fields are optional. Unknown keys are stripped (Zod default).
// Calculated fields (gross_cap_cost, etc.) are intentionally excluded — they
// must never be overwritten directly; recalculate on edits via calculateLease().

export const LeaseUpdateSchema = z.object({
  // Lessor
  lessor_name: z.string().min(1).optional(),
  lessor_address: z.string().min(1).optional(),
  lessor_po_box: z.string().nullable().optional(),
  lessor_city: z.string().min(1).optional(),
  lessor_state: z.string().min(1).optional(),
  lessor_zip: z.string().min(1).optional(),
  // Lessee
  lessee_name: z.string().min(1).optional(),
  lessee_address: z.string().min(1).optional(),
  lessee_city: z.string().min(1).optional(),
  lessee_state: z.string().min(1).optional(),
  lessee_zip: z.string().min(1).optional(),
  lessee_phone: z.string().nullable().optional(),
  lessee_email: z.string().email().optional(),
  lessee_type: z.enum(['business', 'individual']).nullable().optional(),
  lessee_first_name: z.string().nullable().optional(),
  lessee_last_name: z.string().nullable().optional(),
  lessee_location: z.string().nullable().optional(),
  // Classification
  lease_type: z.string().nullable().optional(),
  contract_structure: z.string().nullable().optional(),
  customer_type: z.string().nullable().optional(),
  vehicle_use: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  department_other: z.string().nullable().optional(),
  // Lease date
  lease_date: IsoDateSchema.optional(),
  // Vehicle
  vehicle_condition: z.enum(['NEW', 'USED']).optional(),
  vehicle_year: z.string().min(1).optional(),
  vehicle_make: z.string().min(1).optional(),
  vehicle_model: z.string().min(1).optional(),
  vehicle_body_style: z.string().optional(),
  vehicle_vin: z.string().optional(),
  vehicle_odometer: z.string().nullable().optional(),
  // Financial inputs
  vehicle_agreed_value: z.number().positive().optional(),
  taxes: z.number().min(0).optional(),
  title_reg_fees: z.number().min(0).optional(),
  acquisition_fee: z.number().min(0).optional(),
  doc_fee: z.number().min(0).optional(),
  prior_lease_balance: z.number().min(0).optional(),
  optional_products: z.number().min(0).optional(),
  cap_cost_reduction: z.number().min(0).optional(),
  residual_value: z.number().min(0).optional(),
  rent_charge: z.number().min(0).optional(),
  num_payments: z.number().int().min(1).optional(),
  monthly_sales_tax: z.number().min(0).optional(),
  first_payment_date: IsoDateSchema.optional(),
  payment_day: z.number().int().min(1).max(31).optional(),
  miles_per_year: z.number().positive().optional(),
  excess_mileage_rate: z.number().min(0).optional(),
  disposition_fee: z.number().min(0).optional(),
  early_termination_fee: z.number().min(0).optional(),
  purchase_option_fee: z.number().min(0).optional(),
  // Trade-in
  tradein_year: z.string().nullable().optional(),
  tradein_make: z.string().nullable().optional(),
  tradein_model: z.string().nullable().optional(),
  tradein_gross_allowance: z.number().min(0).optional(),
  tradein_prior_balance: z.number().min(0).optional(),
  // Status & DocuSign
  doc_status: z.enum(['draft', 'sent', 'customer_signed', 'completed', 'generated']).optional(),
  docusign_envelope_id: z.string().nullable().optional(),
  signed_at: z.string().nullable().optional(),
  // Signer fields
  lessor_signer_title: z.string().nullable().optional(),
  lessor_signer_name: z.string().nullable().optional(),
  customer_signer_name: z.string().nullable().optional(),
  customer_signer_email: z.string().nullable().optional(),
  customer_signer_title: z.string().nullable().optional(),
  co_lessee_signer_name: z.string().nullable().optional(),
  // ACH fields
  ach_billing_address: z.string().nullable().optional(),
  ach_billing_city: z.string().nullable().optional(),
  ach_billing_phone: z.string().nullable().optional(),
  ach_billing_email: z.string().nullable().optional(),
  ach_bank_name: z.string().nullable().optional(),
  ach_routing_number: z.string().nullable().optional(),
  ach_account_number: z.string().nullable().optional(),
  ach_account_type: z.enum(['checking', 'savings']).nullable().optional(),
  // Master lease
  is_master_lease: z.boolean().nullable().optional(),
  vehicles_json: z.string().nullable().optional(),
  // MLA link
  mla_id: UuidSchema.nullable().optional(),
  // Activation
  is_active: z.boolean().nullable().optional(),
  activated_at: z.string().nullable().optional(),
  // VOO / supplemental
  voo_stock_number: z.string().nullable().optional(),
  supplemental_data: z.record(z.unknown()).nullable().optional(),
})

// ─── Lease schedule form (camelCase) ─────────────────────────────────────────

export const LeaseScheduleVehicleEntrySchema = z.object({
  id: z.number().int().positive(),
  vin: z.string().nullable(),
  model_year: z.string().nullable(),
  oem: z.string().nullable(),
  vehicle_line: z.string().nullable(),
  color: z.string().nullable(),
  body_style: z.string().nullable().optional(),
  stock_number: z.string().nullable().optional(),
  lease_start_date: IsoDateSchema,
  term: z.number().int().min(1),
  net_cap_cost: z.number().positive(),
  monthly_payment: z.number().positive(),
  residual_value: z.number().min(0),
})

export const LeaseScheduleFormDataSchema = LessorInfoSchema
  .merge(LesseeInfoSchema)
  .extend({
    vehicles: z.array(LeaseScheduleVehicleEntrySchema).min(1),
    lesseeSignatories: z.array(SignatoryEntrySchema).min(1).max(2),
    lessorSignatoryName: z.string(),
    lessorSignatoryEmail: z.string(),
    lessorSignatoryTitle: z.string(),
    mla_id: UuidSchema.nullable().optional(),
    masterLeaseRef: z.string().optional(),
    scheduleDate: IsoDateSchema.optional(),
  })

export const LeaseScheduleFormDataBodySchema = z.object({
  formData: LeaseScheduleFormDataSchema,
})

// Partial update for PUT /api/lease-schedules/[id]
// All fields optional; unknown keys stripped (Zod default).
export const LeaseScheduleUpdateSchema = z.object({
  lessor_name: z.string().nullable().optional(),
  lessor_address: z.string().nullable().optional(),
  lessor_po_box: z.string().nullable().optional(),
  lessor_city: z.string().nullable().optional(),
  lessor_state: z.string().nullable().optional(),
  lessor_zip: z.string().nullable().optional(),
  lessee_name: z.string().nullable().optional(),
  lessee_type: z.string().nullable().optional(),
  lessee_first_name: z.string().nullable().optional(),
  lessee_last_name: z.string().nullable().optional(),
  lessee_location: z.string().nullable().optional(),
  lessee_address: z.string().nullable().optional(),
  lessee_city: z.string().nullable().optional(),
  lessee_state: z.string().nullable().optional(),
  lessee_zip: z.string().nullable().optional(),
  lessee_phone: z.string().nullable().optional(),
  lessee_email: z.string().email().nullable().optional(),
  lease_type: z.string().nullable().optional(),
  contract_structure: z.string().nullable().optional(),
  customer_type: z.string().nullable().optional(),
  vehicle_use: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  department_other: z.string().nullable().optional(),
  vehicles_json: z.string().nullable().optional(),
  lessor_signer_name: z.string().nullable().optional(),
  lessor_signer_email: z.string().nullable().optional(),
  lessor_signer_title: z.string().nullable().optional(),
  customer_signer_name: z.string().nullable().optional(),
  customer_signer_email: z.string().nullable().optional(),
  co_lessee_signer_name: z.string().nullable().optional(),
  mla_id: UuidSchema.nullable().optional(),
  master_lease_ref: z.string().nullable().optional(),
  schedule_date: IsoDateSchema.nullable().optional(),
  docusign_envelope_id: z.string().nullable().optional(),
  doc_status: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  signed_at: z.string().nullable().optional(),
})

// ─── Vehicles on order — dispose ─────────────────────────────────────────────

export const VooDisposeSchema = z.object({
  ids: z.array(z.union([z.string().min(1), z.number().int().positive()])).min(1),
  disposition: z.enum(['sold', 'out_of_service']),
})

// ─── Master lease agreement create ───────────────────────────────────────────

export const MasterLeaseAgreementCreateSchema = z.object({
  lessor_name: z.string().optional(),
  lessor_address: z.string().optional(),
  lessor_po_box: z.string().optional(),
  lessor_city: z.string().optional(),
  lessor_state: z.string().optional(),
  lessor_zip: z.string().optional(),
  lessee_name: z.string(),
  lessee_type: z.string().nullable().optional(),
  lessee_first_name: z.string().nullable().optional(),
  lessee_last_name: z.string().nullable().optional(),
  lessee_location: z.string().nullable().optional(),
  lessee_address: z.string().optional(),
  lessee_city: z.string().optional(),
  lessee_state: z.string().optional(),
  lessee_zip: z.string().optional(),
  lessee_phone: z.string().nullable().optional(),
  lessee_email: z.string().optional(),
  lease_type: z.string().nullable().optional(),
  contract_structure: z.string().nullable().optional(),
  customer_type: z.string().nullable().optional(),
  vehicle_use: z.string().nullable().optional(),
  customer_signer_name: z.string().nullable().optional(),
  customer_signer_email: z.string().email().nullable().optional(),
  portal_lease_id: UuidSchema.nullable().optional(),
})

// ─── Portfolio import row ─────────────────────────────────────────────────────

export const PortfolioImportRowSchema = z.record(z.union([z.string(), z.number(), z.null()]))
  .refine((row) => {
    const leaseId = row['Lease ID'] ?? row['lease_id']
    return leaseId !== null && leaseId !== undefined && String(leaseId).trim() !== ''
  }, 'Lease ID is required')

// ─── Vehicles on order import row ────────────────────────────────────────────

export const VooImportRowSchema = z.record(z.union([z.string(), z.number(), z.null()]))
  .refine((row) => {
    const stockNum = row['Stock #'] ?? row['stock_number']
    return stockNum !== null && stockNum !== undefined && String(stockNum).trim() !== ''
  }, 'Stock # is required')
