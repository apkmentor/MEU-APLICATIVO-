import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./pages/AppLayout";
import ChatPage from "./pages/ChatPage";
import { TracksPage, TrackDetailPage } from "./pages/TracksPage";
import ReferralPage from "./pages/ReferralPage";
import UpgradePage from "./pages/UpgradePage";

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/chat" replace />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="chat/:sessionId" element={<ChatPage />} />
              <Route path="trilhas" element={<TracksPage />} />
              <Route path="trilhas/:trackId" element={<TrackDetailPage />} />
              <Route path="indicar" element={<ReferralPage />} />
              <Route path="upgrade" element={<UpgradePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" theme="dark" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
