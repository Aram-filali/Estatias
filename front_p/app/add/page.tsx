"use client"; // ✅ Add this line

import React from "react";
import SearchPage2 from "@components/addProperty/AddProperty";

const Add = () => {
  // Define your step functions
  const nextStep = () => console.log("Next Step");
  const prevStep = () => console.log("Previous Step");

  return (
    <div>
      <SearchPage2 nextStep={nextStep} prevStep={prevStep} />
    </div>
  );
};

export default Add;
