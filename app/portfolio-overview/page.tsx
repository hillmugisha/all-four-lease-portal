import PortfolioOverview from '@/components/PortfolioOverview'

export default function PortfolioOverviewPage() {
  return (
    <div className="px-8 py-5 bg-white min-h-screen">
      <div className="pb-4 mb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Portfolio Overview</h1>
        <p className="mt-0.5 text-xs text-gray-500">
          Real-time snapshot of your fleet, active leases, and pipeline.
        </p>
      </div>
      <PortfolioOverview />
    </div>
  )
}
