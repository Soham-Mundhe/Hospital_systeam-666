import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { FacilityType, User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (email: string, facilityId: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check local storage for persisted session
        const storedUser = localStorage.getItem('facility_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, facilityId: string): Promise<boolean> => {
        // Determine facility type from ID prefix
        let type: FacilityType | null = null;
        const upperId = facilityId.toUpperCase();

        if (upperId.startsWith('H-')) type = 'hospital';
        else if (upperId.startsWith('C-')) type = 'clinic';
        else if (upperId.startsWith('L-')) type = 'lab';

        if (type) {
            const newUser: User = {
                id: 'U-' + Math.floor(Math.random() * 1000),
                name: email.split('@')[0] || 'User',
                email,
                facilityType: type,
                facilityId: upperId,
            };

            setUser(newUser);
            localStorage.setItem('facility_user', JSON.stringify(newUser));
            return true;
        }

        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('facility_user');
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
