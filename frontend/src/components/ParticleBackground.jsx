// src/components/ParticleBackground.jsx
import React from "react";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim"; // Use the slim version that works

const ParticleBackground = () => {
  const particlesInit = async (engine) => {
    console.log("tsparticles engine loaded");
    await loadSlim(engine);
  };

  const particlesLoaded = (container) => {
    console.log("tsparticles container loaded:", container);
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      loaded={particlesLoaded}
      options={{
        fullScreen: { enable: true, zIndex: -1 },
        background: { color: "#0f172a" },
        particles: {
          number: { value: 60 },
          color: { value: "#ffffff" },
          shape: { type: "circle" },
          opacity: { value: 0.5 },
          size: { value: 3 },
          links: {
            enable: true,
            distance: 150,
            color: "#ffffff",
            opacity: 0.4,
            width: 1,
          },
          move: { enable: true, speed: 1 },
        },
        interactivity: {
          events: {
            onHover: { enable: true, mode: "repulse" },
          },
        },
      }}
    />
  );
};

export default ParticleBackground;
