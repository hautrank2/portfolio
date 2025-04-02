import React from "react";

async function Header() {
  return (
    <header className="flex justify-between items-center w-full fixed top-0 h-16 px-16 border-b z-20 bg-background/90">
      <div className="header-branch">
        <h4 className="font-bold">Hautrank2</h4>
      </div>
      <div className="header-search px-16"></div>
      <div className="header-extra flex items-center gap-4"></div>
    </header>
  );
}

export default Header;
