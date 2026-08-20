import { useState } from "react";
import { AnimatePresence } from "motion/react";
import CyberBackground from "./CyberBackground";
import AuthTrigger from "./AuthTrigger";
import AuthModal from "./AuthModal";
import { useAuth } from "../../context/AuthContext";

export default function AuthenticationPage({ children }) {
  const { isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // If authenticated, bypass the animation and background entirely[cite: 3]
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