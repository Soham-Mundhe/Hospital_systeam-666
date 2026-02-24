import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { FacilityType, User } from '../types';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string, facilityId: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getFacilityType = (facilityId: string): FacilityType | null => {
    const upper = facilityId.toUpperCase();
    if (upper.startsWith('H-')) return 'hospital';
    if (upper.startsWith('C-')) return 'clinic';
    if (upper.startsWith('L-')) return 'lab';
    return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Listen to Firebase auth state; restore facilityId from localStorage
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const storedFacilityId = localStorage.getItem('facility_id') || '';
                const facilityType = getFacilityType(storedFacilityId);

                if (facilityType) {
                    setUser({
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                        email: firebaseUser.email || '',
                        facilityType,
                        facilityId: storedFacilityId.toUpperCase(),
                    });
                } else {
                    // Firebase user exists but no valid facilityId stored — sign out
                    signOut(auth);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (
        email: string,
        password: string,
        facilityId: string
    ): Promise<boolean> => {
        // Validate Facility ID format first
        if (!facilityId.match(/^[HCL]-\d{3,5}$/i)) {
            return false;
        }

        const facilityType = getFacilityType(facilityId);
        if (!facilityType) return false;

        try {
            // Store facilityId BEFORE sign-in so onAuthStateChanged finds it immediately
            localStorage.setItem('facility_id', facilityId.toUpperCase());

            const credential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = credential.user;

            setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || email.split('@')[0] || 'User',
                email: firebaseUser.email || email,
                facilityType,
                facilityId: facilityId.toUpperCase(),
            });

            return true;
        } catch (err) {
            // Clean up if sign-in failed
            localStorage.removeItem('facility_id');
            console.error('Firebase login error:', err);
            return false;
        }
    };

    const logout = () => {
        signOut(auth);
        localStorage.removeItem('facility_id');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
