import React, { Suspense, lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { AppProvider } from "@/state/AppContext"

const Overview = lazy(() => import("@/pages/Overview").then((module) => ({ default: module.Overview })))
const Library = lazy(() => import("@/pages/Library").then((module) => ({ default: module.Library })))
const NewSession = lazy(() => import("@/pages/NewSession").then((module) => ({ default: module.NewSession })))
const Activity = lazy(() => import("@/pages/Activity").then((module) => ({ default: module.Activity })))
const ApiLogs = lazy(() => import("@/pages/ApiLogs").then((module) => ({ default: module.ApiLogs })))

function Loading() {
  return (
    <div className="route-loading" role="status">
      <span className="loader" aria-hidden="true" />
      Loading
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Overview />} />
              <Route path="library" element={<Library />} />
              <Route path="catalog" element={<Navigate to="/library" replace />} />
              <Route path="new" element={<NewSession />} />
              <Route path="dashboard" element={<Navigate to="/new" replace />} />
              <Route path="activity" element={<Activity />} />
              <Route path="logs" element={<ApiLogs />} />
              <Route path="pricing" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  )
}
