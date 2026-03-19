import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PBNProvider } from "./context/PBNContext";
import LandingPage from "./components/LandingPage";
import CreatePage from "./components/CreatePage";
import ResultsPage from "./components/ResultsPage";

const App: React.FC = () => {
  return (
    <PBNProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </Router>
    </PBNProvider>
  );
};

export default App;
