import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Placeholder from './pages/Placeholder'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Assessments from './pages/Assessments'
import Findings from './pages/Findings'
import Incident from './pages/Incident'
import Incidents from './pages/Incidents'
import Provenance from './pages/Provenance'
import Audit from './pages/Audit'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/findings" element={<Findings />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<Incident />} />
        <Route path="/provenance" element={<Provenance />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="*" element={<Placeholder title="Not found" />} />
      </Route>
    </Routes>
  )
}
