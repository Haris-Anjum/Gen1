import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const Button = ({ styles }) => {
  const navigate = useNavigate(); // Get the navigate function

  const handleClick = () => {
    navigate('/Detect'); // Navigate to the Detect page
  };

  return (
    <button
      type="button"
      onClick={handleClick} // Call the navigate function on click
      className={`py-4 px-6 bg-blue-gradient font-poppins font-medium text-[18px] text-primary outline-none ${styles} rounded-[10px]`}
    >
      Start Detecting
    </button>
  );
};

export default Button;
