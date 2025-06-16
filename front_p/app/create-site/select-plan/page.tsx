"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './prices.module.css';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

type PricingPlan = {
  id: string;
  name: string;
  description: string;
  upfrontCost: number;
  monthlyCost: number;
  features: string[];
  buttonText: string;
  accentColor?: string;
  hoverColor?: string;
  borderColor?: string;
  transactionalDetails?: string;
};

const HOSTING_PLANS: PricingPlan[] = [
  {
    id: 'standard-plan',
    name: 'Standard Plan',
    description: 'Low initial cost with transactional fees',
    upfrontCost: 500,
    monthlyCost: 29,
    features: [
      '14-day free trial',
      'Website hosting',
      'Standard support',
      'Low transactional fees',
      'Monthly maintenance',
      'Up to 3 property listings'
    ],
    buttonText: 'Choose Standard Plan',
    accentColor: 'bg-[#3f4c57]',
    hoverColor: 'hover:bg-[#3f4c57e6]',
    borderColor: 'border-[#3f4c57]',
    transactionalDetails: '5% for each reservation'
  },
  {
    id: 'premium-plan',
    name: 'Premium Plan',
    description: 'One-time purchase with no transactional fees',
    upfrontCost: 2500,
    monthlyCost: 49,
    features: [
      '14-day free trial',
      'Full website ownership',
      'Priority support',
      'Zero transactional fees',
      'Monthly maintenance',
      'Unlimited property listings'
    ],
    buttonText: 'Choose Premium Plan',
    accentColor: 'bg-[#1e293b]',
    hoverColor: 'hover:bg-[#1e293be6]',
    borderColor: 'border-[#1e293b]',
    transactionalDetails: 'No additional transaction costs'
  }
];

const CheckIcon: React.FC = () => (
  <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

type PricingCardProps = {
  plan: PricingPlan;
  showButton: boolean;
  isSelected: boolean;
  onSelect: () => void;
};

const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  showButton,
  isSelected,
  onSelect
}) => {
  return (
    <div
      className={`
        w-full 
        flex 
        flex-col 
        rounded-2xl 
        shadow-2xl 
        border-t-8 
        p-8 
        space-y-6 
        transform 
        transition-all 
        duration-300 
        hover:scale-105 
        min-h-[550px]
        ${isSelected ? 'bg-cyan-50 border-cyan-600' : 'bg-[var(--dwhiteCol)] border-gray-300'}
      `}
    >
      <div className="text-center">
        <h3 className="text-3xl font-bold text-[var(--lWrite)] mb-4">{plan.name}</h3>
        <p className="text-gray-600 text-base h-16">{plan.description}</p>
      </div>

      <div className="text-center py-6 border-y border-gray-400">
        <div className="text-5xl font-extrabold text-[var(--lWrite)] mb-2">
          ${plan.upfrontCost}
          <span className="text-base text-gray-500 font-normal block mt-1">Upfront Cost</span>
        </div>
        <div className="text-2xl font-semibold text-[var(--lWrite)]">
          ${plan.monthlyCost}
          <span className="text-base text-gray-500 font-normal">/month</span>
        </div>
        {plan.transactionalDetails && (
          <p className="text-sm text-gray-600 mt-2">
            {plan.transactionalDetails}
          </p>
        )}
      </div>

      <div className="flex-grow flex items-center justify-center">
        <ul className="space-y-4 text-center">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center justify-center text-gray-700 text-base">
              <CheckIcon />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-center mb-4">
        <p className="text-sm text-gray-600 italic">
          Includes 14-day free trial for both plans
        </p>
      </div>

      {showButton && (
        <button
          onClick={onSelect}
          className={`
            w-full 
            py-4 
            rounded-lg 
            font-semibold 
            text-white 
            text-lg 
            transition-opacity 
            duration-300 
            ${isSelected ? 'bg-cyan-600' : plan.accentColor}
            hover:opacity-80
          `}
        >
          {plan.buttonText}
        </button>
      )}
    </div>
  );
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://api-gateway-hcq3.onrender.com'  // Remplacez par votre URL Render
    : 'http://localhost:3000'
  );

const Prices: React.FC<{ 
  showButton?: boolean, 
  onPlanSelect?: (planId: string) => void,
  showContinueButton?: boolean 
}> = ({ 
  showButton = true, 
  onPlanSelect, 
  showContinueButton = false 
}) => {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelect = (planId: string) => {
    const newSelectedPlanId = planId === selectedPlanId ? null : planId;
    setSelectedPlanId(newSelectedPlanId);
    setShowError(false);
    if (onPlanSelect && newSelectedPlanId) {
      onPlanSelect(newSelectedPlanId);
    }
  };

  const handleContinue = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (!user) {
      console.error("Aucun utilisateur connecté");
      setErrorMessage('You need to be logged in to continue');
      setShowError(true);
      return;
    }
    
    const currentHostId = user.uid;
  
    if (!selectedPlanId) {
      console.error('Aucun plan sélectionné');
      setErrorMessage('Please select a plan before continuing');
      setShowError(true);
      return;
    }
  
    const selectedPlan = HOSTING_PLANS.find(plan => plan.id === selectedPlanId);
  
    try {
      setLoading(true);
  
      const idToken = await user.getIdToken();
  
      // First API call with consistent base URL
      const planUpdateResponse = await axios.post(
        `${API_BASE_URL}/hosts/plan`,
        {
          firebaseUid: currentHostId,
          plan: selectedPlan?.name,
          websiteUrl: `${currentHostId.toLowerCase()}.resa.com`,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          isTrialActive: true,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
      
      console.log('Plan data sent to backend:', {
        firebaseUid: currentHostId,  
        plan: selectedPlan?.name,
        websiteUrl: `${currentHostId.toLowerCase()}.resa.com`,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        isTrialActive: true,
      });
  
      if (planUpdateResponse.status !== 201) {
        console.error("Échec de l'enregistrement du plan:", planUpdateResponse.data);
        setErrorMessage('Failed to register your plan. Please try again later.');
        setShowError(true);
        setLoading(false);
        return;
      }
  
      console.log('Plan enregistré avec succès:', planUpdateResponse.data);
      
      try {
        // Call to site-generator microservice endpoint - no body data needed
        // The hostId is passed in the URL path parameter instead
        const siteGenerationResponse = await axios.post(
          `${API_BASE_URL}/site-generator/${currentHostId}/generate`,
          null, // No body needed, hostId is in the URL
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            // The microservice is set to use a 10 minute timeout, so we should match that
            timeout: 600000, 
          }
        );
        
        console.log('Site generation response:', siteGenerationResponse.data);
        
        // Le service retourne maintenant un objet avec message et url
        if (siteGenerationResponse.data && siteGenerationResponse.data.url) {
          // Redirect to success page with the URL as a parameter
          router.push(`/success?url=${encodeURIComponent(siteGenerationResponse.data.url)}&message=${encodeURIComponent(siteGenerationResponse.data.message)}`);
        } else {
          // Si l'URL n'est pas présente dans la réponse, simplement rediriger vers le dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Site generation error:', error);
        
        // Afficher des informations détaillées sur l'erreur
        if (axios.isAxiosError(error)) {
          if (error.response) {
            // La requête a été faite et le serveur a répondu avec un code d'état en dehors de la plage 2xx
            console.error('Server error response:', error.response.data);
            console.error('Status code:', error.response.status);
            
            // Si le microservice a renvoyé un message d'erreur spécifique
            if (error.response.data && error.response.data.error) {
              setErrorMessage(`Site generation failed: ${error.response.data.error}`);
            } else {
              setErrorMessage('Failed to generate your site. Please try again later.');
            }
          } else if (error.request) {
            // La requête a été faite mais aucune réponse n'a été reçue (timeout probable)
            console.error('No response received (possible timeout):', error.request);
            setErrorMessage('Site generation timed out. This process may take longer than expected, please check your dashboard later.');
          } else {
            // Quelque chose s'est passé lors de la configuration de la requête
            console.error('Request setup error:', error.message);
            setErrorMessage(`Error setting up the request: ${error.message}`);
          }
        } else {
          console.error('Unexpected error:', error);
          setErrorMessage('An unexpected error occurred during site generation.');
        }
        
        setShowError(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
      setShowError(true);
      setLoading(false);
    }
  };


  return (
    <div className={`${styles.pricesContainer} mt-[0px]`}>
      <section className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-7xl mx-auto">
          <div className="relative text-center mb-16 z-50">
            <h2 className="text-5xl font-extrabold text-[#24343e] mb-6">
              Website Hosting Plans
            </h2>
            <div className="flex justify-center">
              <p className="text-2xl text-gray-500 max-w-3xl mx-auto text-center">
                Choose the plan that best fits your business model and growth strategy.
              </p>
            </div>
          </div>
          <br />
          <br />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {HOSTING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                showButton={showButton}
                isSelected={selectedPlanId === plan.id}
                onSelect={() => handleSelect(plan.id)}
              />
            ))}
          </div>

          <div className="relative top-[40px] right-[-200px] w-full flex flex-col items-center">
            <div className="absolute top-[-40px] left-0 right-0 flex justify-center">
              {showError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm flex items-center space-x-2 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errorMessage || 'Please select a plan before continuing'}</span>
                </div>
              )}
            </div>

            {/* Affichage d'un indicateur de processing pendant le chargement */}
            {loading ? (
              <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-[#00ACC1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span className="mt-2 text-lg font-semibold text-[#00ACC1]">Processing, please wait...</span>
                <span className="mt-1 text-sm text-gray-500">This may take a few minutes as we set up your website</span>
              </div>
            ) : (
               (
                <button
                  onClick={handleContinue}
                  className={`
                    mt-8
                    px-12
                    py-4
                    rounded-lg 
                    text-white 
                    font-semibold 
                    text-[1.2rem] 
                    bg-[#00ACC1] 
                    hover:bg-[#0097A7] 
                    transition-all 
                    duration-300 
                    ease-in-out 
                    transform 
                    hover:-translate-y-1 
                    hover:shadow-lg
                    active:translate-y-0 
                    active:shadow-md 
                    focus:outline-none 
                    focus:ring-2 
                    focus:ring-[#00ACC1] 
                    focus:ring-opacity-50
                    flex 
                    justify-center 
                    items-center 
                    gap-1
                  `}
                >
                  <span className='pl-4'>
                    Start my free trial
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`${styles.span} h-14 w-25`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Prices;