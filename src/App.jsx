import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { PrankProvider } from "@/context/PrankContext"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { Catalog } from "@/pages/Catalog"
import { Dashboard } from "@/pages/Dashboard"
import { Pricing } from "@/pages/Pricing"

function App() {
  return (
    <PrankProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="pricing" element={<Pricing />} />
          </Route>
        </Routes>
      </Router>
      <Toaster richColors position="top-right" theme="dark" />
    </PrankProvider>
  )
}

export default App
