// import React from "react";
// import {
//   Billing,
//   Business,
//   CardDeal,
//   Clients,
//   CTA,
//   Footer,
//   Hero,
//   Stats,
//   Testimonials,
//   Navbar,
// } from "./components";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Detect from "./components/Detect"; // Import the Detect page component
// import styles from "./style"; // Import styles
// import ParticleTest from "./components/ParticleTest"; // ✅ Importing Test Page

// // Home Page Component
// const Home = () => (
//   <div className="bg-primary w-full min-h-screen overflow-hidden flex flex-col">
//     {/* Navbar Section */}
//     <div className={`${styles.paddingX} ${styles.flexCenter}`}>
//       <div className={`${styles.boxWidth}`}>
//         <Navbar /> {/* Navbar specific to Home */}
//       </div>
//     </div>

//     {/* Hero Section */}
//     <div className={`bg-primary ${styles.flexStart}`}>
//       <div className={`${styles.boxWidth}`}>
//         <Hero />
//       </div>
//     </div>

//     {/* Main Content Section */}
//     <div className={`bg-primary ${styles.paddingX} ${styles.flexStart} flex-grow`}>
//       <div className={`${styles.boxWidth}`}>
//         <Stats />
//         <Business />
//         <Billing />
//         <CardDeal />
//         <Testimonials />
//         <Clients />
//         <CTA />
//       </div>
//     </div>

//     {/* Footer Section */}
//     <Footer />
//   </div>
// );

// // Main App Component with Routing
// const App = () => {
//   return (
//     <Router>
//       <Routes>
//         {/* Home Route */}
//         <Route path="/" element={<Home />} />

//         {/* Detect Route */}
//         <Route path="/Detect" element={<Detect />} /> {/* Use Detect component directly */}

//         {/* ParticleTest Route */}
//         <Route path="/test" element={<ParticleTest />} /> {/* Use ParticleTest component directly */}
//       </Routes>
//     </Router>
//   );
// };

// export default App;


import React from "react";
import {
  Billing,
  Business,
  CardDeal,
  Clients,
  CTA,
  Footer,
  Hero,
  Stats,
  Testimonials,
  Navbar,
} from "./components";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Detect from "./components/Detect";
import AIDetect from "./components/AIDetect";       // ← new
import ParticleTest from "./components/ParticleTest";
import styles from "./style";

// Home Page Component
const Home = () => (
  <div className="bg-primary w-full min-h-screen overflow-hidden flex flex-col">
    {/* Navbar Section */}
    <div className={`${styles.paddingX} ${styles.flexCenter}`}>
      <div className={`${styles.boxWidth}`}>
        <Navbar />
      </div>
    </div>

    {/* Hero Section */}
    <div className={`bg-primary ${styles.flexStart}`}>
      <div className={`${styles.boxWidth}`}>
        <Hero />
      </div>
    </div>

    {/* Main Content Section */}
    <div className={`bg-primary ${styles.paddingX} ${styles.flexStart} flex-grow`}>
      <div className={`${styles.boxWidth}`}>
        <Stats />
        <Business />
        <Billing />
        <CardDeal />
        <Testimonials />
        <Clients />
        <CTA />
      </div>
    </div>

    {/* Footer Section */}
    <Footer />
  </div>
);

// Main App Component with Routing
const App = () => (
  <Router>
    <Routes>
      {/* Home Route */}
      <Route path="/" element={<Home />} />

      {/* Deepfake Detection */}
      <Route path="/detect" element={<Detect />} />

      {/* AI‑Generated Video Detection */}
      <Route path="/ai-detect" element={<AIDetect />} />

      {/* Particle Test / Background Demo */}
      <Route path="/test" element={<ParticleTest />} />
    </Routes>
  </Router>
);

export default App;
