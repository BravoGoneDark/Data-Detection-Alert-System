import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import CyberBackground from "./CyberBackground";
import AuthTrigger from "./AuthTrigger";
import AuthModal from "./AuthModal";
import { useAuth } from "../../context/AuthContext";

export default function AuthenticationPage({ children }) {
  const { isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // If authenticated, bypass the authentication screen entirely
  if (isAuthenticated) return children;

  return (
    <CyberBackground modalOpen={modalOpen} onOpenAuth={() => setModalOpen(true)}>
      {/* Scroll-driven showcase landing page */}
      <AuthTrigger onClick={() => setModalOpen(true)} />

      {/* Floating Auth Modal Overlay */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
            onClick={(e) => {
              // Close if clicked on the backdrop outside the modal
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <AuthModal onClose={() => setModalOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </CyberBackground>
  );
}