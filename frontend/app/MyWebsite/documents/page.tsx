'use client';
import { useEffect, useState } from 'react';
import DocumentsTab from 'src/components/MyWebsite/documentsTab';
import { useDashboardContext } from 'src/context/DashboardContext';
import LoadingSpinner from 'src/components/MyWebsite/loadingSpinner';

export default function DocumentsPage() {
    const { hostData, handleSaveProfile } = useDashboardContext();
    const [isLoading, setIsLoading] = useState(true);

    // Trigger loading state when hostData is null or being fetched
    useEffect(() => {
        if (hostData === null) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    }, [hostData]);

    // Display loading spinner while hostData is loading or null
    if (isLoading || !hostData) {
        return <LoadingSpinner message="Loading your documents..." />;
    }

    return (
        <DocumentsTab 
            hostData={hostData}
            onUpdateDocuments={handleSaveProfile}
        />
    );
}
