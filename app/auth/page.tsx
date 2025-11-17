'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, setDoc } from 'firebase/firestore';

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Check if user is already signed in
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // User is signed in, redirect them to the home page or match page
                router.replace('/'); 
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // NOTE: The homepage uses a 'users' collection directly, not nested under 'artifacts/SO-INTERESTING/users'
            // To ensure consistency, I'm updating the path here to match the one inferred from HomePage.tsx:
            // const snap = await getDoc(doc(db, 'users', user.uid));
            
            const userRef = doc(db, 'users', user.uid); // Updated to match likely homepage logic
            
            const userData = {
                displayName: user.displayName,
                email: user.email,
                lastLogin: new Date().toISOString(),
            };
            
            // Use setDoc with merge: true to avoid overwriting existing data if they sign in again
            await setDoc(userRef, userData, { merge: true });
            
            console.log("User signed in and profile updated:", user.uid);
            
            // Redirect to the match/home page after successful sign-in
            router.push('/');

        } catch (error: any) {
            console.error('Google Sign-In Error:', error);
            setError(error.message || 'Sign-in failed. Check your network or Firebase configuration.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main 
            // Matches homepage background gradient perfectly
            className="min-h-screen flex flex-col items-center justify-center p-6 
            bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100"
        >
            <div className="max-w-md w-full p-8 bg-white/70 backdrop-blur-md rounded-xl shadow-2xl text-center">
                
                <h1 className="text-4xl font-extrabold text-fuchsia-700 mb-3">
                    Welcome to BAE 🤝
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Sign in to start matching with people who love what you love.
                </p>

                {error && (
                    <p className="text-red-500 mb-4 border border-red-300 bg-red-50 p-2 rounded-lg text-sm">
                        {error}
                    </p>
                )}

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    // *******************************************************************
                    // UPDATED BUTTON STYLES TO MATCH HOMEPAGE CTA
                    // Uses: from-pink-500 via-fuchsia-500 to-indigo-500 and the exact shadow
                    // *******************************************************************
                    className={`
                        w-full py-5 px-6 rounded-full text-white font-extrabold text-xl 
                        transition-all duration-300 
                        ${loading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 shadow-[0_15px_40px_rgba(236,72,153,0.35)] hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]'
                        }
                    `}
                >
                    {loading ? 'Connecting...' : 'Continue with Google'}
                </button>
            </div>
        </main>
    );
}