export interface VehicleOnOrderRecord {
  id:                              number
  stock_number:                    string | null
  customer_name:                   string | null
  sales_person:                    string | null
  oem:                             string | null
  oem_order_number:                string | null
  model_year:                      string | null
  body_code:                       string | null
  vin:                             string | null
  customer_po_number:              string | null
  customer_po_date:                string | null
  tracking_type:                   string | null
  order_date:                      string | null
  vehicle_line:                    string | null
  color:                           string | null
  ship_to_location:                string | null
  target_production_week:          string | null
  oem_status:                      string | null
  chassis_eta:                     string | null
  shaed_status:                    string | null
  customer_invoice_number:         string | null
  invoice_amount:                  string | null
  invoice_date:                    string | null
  invoice_due_date:                string | null
  payment_date:                    string | null
  upfitter_name:                   string | null
  date_received_at_upfitter:       string | null
  upfit_status:                    string | null
  estimated_upfit_completion_date: string | null
  actual_upfit_completion_date:    string | null
  logistics_status:                string | null
  expected_delivery_date:          string | null
  stage:                           string | null
  inventory_type:                  string | null
  created_at:                      string
  app_data:                        Record<string, unknown> | null
}
