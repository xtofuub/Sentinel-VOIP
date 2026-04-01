import React, { Suspense, lazy } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { PrankProvider } from "@/context/PrankContext"
import { Layout } from "@/components/layout/Layout"

// These pages export named components, so we map them to default for React.lazy.
const Home = lazy(() => import("@/pages/Home").then((m) => ({ default: m.Home })))
const Catalog = lazy(() => import("@/pages/Catalog"))
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })))
const Pricing = lazy(() => import("@/pages/Pricing").then((m) => ({ default: m.Pricing })))

function App() {
  return (
    <PrankProvider>
      <Router>
        <Suspense
          fallback={
            <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-outline">Loading…</div>
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pricing" element={<Pricing />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
      <Toaster richColors position="top-right" theme="dark" />
    </PrankProvider>
  )
}

export default App
