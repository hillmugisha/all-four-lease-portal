import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { calculateLease } from '@/lib/calculations'
import { FinancialInputs } from '@/lib/types'
import { logAudit } from '@/lib/audit'
import { getUserEmailFromRequest } from '@/lib/auth-user'

export const dynamic = 'force-dynamic'

// GET /api/leases — return all lease records
export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('leases')
      .select('*')
      .or('is_active.is.null,is_active.eq.false')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/leases — create a new lease record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Build the financial inputs shape for calculation
    const fi: FinancialInputs = {
      leaseDate:            body.lease_date,
      numPayments:          Number(body.num_payments),
      firstPaymentDate:     body.first_payment_date,
      paymentDay:           Number(body.payment_day),
      vehicleAgreedValue:   Number(body.vehicle_agreed_value),
      taxes:                Number(body.taxes),
      titleRegFees:         Number(body.title_reg_fees),
      acquisitionFee:       Number(body.acquisition_fee),
      docFee:               Number(body.doc_fee),
      priorLeaseBalance:    Number(body.prior_lease_balance),
      optionalProducts:     Number(body.optional_products),
      capCostReduction:     Number(body.cap_cost_reduction),
      residualValue:        Number(body.residual_value),
      rentCharge:           Number(body.rent_charge),
      monthlySalesTax:      Number(body.monthly_sales_tax),
      milesPerYear:         Number(body.miles_per_year),
      excessMileageRate:    Number(body.excess_mileage_rate),
      dispositionFee:       Number(body.disposition_fee),
      earlyTerminationFee:  Number(body.early_termination_fee),
      purchaseOptionFee:    Number(body.purchase_option_fee),
      tradeinYear:          body.tradein_year ?? '',
      tradeinMake:          body.tradein_make ?? '',
      tradeinModel:         body.tradein_model ?? '',
      tradeinGrossAllowance: Number(body.tradein_gross_allowance ?? 0),
      tradeinPriorBalance:   Number(body.tradein_prior_balance ?? 0),
      customerSignerName:   body.customer_signer_name ?? '',
      customerSignerEmail:  body.customer_signer_email ?? '',
    }

    const calc = calculateLease(fi)

    const payload = {
      ...body,
      doc_status: body.doc_status || 'draft',
      // Persist calculated fields for reporting
      gross_cap_cost:              calc.grossCapCost,
      net_tradein_allowance:       calc.netTradeinAllowance,
      adjusted_cap_cost:           calc.adjustedCapCost,
      depreciation:                calc.depreciation,
      total_base_monthly_payments: calc.totalBaseMonthlyPayments,
      base_monthly_payment:        calc.baseMonthlyPayment,
      total_monthly_payment:       calc.totalMonthlyPayment,
      total_of_payments:           calc.totalOfPayments,
      amount_due_at_signing:       calc.amountDueAtSigning,
      official_fees_taxes:         calc.officialFeesTaxes,
    }

    const { data, error } = await getSupabaseAdmin()
      .from('leases')
      .insert(payload)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const userEmail = getUserEmailFromRequest(req)
    await logAudit(userEmail, 'lease.created', data.id, {
      lessee:  data.lessee_name,
      lessor:  data.lessor_name,
      vehicle: `${data.vehicle_year} ${data.vehicle_make} ${data.vehicle_model}`,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 })
  }
}
