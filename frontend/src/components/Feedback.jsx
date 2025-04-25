import React from 'react'
import { quotes } from '../assets'

const Feedback = ({ content, name, title, img }) => {
  return (
    <div className='flex flex-col items-center px-10 py-12 rounded-[20px] max-w-[370px] md:mr-10 sm:mr-5 mr-0 my-5 feedback-card bg-[#1F1F1F] text-center'>

      {/* Profile Image + Hover Effects */}
      <div className='relative group mb-7'>
        <img
          src={img}
          alt={name}
          className='w-[110px] h-[110px] rounded-full object-cover'
        />
        {/* Hover Bounding Box */}
        <div className='absolute inset-0 rounded-full border-2 border-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
        {/* Hover Name Tag */}
        <div className='absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10'>
          {name}
        </div>
      </div>

      {/* Name and Email */}
      <h4 className='font-poppins font-semibold text-[20px] leading-[32px] text-white mb-1'>{name}</h4>
      <p className='font-poppins font-normal text-[16px] leading-[24px] text-white mb-4'>{title}</p>

      {/* Quotes */}
      <img
        src={quotes}
        alt='double-quotes'
        className='w-[32px] h-[20px] object-contain mb-3'
      />
      <p className='font-poppins font-normal text-[16px] leading-[28px] text-white'>
        {content}
      </p>
    </div>
  )
}

export default Feedback
