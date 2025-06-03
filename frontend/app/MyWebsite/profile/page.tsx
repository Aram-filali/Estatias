'use client';
import { useEffect, useState } from 'react';
import ProfileTab from 'src/components/MyWebsite/profileTab';
import { useDashboardContext } from 'src/context/DashboardContext';
import LoadingSpinner from 'src/components/MyWebsite/loadingSpinner';

export default function ProfilePage() {
    const { hostData, handleSaveProfile, handleDeleteAccount } = useDashboardContext();
    const [isLoading, setIsLoading] = useState(true);

    // Trigger a loading state if hostData is still being fetched
    useEffect(() => {
        if (hostData === null) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    }, [hostData]);

    // Display loading spinner while hostData is loading or null
    if (isLoading || !hostData) {
        return <LoadingSpinner message="Loading your profile..." />;
    }

    return (
        <ProfileTab 
            hostData={hostData} 
            onSave={handleSaveProfile}
            onDeleteAccount={handleDeleteAccount}
        />
    );
}
