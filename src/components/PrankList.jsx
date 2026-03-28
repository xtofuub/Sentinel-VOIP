import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, CheckCircle } from 'lucide-react';

export const PrankList = ({ pranks, selectedPrankId, onSelect }) => {
  const [playingId, setPlayingId] = useState(null);
  const [audio, setAudio] = useState(null);
  const MotionDiv = motion.div;

  const togglePlay = (e, prank) => {
    e.stopPropagation(); // Don't select the card when clicking play
    
    if (playingId === prank._id) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (audio) audio.pause();
      
      const newAudio = new Audio(prank.example);
      newAudio.play();
      newAudio.onended = () => setPlayingId(null);
      
      setAudio(newAudio);
      setPlayingId(prank._id);
    }
  };

  if (!pranks || pranks.length === 0) {
    return (
      <div className="empty-state">
        <p>Select a region to view available scenarios...</p>
      </div>
    );
  }

  return (
    <div className="prank-grid">
      <AnimatePresence>
        {pranks.map((prank) => (
          <MotionDiv
            layout
            key={prank._id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4 }}
            className={`prank-card ${selectedPrankId === prank._id ? 'selected' : ''}`}
            onClick={() => onSelect(prank)}
          >
            {selectedPrankId === prank._id && (
              <MotionDiv
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="selection-indicator"
              >
                <CheckCircle size={16} />
              </MotionDiv>
            )}
            
            <div className="card-image-wrapper">
              <img 
                src={prank.image_url} 
                alt={prank.titulo} 
                className="card-image"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/300x160?text=JuasApp+Ghost'; }}
              />
              <div 
                className="play-overlay"
                onClick={(e) => togglePlay(e, prank)}
              >
                {playingId === prank._id ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </div>
            </div>

            <div className="card-content">
              <h3 className="card-title">{prank.titulo}</h3>
              <p className="card-desc">{prank.desc || "No description available for this scenario."}</p>
            </div>
          </MotionDiv>
        ))}
      </AnimatePresence>
    </div>
  );
};
