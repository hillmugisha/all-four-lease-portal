/**
 * lease-adapter.ts
 * Converts a Supabase LeaseRecord (snake_case DB row) into the
 * LeaseTemplateData shape expected by the Handlebars renderer.
 */

import type { LeaseRecord } from '@/lib/types'
import type { LeaseTemplateData } from '@/lib/lease-types'

export function recordToTemplateData(r: LeaseRecord): LeaseTemplateData {
  const hasTradeIn = !!(r.tradein_make && r.tradein_make.trim())

  // cap_cost_reduction: 0 in DB means no reduction (N/A), positive = real reduction
  const capCostReduction = r.cap_cost_reduction > 0 ? r.cap_cost_reduction : null

  // Signing itemization: the form currently tracks this as a single "first monthly payment"
  // line. Title/registration fees are rolled into cap cost rather than paid at signing.
  // amount_due_at_signing = first monthly payment (most common All Four pattern).
  const firstMonthlyPayment = r.total_monthly_payment
  const amountPaidInCash    = r.amount_due_at_signing

  return {
    lease: {
      lease_date:          r.lease_date,
      is_business_purpose: true,   // All Four always leases for commercial/business purposes
    },

    lessor: {
      name:    r.lessor_name,
      address: r.lessor_address,
      po_box:  r.lessor_po_box ?? null,
      city:    r.lessor_city,
      state:   r.lessor_state,
      zip:     r.lessor_zip,
    },

    lessee: {
      name:             r.lessee_name,
      address:          r.lessee_address,
      city:             r.lessee_city,
      state:            r.lessee_state,
      zip:              r.lessee_zip,
      phone:            r.lessee_phone ?? null,
      email:            r.lessee_email,
      signer_name:      r.customer_signer_name ?? '',
      co_signer_name:   null,
      entity_type:      'LLC',   // default; update if your form captures entity type
    },

    vehicle: {
      condition:  r.vehicle_condition,
      year:       r.vehicle_year,
      make:       r.vehicle_make,
      model:      r.vehicle_model,
      body_style: r.vehicle_body_style || null,
      vin:        r.vehicle_vin,
      odometer:   r.vehicle_odometer ? Number(r.vehicle_odometer) : null,
    },

    financials: {
      vehicle_agreed_value:        r.vehicle_agreed_value,
      gross_cap_cost:              r.gross_cap_cost,
      cap_cost_reduction:          capCostReduction,
      adjusted_cap_cost:           r.adjusted_cap_cost,
      residual_value:              r.residual_value,
      depreciation:                r.depreciation,
      rent_charge:                 r.rent_charge,
      total_base_monthly_payments: r.total_base_monthly_payments,
      num_payments:                r.num_payments,
      base_monthly_payment:        r.base_monthly_payment,
      monthly_sales_tax:           r.monthly_sales_tax > 0 ? r.monthly_sales_tax : 0,
      total_monthly_payment:       r.total_monthly_payment,
      total_of_payments:           r.total_of_payments,
      miles_per_year:              r.miles_per_year,
      excess_mileage_rate:         r.excess_mileage_rate,
      disposition_fee:             r.disposition_fee > 0 ? r.disposition_fee : null,
      early_termination_fee:       r.early_termination_fee > 0 ? r.early_termination_fee : 0,
      purchase_option_price:       r.residual_value,
      purchase_option_fee:         r.purchase_option_fee > 0 ? r.purchase_option_fee : 0,
      official_fees_taxes:         r.official_fees_taxes,
    },

    signing: {
      first_payment_date:      r.first_payment_date,
      payment_day:             r.payment_day,
      amount_due_at_signing:   r.amount_due_at_signing,
      // Itemization: only first monthly payment flows through at signing for All Four deals
      cap_cost_reduction:      null,
      first_monthly_payment:   firstMonthlyPayment,
      security_deposit:        null,
      reconditioning_reserve:  null,
      title_fees:              null,
      registration_fees:       null,
      other_1_label:           null,
      other_1_amount:          null,
      other_2_label:           null,
      other_2_amount:          null,
      // How paid
      net_tradein_allowance:   r.net_tradein_allowance > 0 ? r.net_tradein_allowance : null,
      rebates_noncash:         null,
      amount_paid_in_cash:     amountPaidInCash,
    },

    tradein: {
      has_tradein:      hasTradeIn,
      year:             r.tradein_year  ?? null,
      make:             r.tradein_make  ?? null,
      model:            r.tradein_model ?? null,
      gross_allowance:  r.tradein_gross_allowance > 0 ? r.tradein_gross_allowance : null,
      prior_balance:    r.tradein_prior_balance   > 0 ? r.tradein_prior_balance   : null,
      net_allowance:    r.net_tradein_allowance   ?? 0,
    },

    cap_items: {
      taxes:                r.taxes,
      title_reg_fees:       r.title_reg_fees,
      acquisition_fee:      r.acquisition_fee,
      doc_fee:              r.doc_fee,
      prior_lease_balance:  r.prior_lease_balance > 0 ? r.prior_lease_balance : null,
      other_1_label:        null,
      other_1_amount:       null,
      // Optional products: stored as a single combined number in the current schema.
      // When your form captures them individually, split them out here.
      mbp_amount:           r.optional_products > 0 ? r.optional_products : null,
      service_contract:     null,
      gap_amount:           null,
      optional_other_1_label:  null,
      optional_other_1_amount: null,
      optional_other_2_label:  null,
      optional_other_2_amount: null,
    },

    optional: {
      mbp: { amount_or_period: null, price: null, term: null, provider: null, lessee_initials: null },
      gap: { amount_or_period: null, price: null, term: null, provider: null, lessee_initials: null },
    },

    signatures: {
      lessee_signer_name:    r.customer_signer_name ?? r.lessee_name,
      co_lessee_signer_name: r.co_lessee_signer_name ?? null,
      lessor_name:           r.lessor_name,
      lessor_signer_name:    r.lessor_signer_name  ?? 'Jim Liverseed',
      lessor_signer_title:   r.lessor_signer_title ?? 'Lease Sales Consultant',
    },
  }
}
