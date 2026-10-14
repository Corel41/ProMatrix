import { useLocation } from 'react-router-dom'

export default function PlaceholderModule({ moduleName, description }) {
  const location = useLocation()
  const displayTitle = moduleName || location.pathname.replace('/', '').toUpperCase().replace('-', ' ')

  return (
    <div className="flex flex-col h-full w-full bg-white text-black font-sans text-xs p-6 overflow-y-auto">
      <div className="bg-white border border-gray-300 p-4 mb-4">
        <div className="border-b border-gray-300 pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800 uppercase tracking-tight">
              {displayTitle}
            </h1>
            <p className="text-xs text-gray-600 font-serif mt-0.5">
              {description || 'Legacy Propwings ASP.NET Enterprise Module Subsystem'}
            </p>
          </div>
          <button
            type="button"
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            + New Record
          </button>
        </div>

        <div className="p-3 bg-gray-50 border border-gray-300 mb-4 flex items-center gap-3">
          <span className="font-bold text-gray-700">Filter Records:</span>
          <input
            type="text"
            placeholder="Search keywords..."
            className="border border-gray-400 rounded-none h-7 px-1 text-sm bg-white w-64"
          />
          <button
            type="button"
            className="bg-orange-500 text-white rounded-none px-4 py-1 text-sm font-bold cursor-pointer"
          >
            Search
          </button>
        </div>

        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left w-12">#</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Reference No</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Particulars / Subject</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-left">Entity / Account</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-right">Amount (KES)</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Status</th>
              <th className="bg-gray-800 text-white text-sm font-normal py-1 px-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white border-b border-gray-200 hover:bg-gray-50">
              <td className="py-1 px-2 font-mono">1</td>
              <td className="py-1 px-2 font-mono font-bold">REF-2026-001</td>
              <td className="py-1 px-2">Operational record initialized under {displayTitle}</td>
              <td className="py-1 px-2">Metrocosmo Agency Nairobi</td>
              <td className="py-1 px-2 text-right font-mono">0.00</td>
              <td className="py-1 px-2 text-center font-mono text-blue-700">PENDING</td>
              <td className="py-1 px-2 text-center">
                <span className="text-blue-700 underline cursor-pointer font-semibold mr-2">View</span>
                <span className="text-red-600 underline cursor-pointer font-semibold">Delete</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
