import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, Search, Eye, Star, ArrowRight, Zap } from 'lucide-react';
import SEOContentGenerator from './aicomponent';
import styles from './SEOBoost.module.css';

const SEOBoostPopup = ({ 
  isOpen, 
  onClose, 
  onBoost, 
  onSkip,
  formData,
  onTitleGenerated,
  onDescriptionGenerated
}) => {

  const [isAnimating, setIsAnimating] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  
  // ✅ CORRECTION : État local pour stocker le contenu AI généré
  const [generatedContent, setGeneratedContent] = useState({
    title: '',
    description: ''
  });

  const handleBoost = () => {
    setShowAIGenerator(true);
  };

  const handleSkip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  // ✅ CORRECTION : Intercepter et stocker les données générées
  const handleTitleGenerated = (title) => {
    console.log('=== TITRE GÉNÉRÉ INTERCEPTÉ ===', title);
    setGeneratedContent(prev => ({
      ...prev,
      title: title
    }));
    // Également appeler le callback du parent pour mettre à jour formData
    onTitleGenerated(title);
  };

  const handleDescriptionGenerated = (description) => {
    console.log('=== DESCRIPTION GÉNÉRÉE INTERCEPTÉE ===', description);
    setGeneratedContent(prev => ({
      ...prev,
      description: description
    }));
    // Également appeler le callback du parent pour mettre à jour formData
    onDescriptionGenerated(description);
  };

  // ✅ CORRECTION : Fonction appelée quand le contenu AI est généré et appliqué
  const handleAIContentApplied = () => {
    console.log('=== CONTENU IA APPLIQUÉ ===');
    console.log('Contenu généré final:', generatedContent);
    
    // Fermer le générateur AI
    setShowAIGenerator(false);
    
    // ✅ CRUCIAL : Passer le contenu généré stocké localement
    setTimeout(() => {
      console.log('=== APPEL DE onBoost AVEC CONTENU GÉNÉRÉ ===');
      onBoost(generatedContent); // Passer le contenu généré
    }, 100);
  };

  const handleCloseAIGenerator = () => {
    setShowAIGenerator(false);
  };


  const benefits = [
    {
      icon: <TrendingUp className={styles.benefitIcon} />,
      title: "Increase Visibility",
      description: "Get 3x more views with SEO-optimized titles"
    },
    {
      icon: <Search className={styles.benefitIcon} />,
      title: "Better Rankings",
      description: "Rank higher in search results with smart keywords"
    },
    {
      icon: <Eye className={styles.benefitIcon} />,
      title: "Attract More Guests",
      description: "Compelling descriptions that convert browsers to bookers"
    },
    {
      icon: <Star className={styles.benefitIcon} />,
      title: "Professional Quality",
      description: "AI-powered content that sounds natural and engaging"
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Popup principal SEO Boost */}
      {!showAIGenerator && (
        <div className={styles.overlay}>
          <div className={`${styles.popup} ${isAnimating ? styles.closing : ''}`}>
            {/* Background Animation */}
            <div className={styles.backgroundAnimation}>
              <div className={styles.floatingElement}></div>
              <div className={styles.floatingElement}></div>
              <div className={styles.floatingElement}></div>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close popup"
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className={styles.header}>
              <div className={styles.iconContainer}>
                <Sparkles className={styles.mainIcon} />
                <div className={styles.iconGlow}></div>
              </div>
              <h2 className={styles.title}>
                🚀 Ready to <span className={styles.highlight}>Boost</span> Your Property?
              </h2>
              <p className={styles.subtitle}>
                Before we save your listing, let our AI create compelling content that gets results!
              </p>
            </div>

            {/* Benefits Grid */}
            <div className={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className={styles.benefitCard}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={styles.benefitIconContainer}>
                    {benefit.icon}
                  </div>
                  <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                  <p className={styles.benefitDescription}>{benefit.description}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className={styles.statsContainer}>
              <div className={styles.stat}>
                <div className={styles.statValue}>3x</div>
                <div className={styles.statLabel}>More Views</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>85%</div>
                <div className={styles.statLabel}>Higher Booking Rate</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>30s</div>
                <div className={styles.statLabel}>Quick Generation</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button 
                onClick={handleBoost}
                className={styles.boostButton}
              >
                <Zap className={styles.buttonIcon} />
                <span>Boost My Property</span>
                <ArrowRight className={styles.arrowIcon} />
              </button>
              
              <button 
                onClick={handleSkip}
                className={styles.skipButton}
              >
                Skip for Now
              </button>
            </div>

            {/* Footer Note */}
            <p className={styles.footerNote}>
              ✨ Free AI-powered optimization • Takes less than 30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Générateur de contenu AI */}
      {showAIGenerator && (
        <SEOContentGenerator
          formData={formData}
          onTitleGenerated={handleTitleGenerated}
          onDescriptionGenerated={handleDescriptionGenerated}
          currentTitle={formData.title}
          currentDescription={formData.description}
          isOpen={showAIGenerator}
          onClose={handleCloseAIGenerator}
          onContentApplied={handleAIContentApplied}
        />
      )}
    </>
  );
};

export default SEOBoostPopup;