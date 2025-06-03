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
    transactionalDetails: 'No additional transaction costs'
  }
];

const CheckIcon: React.FC = () => (
  <svg className={styles.checkIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className={`${styles.pricingCard} ${isSelected ? styles.pricingCardSelected : ''}`}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{plan.name}</h3>
        <p className={styles.cardDescription}>{plan.description}</p>
      </div>

      <div className={styles.pricingSection}>
        <div className={styles.upfrontPrice}>
          ${plan.upfrontCost}
          <span className={styles.upfrontLabel}>Upfront Cost</span>
        </div>
        <div className={styles.monthlyPrice}>
          ${plan.monthlyCost}
          <span className={styles.monthlyLabel}>/month</span>
        </div>
        {plan.transactionalDetails && (
          <p className={styles.transactionDetails}>
            {plan.transactionalDetails}
          </p>
        )}
      </div>

      <div className={styles.featuresContainer}>
        <ul className={styles.featuresList}>
          {plan.features.map((feature) => (
            <li key={feature} className={styles.featureItem}>
              <CheckIcon />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.trialNote}>
        <p className={styles.trialNoteText}>
          Includes 14-day free trial for both plans
        </p>
      </div>

      {showButton && (
        <button
          onClick={onSelect}
          className={`${styles.planButton} ${
            isSelected 
              ? styles.selectedButton 
              : plan.id === 'standard-plan' 
                ? styles.standardButton 
                : styles.premiumButton
          }`}
        >
          {plan.buttonText}
        </button>
      )}
    </div>
  );
};

// Add this at the top of your file, outside of your component
// This ensures all API calls use the same base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
            //setErrorMessage('Site generation timed out. This process may take longer than expected, please check your dashboard later.');
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
    <div className={styles.pricesContainer}>
      <section className={styles.mainSection}>
        <div className={styles.mainWrapper}>
          <div className={styles.headerSection}>
            <h2 className={styles.mainTitle}>
              Website Hosting Plans
            </h2>
            <div className={styles.headerFlex}>
              <p className={styles.subtitle}>
                Choose the plan that best fits your business model and growth strategy.
              </p>
            </div>
          </div>
          <div className={styles.spacer}></div>
          <div className={styles.spacer}></div>
          <div className={styles.plansGrid}>
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

          {/*<div className={styles.continueSection}>
            <div className={styles.errorContainer}>
              {showError && (
                <div className={styles.errorMessage}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{errorMessage || 'Please select a plan before continuing'}</span>
                </div>
              )}
            </div>

            <div className={styles.loadingContainer}>
              {loading ? (
                <div className={styles.loadingContainer}>
                  <svg
                    className={styles.loadingSpinner}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  <span className={styles.loadingText}>
                    Processing, please wait...
                  </span>
                  <span className={styles.loadingSubtext}>
                    This may take a few minutes as we set up your website
                  </span>
                </div>
              ) : (
                showContinueButton && (
                  <button
                    onClick={handleContinue}
                    className={styles.continueButton}
                  >
                    <span className={styles.continueButtonText}>Start my free trial</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={styles.continueButtonIcon}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )
              )}
            </div>
          </div>*/}
        </div>
      </section>
    </div>
  );
};

export default Prices;