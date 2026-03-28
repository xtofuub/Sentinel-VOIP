import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = "" }) => {
  const MotionDiv = motion.div;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`glass-card ${className}`}
    >
      {children}
    </MotionDiv>
  );
};
