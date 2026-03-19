import { Routes, Route, Navigate } from "react-router-dom";
import { LandingRoute } from "./components/landing-route";
import { CardJobRoute } from "./components/card-job-route";

function App() {
  return (
    <>
      <div className="grain" />
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/card/:jobId" element={<CardJobRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
