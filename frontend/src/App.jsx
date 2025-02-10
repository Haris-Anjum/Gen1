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
import Detect from "./components/Detect"; // Import the Detect page component
import styles from "./style"; // Import styles

// Home Page Component
const Home = () => (
  <div className="bg-primary w-full min-h-screen overflow-hidden flex flex-col">
    {/* Navbar Section */}
    <div className={`${styles.paddingX} ${styles.flexCenter}`}>
      <div className={`${styles.boxWidth}`}>
        <Navbar /> {/* Navbar specific to Home */}
      </div>
    </div>

    {/* Hero Section */}
    <div className={`bg-primary ${styles.flexStart}`}>
      <div className={`${styles.boxWidth}`}>
        <Hero />
      </div>
    </div>

    {/* Main Content Section */}
    <div
      className={`bg-primary ${styles.paddingX} ${styles.flexStart} flex-grow`}
    >
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
const App = () => {
  return (
    <Router>
      <Routes>
        {/* Home Route */}
        <Route path="/" element={<Home />} />

        {/* Detect Route */}
        <Route
          path="/Detect"
          element={
            <div className="bg-primary w-full min-h-screen flex flex-col overflow-y-auto">
              {/* Navbar Section */}
              <div className={`${styles.paddingX} ${styles.flexCenter}`}>
                <div className={`${styles.boxWidth}`}>
                  <Navbar /> {/* Navbar specific to Detect */}
                </div>
              </div>

              {/* Detect Page Content */}
              <div className="flex-grow">
                <Detect />
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
