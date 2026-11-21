"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";

interface YawmiLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function YawmiLogo({ size = "md", showText = true }: YawmiLogoProps) {
  const [imgError, setImgError] = useState(false);

  const dimensionMap = {
    sm: { box: "w-8 h-8", text: "text-lg", img: 32 },
    md: { box: "w-10 h-10", text: "text-xl", img: 40 },
    lg: { box: "w-14 h-14", text: "text-2xl", img: 56 },
  };

  const currentSize = dimensionMap[size];

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`${currentSize.box} rounded-xl overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-900 text-white shadow-md shadow-indigo-600/20 border border-indigo-500/30 flex-shrink-0`}
      >
        {!imgError ? (
          <Image
            src="/yawmi.jpeg"
            alt="Yawmi"
            width={currentSize.img}
            height={currentSize.img}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            priority
          />
        ) : (
          <Clock className="w-1/2 h-1/2 text-white" />
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${currentSize.text} leading-none font-cairo`}>
            يَومي <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400 font-sans tracking-wide">Yawmi</span>
          </span>
        </div>
      )}
    </div>
  );
}
