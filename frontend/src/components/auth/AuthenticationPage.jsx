import { useState } from "react";
import { AnimatePresence } from "motion/react";
import CyberBackground from "./CyberBackground";
import AuthTrigger from "./AuthTrigger";
import AuthModal from "./AuthModal";
import { useAuth } from "../../context/AuthContext";

// Renders the living background + gated auth flow. Children are the real
// app (e.g. the upload UI) and only mount once isAuthenticated is true.
export default function AuthenticationPage({ children }) {
  const { isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  if (isAuthenticated) return children;

  return (
    <CyberBackground modalOpen={modalOpen}>
      <AnimatePresence mode="wait">
        {modalOpen ? (
          <AuthModal key="modal" onClose={() => setModalOpen(false)} />
        ) : (
          <AuthTrigger key="trigger" onClick={() => setModalOpen(true)} />
        )}
      </AnimatePresence>
    </CyberBackground>
  );
}