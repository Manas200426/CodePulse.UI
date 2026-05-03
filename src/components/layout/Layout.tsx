import { Outlet } from 'react-router-dom'
import { SystemHealthProvider } from '@/context/SystemHealthContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function Layout() {
  return (
    <SystemHealthProvider>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* Fixed sidebar */}
        <Sidebar />

        {/* Right column: top bar + scrollable page content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>

      </div>
    </SystemHealthProvider>
  )
}
