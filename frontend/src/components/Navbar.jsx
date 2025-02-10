import React, { useState } from 'react';
import { close, logo, menu } from '../assets';
import { navLinks } from '../constants';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom

const Navbar = () => {
  const [toggle, setToggle] = useState(false);

  return (
    <nav className="w-full flex py-6 justify-between items-center navbar">
      <Link to="/">
        <img src={logo} alt="Logo" className="w-[124px] h-[60px] cursor-pointer" />
      </Link>
      
      {/* Desktop Navigation */}
      <ul className="list-none sm:flex hidden justify-end items-center flex-1">
        {navLinks.map((nav, i) => (
          // Remove the "Detect" link by filtering it out of navLinks or checking in here
          nav.title !== 'Detect' && (
            <li
              key={nav.id}
              className={`font-poppins font-normal cursor-pointer text-[16px] ${
                i === navLinks.length - 1 ? 'mr-0' : 'mr-10'
              } text-white`}
            >
              <a href={`#${nav.id}`}>{nav.title}</a>
            </li>
          )
        ))}
        <li className="font-poppins font-normal cursor-pointer text-[16px] text-white ml-10">
          {/* <Link to="/">Home</Link> Navigate to Home */}
        </li>
      </ul>

      {/* Mobile Navigation */}
      <div className="sm:hidden flex flex-1 justify-end items-center">
        <img
          src={toggle ? close : menu}
          alt="menu"
          className="w-[28px] h-[28px] object-contain"
          onClick={() => setToggle((previous) => !previous)}
        />
        <div
          className={`${
            toggle ? 'flex' : 'hidden'
          } p-6 bg-black-gradient absolute top-20 right-0 mx-4 my-2 min-w-[140px] rounded-xl sidebar`}
        >
          <ul className="list-none flex flex-col justify-end items-center flex-1">
            {navLinks.map((nav, i) => (
              // Remove the "Detect" link here as well
              nav.title !== 'Detect' && (
                <li
                  key={nav.id}
                  className={`font-poppins font-normal cursor-pointer text-[16px] text-white ${
                    i === navLinks.length - 1 ? 'mb-0' : 'mb-4'
                  }`}
                >
                  <a href={`#${nav.id}`} onClick={() => setToggle(false)}>
                    {nav.title}
                  </a>
                </li>
              )
            ))}
            <li className="font-poppins font-normal cursor-pointer text-[16px] text-white mt-4">
              {/* <Link to="/" onClick={() => setToggle(false)}>Home</Link> Navigate to Home */}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
