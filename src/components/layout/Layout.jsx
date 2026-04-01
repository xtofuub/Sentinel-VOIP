import { Outlet } from "react-router-dom"
import { TopNavBar } from "./TopNavBar"
import { Footer } from "./Footer"

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface overflow-x-hidden">
      <TopNavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
