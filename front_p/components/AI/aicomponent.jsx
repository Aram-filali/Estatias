import React, { useState, useEffect } from 'react';
import { Lightbulb, Sparkles, Copy, Check, AlertCircle, Loader2, X } from 'lucide-react';
import styles from './SEOContentGenerator.module.css';

const SEOContentGenerator = ({
  formData,
  onTitleGenerated,
  onDescriptionGenerated,
  currentTitle = '',
  currentDescription = '',
  isOpen: isOpenProp, // Nouvelle prop pour contrôler l'ouverture depuis l'extérieur
  onClose: onCloseProp, // Nouvelle prop pour gérer la fermeture
  onContentApplied // Nouvelle prop appelée quand le contenu est appliqué
}) => {
  const [isOpen, setIsOpen] = useState(isOpenProp || false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [error, setError] = useState('');

  // Configuration de l'API
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

  // Synchroniser l'état local avec la prop
  useEffect(() => {
    if (isOpenProp !== undefined) {
      setIsOpen(isOpenProp);
    }
  }, [isOpenProp]);

  useEffect(() => {
    if (formData?.type && isOpen) {
      loadSuggestions();
    }
  }, [formData?.type, isOpen]);

 // Fonction pour obtenir l'URL de base de l'API
const getApiBaseUrl = () => {
  // En production, utilisez l'URL de votre API Gateway déployée
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || 'https://api-gateway-hcq3.onrender.com';
  }
  // En développement, utilisez localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:3000';
};

const generateContent = async () => {
  if (!userPrompt.trim()) {
    setError('Please describe what you want to highlight in your listing');
    return;
  }

  setIsGenerating(true);
  setError('');

  try {
    const requestData = {
      propertyType: formData.type,
      location: `${formData.city}, ${formData.state || ''}, ${formData.country}`.replace(', ,', ','),
      bedrooms: parseInt(formData.bedrooms) || undefined,
      bathrooms: parseInt(formData.bathrooms) || undefined,
      amenities: formData.amenities ? Object.keys(formData.amenities).filter(key => formData.amenities[key]) : [],
      userPrompt: userPrompt.trim(),
      tone: 'professional',
      language: 'en'
    };

    console.log('Sending request:', requestData);

    const apiBaseUrl = getApiBaseUrl();
    const possibleEndpoints = [
      `${apiBaseUrl}/properties/ai/generate-content`,
    ];

    let response;
    let lastError;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(requestData)
        });

        if (response.ok) {
          console.log(`Success with endpoint: ${endpoint}`);
          break;
        } else if (response.status !== 404) {
          lastError = new Error(`HTTP error! status: ${response.status}`);
          break;
        }
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    if (!response || !response.ok) {
      const errorText = await response?.text() || '';
      console.error('Response error:', errorText);
      
      if (response?.status === 404) {
        throw new Error('API endpoint not found. Please check your backend server configuration.');
      } else if (errorText.includes('<!DOCTYPE html>')) {
        throw new Error('Server returned HTML instead of JSON. The API endpoint may not exist.');
      } else {
        throw new Error(`HTTP error! status: ${response?.status}, message: ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('Response received:', data);

    if (data && (data.title || data.data)) {
      const content = data.data || data;
      setGeneratedContent({
        title: content.title,
        description: content.description,
        keywords: content.suggestions?.keywords || content.keywords || []
      });
      setError('');
    } else {
      setError('Invalid response format from server');
    }
  } catch (error) {
    console.error('Generation error:', error);
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      setError('API endpoint not found. Please check your backend server and ensure the route is properly configured.');
    } else if (error.message.includes('Unexpected token') || error.message.includes('HTML instead of JSON')) {
      setError('Server configuration error. The API is returning HTML instead of JSON.');
    } else if (error.message.includes('Failed to fetch')) {
      setError('Connection error. Please check if your backend server is running on port 3001.');
    } else {
      setError(`Connection error: ${error.message}`);
    }
  } finally {
    setIsGenerating(false);
  }
};

const loadSuggestions = async () => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const possibleEndpoints = [
      `${apiBaseUrl}/properties/ai/content-suggestions`,
    ];

    let response;
    
    for (const endpoint of possibleEndpoints) {
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            propertyType: formData.type,
            location: `${formData.city}, ${formData.country}`
          })
        });

        if (response.ok) break;
        if (response.status !== 404) break;
      } catch (error) {
        continue;
      }
    }

    if (response && response.ok) {
      const data = await response.json();
      console.log('Suggestions received:', data);

      if (Array.isArray(data)) {
        setSuggestions(data);
      } else if (data.data && Array.isArray(data.data)) {
        setSuggestions(data.data);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions(getDefaultSuggestions(formData.type));
    }
  } catch (error) {
    console.error('Error loading suggestions:', error);
    setSuggestions(getDefaultSuggestions(formData.type));
  }
};

  const getDefaultSuggestions = (propertyType) => {
    const type = propertyType?.toLowerCase();
    
    if (type === 'villa') {
      return [
        'Highlight the outdoor space and pool',
        'Mention the view and privacy',
        'Emphasize luxury and comfort'
      ];
    } else if (type === 'apartment') {
      return [
        'Highlight the central location',
        'Mention public transportation',
        'Emphasize modernity and amenities'
      ];
    } else if (type === 'hotel') {
      return [
        'Highlight hotel services',
        'Mention breakfast and services',
        'Emphasize professional hospitality'
      ];
    } else {
      return [
        'Describe the unique atmosphere of the place',
        'Highlight main amenities',
        'Mention nearby attractions',
        'Use local keywords in your description'
      ];
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'title') {
        setCopiedTitle(true);
        setTimeout(() => setCopiedTitle(false), 2000);
      } else {
        setCopiedDesc(true);
        setTimeout(() => setCopiedDesc(false), 2000);
      }
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const applyGeneratedContent = () => {
    if (generatedContent) {
      onTitleGenerated(generatedContent.title);
      onDescriptionGenerated(generatedContent.description);
      
      // Appeler onContentApplied si fourni (pour le flux SEO Boost)
      if (onContentApplied) {
        onContentApplied();
      } else {
        // Comportement original - fermer le dialog
        setIsOpen(false);
        resetDialog();
      }
    }
  };

  const resetDialog = () => {
    setGeneratedContent(null);
    setUserPrompt('');
    setError('');
    setCopiedTitle(false);
    setCopiedDesc(false);
  };

  const handleClose = () => {
    if (onCloseProp) {
      // Si une fonction de fermeture est fournie, l'utiliser
      onCloseProp();
    } else {
      // Comportement original
      setIsOpen(false);
    }
    resetDialog();
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  return (
    <>
      {/* Trigger Button - affiché seulement si pas contrôlé de l'extérieur */}
      {!isOpenProp && (
        <button
          type="button"
          onClick={handleOpen}
          className={styles.triggerButton2}
        >
          <Sparkles className={styles.icon2} />
          Boost my property
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div className={styles.modalOverlay2}>
          <div className={styles.modalContainer2}>
            {/* Header */}
            <button
              onClick={handleClose}
              className={styles.closeButton211}
            >
              <X className={styles.iconLarge2} />
            </button>
            <div className={styles.headerContainer2}>
              <div>
                <h2 className={styles.headerTitle2}>
                  <Lightbulb className={`${styles.iconLarge2} ${styles.iconYellow2}`} />
                  Optimized SEO Content Generator
                </h2>
                <p className={styles.headerSubtitle2}>
                  Use AI to create a title and description that attract more customers
                  and improve your visibility on search engines.
                </p>
              </div>
            </div>

            {/* Content */}
            <div className={styles.contentContainer2}>
              {/* Current Content Display */}
              {(currentTitle || currentDescription) && (
                <div className={styles.currentContentContainer2}>
                  <h3 className={styles.currentContentTitle2}>Current Content:</h3>
                  {currentTitle && (
                    <div className={styles.currentContentItem2}>
                      <span className={styles.currentContentLabel2}>Title:</span>
                      <p className={styles.currentContentText2}>{currentTitle}</p>
                    </div>
                  )}
                  {currentDescription && (
                    <div className={styles.currentContentItem2}>
                      <span className={styles.currentContentLabel2}>Description:</span>
                      <p className={styles.currentContentText2}>{currentDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className={styles.suggestionsContainer2}>
                  <h3 className={styles.suggestionsTitle2}>💡 Popular highlights for {formData?.type}:</h3>
                  <div className={styles.suggestionsGrid2}>
                    {suggestions.map((suggestion, index) => (
                      <span
                        key={index}
                        onClick={() => setUserPrompt(prev => prev ? `${prev}, ${suggestion}` : suggestion)}
                        className={styles.suggestionTag2}
                      >
                        {suggestion}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* User Input */}
              <div className={styles.inputContainer2}>
                <label className={styles.inputLabel2}>
                  What would you like to highlight in your listing?
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g., Recently renovated kitchen, walking distance to beach, quiet neighborhood, great for families..."
                  className={styles.textarea2}
                  rows={4}
                />
                {error && (
                  <div className={styles.errorMessage2}>
                    <AlertCircle className={styles.icon2} />
                    {error}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generateContent}
                disabled={isGenerating || !userPrompt.trim()}
                className={styles.generateButton2}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className={`${styles.icon2} ${styles.iconSpin2}`} />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className={styles.icon2} />
                    Generate Content
                  </>
                )}
              </button>

              {/* Generated Content */}
              {generatedContent && (
                <div className={styles.generatedContentContainer2}>
                  {/* Title */}
                  <div className={styles.contentBlock2}>
                    <div className={styles.contentBlockHeader2}>
                      <h3 className={styles.contentBlockTitle2}>Generated Title:</h3>
                      <button
                        onClick={() => copyToClipboard(generatedContent.title, 'title')}
                        className={styles.copyButton2}
                      >
                        {copiedTitle ? <Check className={styles.icon2} /> : <Copy className={styles.icon2} />}
                        {copiedTitle ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className={`${styles.contentText2} ${styles.titleText2}`}>{generatedContent.title}</p>
                    <div className={styles.characterCount2}>
                      {generatedContent.title.length} characters
                    </div>
                  </div>

                  {/* Description */}
                  <div className={styles.contentBlock2}>
                    <div className={styles.contentBlockHeader2}>
                      <h3 className={styles.contentBlockTitle2}>Generated Description:</h3>
                      <button
                        onClick={() => copyToClipboard(generatedContent.description, 'desc')}
                        className={styles.copyButton2}
                      >
                        {copiedDesc ? <Check className={styles.icon2} /> : <Copy className={styles.icon2} />}
                        {copiedDesc ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className={styles.contentText2}>{generatedContent.description}</p>
                    <div className={styles.characterCount2}>
                      {generatedContent.description.length} characters
                    </div>
                  </div>

                  {/* SEO Keywords */}
                  {generatedContent.keywords && generatedContent.keywords.length > 0 && (
                    <div className={styles.keywordsContainer2}>
                      <h3 className={styles.keywordsTitle2}>SEO Keywords:</h3>
                      <div className={styles.keywordsGrid2}>
                        {generatedContent.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className={styles.keywordTag2}
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Apply Button */}
                  <div className={styles.actionButtonsContainer2}>
                    <button
                      onClick={applyGeneratedContent}
                      className={styles.applyButton2}
                    >
                      {onContentApplied ? 'Apply & Continue' : 'Apply to Listing'}
                    </button>
                    <button
                      onClick={() => setGeneratedContent(null)}
                      className={styles.generateNewButton2}
                    >
                      Generate New
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SEOContentGenerator;