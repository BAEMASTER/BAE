'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebaseClient';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';

const NAV_H = 72;

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) router.replace('/');
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

            await setDoc(
                doc(db, 'users', user.uid),
                {
                    displayName: user.displayName,
                    email: user.email,
                    lastLogin: new Date().toISOString(),
                },
                { merge: true }
            );

            router.push('/');
        } catch (e: any) {
            setError(e.message || 'Sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-fuchsia-100 to-indigo-100 text-fuchsia-800">
            
            {/* Glow blobs (match homepage) */}
            <div className="pointer-events-none absolute -top-40 -left-40 w-[40rem] h-[40rem] bg-fuchsia-300/20 blur-[120px] rounded-full" />
            <div className="pointer-events-none absolute bottom-0 right-0 w-[35rem] h-[35rem] bg-indigo-300/20 blur-[120px] rounded-full" />

            {/* Layout spacing under fixed header */}
            <section
                className="flex flex-col items-center justify-center px-6"
                style={{ paddingTop: NAV_H + 48 }}
            >
                {/* Glass card */}
                <div className="max-w-md w-full p-10 bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/40 text-center">

                    <h1 className="text-4xl font-extrabold text-fuchsia-700 mb-3">
                        Welcome to BAE 🤝
                    </h1>

                    <p className="text-lg text-fuchsia-900/80 mb-8 font-medium">
                        Sign in to start matching with people who love what you love.
                    </p>

                    {error && (
                        <p className="text-red-500 mb-4 border border-red-300 bg-red-50 p-2 rounded-lg text-sm">
                            {error}
                        </p>
                    )}

                    {/* CTA BUTTON — identical to homepage CTA */}
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="relative w-full py-5 rounded-full text-xl font-extrabold text-white
                                   bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500
                                   shadow-[0_15px_40px_rgba(236,72,153,0.35)]
                                   hover:shadow-[0_20px_60px_rgba(236,72,153,0.55)]
                                   transition-all duration-500 overflow-hidden disabled:opacity-60"
                    >
                        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.5),transparent)]
                                         bg-[length:200%_100%] opacity-0 hover:opacity-100 animate-[shimmer_3.8s_linear_infinite]" />

                        <motion.div
                            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r 
                                       from-pink-400/35 via-fuchsia-400/35 to-indigo-400/35 blur-2xl"
                            animate={{ opacity: [0.45, 0.8, 0.45], scale: [1, 1.05, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />

                        <span className="relative z-10">{loading ? 'Connecting...' : 'Continue with Google'}</span>
                    </motion.button>
                </div>
            </section>
        </main>
    );
}
