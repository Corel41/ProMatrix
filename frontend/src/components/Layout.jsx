import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { getTenantContext } from '../lib/tenantContext'

export default function Layout({ session }) {
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function initContext() {
      try {
        const tenant = await getTenantContext()
        setContext(tenant)
      } catch (err) {
        console.error('Failed to load tenant context in Layout:', err)
      } finally {
        setLoading(false)
      }
    }
    initContext()
  }, [])

  return (
    <div className="h-screen w-full overflow-hidden flex bg-[#f8fafc] font-sans antialiased text-slate-800">
      {/* 1. Left Fixed Dark Sidebar */}
      <Sidebar activeContext={context} />

      {/* 2. Right Main Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <Header activeContext={context} session={session} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto w-full">
          <Outlet context={{ context, loadingContext: loading }} />
        </main>
      </div>
    </div>
  )
}
