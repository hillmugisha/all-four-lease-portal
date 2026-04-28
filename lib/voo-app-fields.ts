export type VooFieldType = 'text' | 'integer' | 'currency' | 'date'

export interface VooAppFieldDef {
  key:       string
  label:     string       // Excel column header — keep stable; changing breaks existing exports
  type:      VooFieldType
  colWidth?: number
}

// The ONLY place to edit when adding a new app-owned field to Vehicles on Order.
// Column widget, export groups, import column reference, import validation,
// vehicle detail modal, and lease schedule pre-population all read from this registry.
export const VOO_APP_FIELDS: VooAppFieldDef[] = [
  { key: 'lease_start_date', label: 'Lease Start Date', type: 'date',     colWidth: 130 },
  { key: 'term',             label: 'Term (mo)',         type: 'integer',  colWidth: 90  },
  { key: 'net_cap_cost',     label: 'Net Cap Cost',      type: 'currency', colWidth: 120 },
  { key: 'monthly_payment',  label: 'Monthly Payment',   type: 'currency', colWidth: 120 },
  { key: 'monthly_tax',      label: 'Monthly Tax',       type: 'currency', colWidth: 110 },
  { key: 'residual_value',   label: 'Residual Value',    type: 'currency', colWidth: 120 },
  // Add new fields here — no other code changes needed
]
