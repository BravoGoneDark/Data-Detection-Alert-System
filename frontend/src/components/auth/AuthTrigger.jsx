import { useState } from "react";
import { motion } from "motion/react";

export default function AuthTrigger({ onClick }) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  const handleClick = () => {
    setIsUnlocked(true);
    setTimeout(() => {
      onClick();
      setIsUnlocked(false); 
    }, 500); 
  };

  return (
    <motion.button
      onClick={handleClick}
      className="relative group flex items-center justify-center p-8 bg-transparent border-0 outline-none cursor-pointer"
      whileHover={{ scale: 1.1 }}
      animate={{ rotate: [0, -3, 3, 0] }}
      transition={{ rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
    >
      <motion.div 
        className="absolute inset-0 rounded-full bg-[#00c2de] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
      />
      
      <svg 
        width="100" 
        height="100" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="#00c2de" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        /* Added overflow-visible here so the animation doesn't clip */
        className="relative z-10 drop-shadow-[0_0_15px_rgba(0,194,222,0.8)] overflow-visible"
      >
        <motion.path 
          d="M19 11V9C19 5.13401 15.866 2 12 2C8.13401 2 5 5.13401 5 9V11" 
          animate={isUnlocked ? { y: -4, x: -3, rotate: -20 } : { y: 0, x: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        />
        <path d="M5 11H19C20.1046 11 21 11.8954 21 13V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V13C3 11.8954 3.89543 11 5 11Z" fill="#000000" />
        <circle cx="12" cy="16" r="1.5" fill="#00c2de" stroke="none" />
        <path d="M12 17.5V19" stroke="#00c2de" />
      </svg>
    </motion.button>
  );
}