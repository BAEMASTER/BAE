import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

/**
 * Calculate if user is 18+ based on birthdate
 */
export const isAdult = (dob: Date | string): boolean => {
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= 18;
};

/**
 * Hook that enforces age gating across the app
 * - Checks user's DOB from Firestore
 * - Redirects to Profile if underage
 * - Returns loading state and whether user is adult
 */
export const useAgeGate = (user: any) => {
  const router = useRouter();
  const [isAdultUser, setIsAdultUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkAge = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          setLoading(false);
          return;
        }

        const userDOB = userDoc.data().birthDate;

        if (!userDOB) {
          // No DOB set - redirect to Profile to complete it
          console.log('No birthdate found, redirecting to profile');
          router.push('/profile');
          setLoading(false);
          return;
        }

        const adult = isAdult(userDOB);
        setIsAdultUser(adult);

        if (!adult) {
          // Underage - redirect to Profile with lock message
          console.log('User is underage, locking app');
          router.push('/profile?locked=true&reason=age');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Age check error:', error);
        setLoading(false);
      }
    };

    checkAge();
  }, [user, router]);

  return {
    isAdult: isAdultUser,
    loading,
    isLocked: !isAdultUser && !loading, // User is locked out
  };
};