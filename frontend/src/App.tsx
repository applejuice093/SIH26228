import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import NotFound from './pages/NotFound'
import Dashboard from './pages/Dashboard'
import Story from './pages/Story'
import Assets from './pages/Assets'
import Assessments from './pages/Assessments'
import Findings from './pages/Findings'
import Incident from './pages/Incident'
import Incidents from './pages/Incidents'
import Provenance from './pages/Provenance'
import Audit from './pages/Audit'
import Report from './pages/Report'
import Capabilities from './pages/Capabilities'
import AssetDetail from './pages/AssetDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/story" replace />} />
        <Route path="/story" element={<Story />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/findings" element={<Findings />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<Incident />} />
        <Route path="/provenance" element={<Provenance />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/reports/:id" element={<Report />} />
        <Route path="/settings/capabilities" element={<Capabilities />} />
        <Route path="/models/:id" element={<AssetDetail kind="MODEL" />} />
        <Route path="/datasets/:id" element={<AssetDetail kind="DATASET" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
