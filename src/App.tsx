import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PBNProvider } from "./context/PBNContext";
import LandingPage from "./components/LandingPage";
import CreatePage from "./components/CreatePage";
import ResultsPage from "./components/ResultsPage";
import AuthPage from "./components/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PaintPage from "./components/PaintPage";
import ProfilePage from "./components/ProfilePage";
import CommunityPage from "./components/CommunityPage";
import Navbar from "./components/Navbar";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PBNProvider>
        <Router>
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />

            {/* Protected routes — must be signed in */}
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <ResultsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/paint"
              element={
                <ProtectedRoute>
                  <PaintPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={<CommunityPage />}
            />
          </Routes>
        </Router>
      </PBNProvider>
    </AuthProvider>
  );
};

export default App;
