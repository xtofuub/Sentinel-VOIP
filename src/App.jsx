import React, { Suspense, lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { RequireAuth } from "@/components/RequireAuth"
import { AppProvider } from "@/state/AppContext"
import { AuthProvider } from "@/state/AuthContext"

const Overview = lazy(() => import("@/pages/Overview").then((module) => ({ default: module.Overview })))
const Library = lazy(() => import("@/pages/Library").then((module) => ({ default: module.Library })))
const NewSession = lazy(() => import("@/pages/NewSession").then((module) => ({ default: module.NewSession })))
const Activity = lazy(() => import("@/pages/Activity").then((module) => ({ default: module.Activity })))
const RecordingDetail = lazy(() => import("@/pages/RecordingDetail").then((module) => ({ default: module.RecordingDetail })))
const ApiLogs = lazy(() => import("@/pages/ApiLogs").then((module) => ({ default: module.ApiLogs })))
const Login = lazy(() => import("@/pages/Login").then((module) => ({ default: module.Login })))
const Account = lazy(() => import("@/pages/Account").then((module) => ({ default: module.Account })))
const Admin = lazy(() => import("@/pages/Admin").then((module) => ({ default: module.Admin })))

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
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Overview />} />
                <Route path="library" element={<Library />} />
                <Route path="catalog" element={<Navigate to="/library" replace />} />
                <Route path="login" element={<Login />} />
                <Route path="auth/callback" element={<Login />} />
                <Route path="new" element={<NewSession />} />
                <Route path="dashboard" element={<Navigate to="/new" replace />} />
                <Route path="activity" element={<Activity />} />
                <Route path="activity/:accountDid/:recordingId" element={<RecordingDetail />} />
                <Route path="logs" element={<ApiLogs />} />
                <Route path="account" element={<RequireAuth allowSuspended><Account /></RequireAuth>} />
                <Route path="admin" element={<RequireAuth admin><Admin /></RequireAuth>} />
                <Route path="pricing" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  )
}
