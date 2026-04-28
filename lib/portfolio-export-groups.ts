import { ColGroup } from '@/components/ExportVehiclesModal'
import { ImportColumnGroup } from '@/components/ImportVehiclesModal'
import { LeasePortfolioRecord } from '@/lib/lease-portfolio-types'

export const PORTFOLIO_EXPORT_GROUPS: ColGroup<LeasePortfolioRecord>[] = [
  {
    name: 'Identifiers',
    required: true,
    cols: [
      { label: 'Lease ID', key: 'lease_id' },
    ],
  },
  {
    name: 'Status',
    required: false,
    cols: [
      { label: 'Lease Status',       key: 'lease_status'       },
      { label: 'Onboard Type',       key: 'onboard_type'       },
      { label: 'Contract Structure', key: 'contract_structure' },
      { label: 'Lease Type',         key: 'lease_type'         },
    ],
  },
  {
    name: 'Customer',
    required: false,
    cols: [
      { label: 'Company',       key: 'company_name'  },
      { label: 'Customer Name', key: 'customer_name' },
      { label: 'Customer Type', key: 'customer_type' },
      { label: 'Driver',        key: 'driver'        },
      { label: 'Location',      key: 'location'      },
      { label: 'Phone',         key: 'phone'         },
      { label: 'Email',         key: 'email_address' },
    ],
  },
  {
    name: 'Billing',
    required: false,
    cols: [
      { label: 'Billing Address', key: 'billing_address'  },
      { label: 'Billing City',    key: 'billing_city'     },
      { label: 'Billing State',   key: 'billing_state'    },
      { label: 'Billing ZIP',     key: 'billing_zip_code' },
    ],
  },
  {
    name: 'Vehicle',
    required: false,
    cols: [
      { label: 'Year',                     key: 'model_year'               },
      { label: 'Make',                     key: 'make'                     },
      { label: 'Model',                    key: 'model'                    },
      { label: 'Color',                    key: 'color'                    },
      { label: 'VIN',                      key: 'vin'                      },
      { label: 'Comments',                 key: 'comments'                 },
      { label: 'GPS Serial #',             key: 'gps_serial_number'        },
      { label: 'Vehicle Acquisition Date', key: 'vehicle_acquisition_date' },
      { label: 'Vehicle Use Type',         key: 'vehicle_use_type'         },
      { label: 'MLA Flag',                 key: 'mla_flag'                 },
    ],
  },
  {
    name: 'Odometer',
    required: false,
    cols: [
      { label: 'Odometer',      key: 'odometer'                },
      { label: 'Odometer Date', key: 'odometer_date'           },
      { label: 'Sold Odometer', key: 'odometer_at_time_of_sale'},
    ],
  },
  {
    name: 'Dates',
    required: false,
    cols: [
      { label: 'Lease Start',              key: 'lease_start_date'            },
      { label: 'Lease End',                key: 'lease_end_date'              },
      { label: 'Term (mo.)',               key: 'term'                        },
      { label: 'NDVR Date',                key: 'ndvr_date'                   },
      { label: 'Out of Service Date',      key: 'out_of_service_date'         },
      { label: 'Insurance Exp. Date',      key: 'insurance_expiration_date'   },
      { label: 'First Liability Pmt Date', key: 'first_liability_payment_date'},
    ],
  },
  {
    name: 'Lease Terms',
    required: false,
    cols: [
      { label: 'Annual Miles',       key: 'annual_miles_limit'  },
      { label: 'Lease End Mile Fee', key: 'lease_end_mile_fee'  },
      { label: 'Title State',        key: 'title_state'         },
      { label: 'Registration Date',  key: 'registration_date'   },
      { label: 'Plate #',            key: 'plate_number'        },
      { label: 'Tax Type',           key: 'tax_type'            },
    ],
  },
  {
    name: 'Financials',
    required: false,
    cols: [
      { label: 'Net Cap Cost',          key: 'net_cap_cost'          },
      { label: 'Mon. Depreciation',     key: 'monthly_depreciation'  },
      { label: 'Mon. Interest',         key: 'monthly_interest'      },
      { label: 'Mon. Tax',              key: 'monthly_tax'           },
      { label: 'Mon. Payment',          key: 'monthly_payment'       },
      { label: 'Lease End Residual',    key: 'lease_end_residual'    },
      { label: 'Tax Paid Upfront',      key: 'tax_paid_upfront'      },
      { label: 'Acquisition Fee',       key: 'acquisition_fee'       },
      { label: 'Incentive Recognition', key: 'incentive_recognition' },
      { label: 'Mon. Cash Flow',        key: 'monthly_cash_flow'     },
    ],
  },
  {
    name: 'Sale & Disposition',
    required: false,
    cols: [
      { label: 'Sold Date',        key: 'sold_date'        },
      { label: 'Disposal Date',    key: 'disposal_date'    },
      { label: 'Net Sale Price',   key: 'net_sale_price'   },
      { label: 'MMR',              key: 'mmr'              },
      { label: 'Days to Sell',     key: 'days_to_sell'     },
      { label: 'Disposition Fees', key: 'disposition_fees' },
      { label: 'Early Term Fees',  key: 'early_term_fees'  },
    ],
  },
  {
    name: 'Lender',
    required: false,
    cols: [
      { label: 'Lender',                 key: 'lender'                   },
      { label: 'Loan/Lease #',           key: 'lender_loan_lease_number' },
      { label: 'Liability Start',        key: 'liability_start_date'     },
      { label: 'Liability End',          key: 'liability_end_date'       },
      { label: 'Funding Amount',         key: 'funding_amount'           },
      { label: 'Monthly Liability Pmt.', key: 'monthly_liability_payment'},
      { label: 'Balloon Payment',        key: 'balloon_payment'          },
      { label: 'Mon. Dep. (SL)',         key: 'monthly_depreciation_sl'  },
      { label: 'Lender Int. Rate',       key: 'lender_interest_rate'     },
      { label: 'Lender Term',            key: 'lender_term'              },
      { label: 'Lender Type',            key: 'lender_type'              },
      { label: 'Liability Balance',      key: 'liability_balance'        },
      { label: 'Net Book Value',         key: 'net_book_value'           },
    ],
  },
]

export const PORTFOLIO_IMPORT_GROUPS: ImportColumnGroup[] = [
  {
    name: 'Customer',
    cols: ['Company', 'Customer Name', 'Customer Type', 'Driver', 'Location', 'Phone', 'Email',
           'Billing Address', 'Billing City', 'Billing State', 'Billing ZIP'],
  },
  {
    name: 'Vehicle',
    cols: ['Year', 'Make', 'Model', 'Color', 'VIN', 'Comments', 'GPS Serial #',
           'Vehicle Acquisition Date', 'Vehicle Use Type'],
  },
  {
    name: 'Dates',
    cols: ['Lease Start', 'Lease End', 'Term (mo.)', 'NDVR Date', 'Out of Service Date',
           'Insurance Exp. Date', 'First Liability Pmt Date', 'Registration Date'],
  },
  {
    name: 'Odometer',
    cols: ['Odometer', 'Odometer Date', 'Sold Odometer'],
  },
  {
    name: 'Financials',
    cols: ['Net Cap Cost', 'Mon. Depreciation', 'Mon. Interest', 'Mon. Tax', 'Mon. Payment',
           'Lease End Residual', 'Tax Paid Upfront', 'Acquisition Fee', 'Incentive Recognition',
           'Mon. Cash Flow'],
  },
  {
    name: 'Lease Terms',
    cols: ['Annual Miles', 'Lease End Mile Fee', 'Title State', 'Plate #', 'Tax Type'],
  },
  {
    name: 'Lender',
    cols: ['Lender', 'Loan/Lease #', 'Liability Start', 'Liability End', 'Funding Amount',
           'Monthly Liability Pmt.', 'Balloon Payment', 'Mon. Dep. (SL)', 'Lender Int. Rate',
           'Lender Term', 'Lender Type', 'Liability Balance', 'Net Book Value'],
  },
  {
    name: 'Classification',
    cols: ['Contract Structure', 'Lease Type', 'Onboard Type'],
  },
  {
    name: 'Sale & Disposition',
    cols: ['Sold Date', 'Disposal Date', 'Net Sale Price', 'MMR', 'Days to Sell',
           'Disposition Fees', 'Early Term Fees', 'Sold Odometer'],
  },
]
