"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const steps = [
  { title: "Step 1: Add Your Property", description: "Enter details about your property to get started." },
  { title: "Step 2: Customize Your Website", description: "Choose a design and personalize your site." },
  { title: "Step 3: Publish & Get Bookings", description: "Go live and start receiving direct bookings!" },
];

export default function GetStarted() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push("/dashboard"); // Redirect after final step
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      {/* Step Indicator */}
      <div className="flex space-x-4 mb-6">
        {steps.map((_, index) => (
          <div key={index} className={`w-8 h-8 flex items-center justify-center rounded-full 
            ${index <= currentStep ? "bg-blue-500" : "bg-gray-600"} text-sm font-bold`}>
            {index + 1}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-lg"
      >
        <h2 className="text-2xl font-bold mb-2">{steps[currentStep].title}</h2>
        <p className="text-gray-300 mb-6">{steps[currentStep].description}</p>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex space-x-4">
        {currentStep > 0 && (
          <button
            onClick={prevStep}
            className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition"
          >
            Back
          </button>
        )}
        <button
          onClick={nextStep}
          className="px-4 py-2 bg-blue-500 rounded-md hover:bg-blue-400 transition"
        >
          {currentStep < steps.length - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
}
