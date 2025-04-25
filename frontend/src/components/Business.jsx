import React from "react";
import { features } from "../constants";
import styles, { layout } from "../style";
import Button from "./Button";
import { apple, bill, discount, google, map, videosora, dp } from "../assets";
import { Link } from "react-router-dom"; // ← import Link

const FeatureCard = ({ icon, title, content, index }) => (
  <div
    className={`flex flex-row p-6 rounded-[20px] ${
      index !== features.length - 1 ? "mb-6" : "mb-0"
    } feature-card`}
  >
    <div
      className={`w-[64px] h-[64px] rounded-full ${styles.flexCenter} bg-dimBlue`}
    >
      <img src={icon} alt="icon" className="w-[50%] h-[50%] object-contain" />
    </div>
    <div className="flex-1 flex flex-col ml-3">
      <h4 className="font-poppins font-semibold text-white text-[18px] leading-[23px] mb-1">
        {title}
      </h4>
      <p className="font-poppins font-normal text-dimWhite text-[16px] leading-[24px]">
        {content}
      </p>
    </div>
  </div>
);

const Business = () => {
  return (
    <section id="features" className={layout.section}>
      <div className={layout.sectionInfo}>
        <h2 className={styles.heading2}>
          Detecting DeepFakes <br className="sm:block hidden" />
          Made Easier
        </h2>
        <p className={`${styles.paragraph} max-w-[470px] mt-5`}>
          With our advanced deepfake detection module, you can safeguard digital
          content by identifying AI-generated manipulations with precision.
          Protect authenticity in a world filled with synthetic media.
        </p>
        <Button styles="mt-10" />
      </div>

      <div
        className={layout.sectionImgReverse}
        style={{ position: "relative" }}
      >
        <video
          src={dp}
          autoPlay
          loop
          muted
          className="w-full h-full relative z-5 object-cover rounded-lg"
        />
      </div>
    </section>
  );
};

export default Business;
