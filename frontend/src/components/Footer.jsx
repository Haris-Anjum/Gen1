import React from "react";
import { logo } from "../assets";
import { footerLinks, socialMedia } from "../constants";

const Footer = () => {
  return (
    <footer className="bg-primary text-white py-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Section */}
        <div className="flex flex-wrap justify-between items-start">
          {/* Logo and Tagline */}
          <div className="flex-1 min-w-[200px] mb-6">
            <img src={logo} alt="Logo" className="w-[200px] h-auto mb-4" />
            <p className="text-dimWhite text-[16px]">
              See Beyond the Fake, Trust What's Real!
            </p>
          </div>

          {/* Footer Links */}
          <div className="flex-[2] w-full md:w-auto flex flex-wrap gap-10">
            {footerLinks.map((link) => (
              <div key={link.title} className="min-w-[150px]">
                <h4 className="font-bold text-[18px] mb-4">{link.title}</h4>
                <ul className="space-y-2">
                  {link.links.map((item) => (
                    <li
                      key={item.name}
                      className="text-[16px] text-dimWhite hover:text-secondary cursor-pointer"
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-wrap justify-between items-center border-t border-t-[#3F3E45] pt-6 mt-6">
          <p className="text-[16px] text-center md:text-left">
            2024 GEN1. All Rights Reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            {socialMedia.map((social) => (
              <img
                key={social.id}
                src={social.icon}
                alt={social.id}
                className="w-[24px] h-[24px] object-contain cursor-pointer"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
