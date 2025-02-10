import React from "react";
import { card } from "../assets";
import Button from "./Button";
import styles, { layout } from "../style";

const CardDeal = () => {
  return (
    <section id="card-deal" className={layout.section}>
      <div className={layout.sectionInfo}>
        <h2 className={styles.heading2}>
          Inside Our AI-Powered <br className="sm:block hidden" />
          Detection Process
        </h2>
        <p className={`${styles.paragraph} max-w-[470px] mt-5`}>
          Our cutting-edge detection system analyzes facial inconsistencies,
          motion artifacts, and synthetic distortions to differentiate real from
          AI-generated media. Using a multi-step verification process, we ensure
          high accuracy in detecting manipulated content.
        </p>
        <Button styles="mt-10" />
      </div>
      <div className={layout.sectionImg}>
        <img src={card} alt="card" className="w-[100%] h-[100%]" />
      </div>
    </section>
  );
};

export default CardDeal;
