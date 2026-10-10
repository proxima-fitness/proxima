"use client";
import { createContext, ReactNode, useContext, useState } from 'react';

// Create the UserContext with an initial value of null
export const ProfilePictureContext = createContext<IProfilePictureContextValue | null>(null);

// Create a custom hook to consume the UserContext value
export const useProfilePictureContext = () => {
	const context = useContext(ProfilePictureContext);
	if (!context) {
		throw new Error('useProfilePictureContext must be used within a ProfilePictureProvider');
	}
	return context;
};

// Create a provider component for the UserContext
export const ProfilePictureProvider: React.FC<{ children: ReactNode }> = ({children}) => {
	// State to hold the user value
	const [profilePicture, setProfilePicture] = useState<Blob | null>(null);

	// Function to update the user value
	const updateProfilePicture = (newPicture: Blob | null) => {
		setProfilePicture(newPicture);
	};

    return (
        <ProfilePictureContext.Provider value={ { profilePicture, setProfilePicture: updateProfilePicture } }>
            {children}
        </ProfilePictureContext.Provider>
	);
};
