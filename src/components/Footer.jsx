import React from "react";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} EduStream Platform. All rights
          reserved.
        </p>
        <div className="flex justify-center gap-6 mt-4">
          <a href="#" className="text-xs text-slate-400 hover:text-blue-600">
            Privacy Policy
          </a>
          <a href="#" className="text-xs text-slate-400 hover:text-blue-600">
            Terms of Service
          </a>
          <a href="#" className="text-xs text-slate-400 hover:text-blue-600">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
