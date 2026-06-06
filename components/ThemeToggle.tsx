"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Ambil theme dari localStorage atau sistem default
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    setTheme(initialTheme);
    
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative flex items-center justify-between w-14 h-7 p-1 bg-gray-200 dark:bg-neutral-800 rounded-full cursor-pointer transition-colors duration-300 focus:outline-none border border-gray-300/40 dark:border-neutral-700/60 shadow-sm"
      aria-label="Toggle Theme Mode"
    >
      {/* Sun Icon */}
      <span className="text-[10px] pl-1 select-none">☀️</span>
      
      {/* Indicator Circle */}
      <span
        className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white dark:bg-teal-500 rounded-full shadow-md transition-transform duration-300 ease-in-out ${
          theme === "dark" ? "translate-x-7" : ""
        }`}
      />
      
      {/* Moon Icon */}
      <span className="text-[10px] pr-1 select-none">🌙</span>
    </button>
  );
}
