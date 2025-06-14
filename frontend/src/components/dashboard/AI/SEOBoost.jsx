import React, { useState, useRef } from 'react';
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
  
  // ✅ SOLUTION : Utiliser useRef pour stocker immédiatement les valeurs générées
  const generatedContentRef = useRef({
    title: '',
    description: ''
  });

  // ✅ SOLUTION ALTERNATIVE : État local avec useState
  const [generatedContent, setGeneratedContent] = useState({
    title: '',
    description: ''
  });

  const handleBoost = () => {
    // Réinitialiser les valeurs au début
    generatedContentRef.current = { title: '', description: '' };
    setGeneratedContent({ title: '', description: '' });
    setShowAIGenerator(true);
  };

  const handleSkip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  // ✅ CORRECTION PRINCIPALE : Stocker immédiatement dans useRef ET dans useState
  const handleTitleGenerated = (title) => {
    console.log('=== TITRE GÉNÉRÉ INTERCEPTÉ ===', title);
    
    // Stocker immédiatement dans useRef
    generatedContentRef.current.title = title;
    console.log('✅ useRef mis à jour avec titre:', generatedContentRef.current);
    
    // Mettre à jour l'état local
    setGeneratedContent(prev => {
      const newContent = { ...prev, title: title };
      console.log('✅ État generatedContent mis à jour avec titre:', newContent);
      return newContent;
    });
    
    // Appeler le callback du parent pour mettre à jour formData
    onTitleGenerated(title);
  };

  const handleDescriptionGenerated = (description) => {
    console.log('=== DESCRIPTION GÉNÉRÉE INTERCEPTÉE ===', description);
    
    // Stocker immédiatement dans useRef
    generatedContentRef.current.description = description;
    console.log('✅ useRef mis à jour avec description:', generatedContentRef.current);
    
    // Mettre à jour l'état local
    setGeneratedContent(prev => {
      const newContent = { ...prev, description: description };
      console.log('✅ État generatedContent mis à jour avec description:', newContent);
      return newContent;
    });
    
    // Appeler le callback du parent pour mettre à jour formData
    onDescriptionGenerated(description);
  };

  // ✅ CORRECTION : Utiliser useRef pour avoir les valeurs les plus récentes
  const handleAIContentApplied = () => {
    console.log('=== CONTENU IA APPLIQUÉ ===');
    
    // Utiliser useRef pour avoir les valeurs immédiates
    const currentContent = generatedContentRef.current;
    console.log('Contenu généré final (useRef):', currentContent);
    console.log('Contenu généré final (useState):', generatedContent);
    
    // ✅ CRUCIAL : Vérifier que le contenu n'est pas vide
    if (!currentContent.title && !currentContent.description) {
      console.error('❌ ERREUR: Contenu généré vide!', currentContent);
      
      // Essayer de récupérer depuis formData si disponible
      const fallbackContent = {
        title: formData.title || '',
        description: formData.description || ''
      };
      
      if (fallbackContent.title || fallbackContent.description) {
        console.log('⚠️ Utilisation du contenu de fallback depuis formData:', fallbackContent);
        generatedContentRef.current = fallbackContent;
      } else {
        alert('Erreur: Le contenu généré est vide. Veuillez réessayer.');
        return;
      }
    }
    
    // Fermer le générateur AI
    setShowAIGenerator(false);
    
    // ✅ CRUCIAL : Passer le contenu généré stocké dans useRef
    setTimeout(() => {
      console.log('=== APPEL DE onBoost AVEC CONTENU GÉNÉRÉ ===');
      console.log('Contenu envoyé à onBoost:', generatedContentRef.current);
      onBoost(generatedContentRef.current);
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