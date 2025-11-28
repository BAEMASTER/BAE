'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User, getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Sparkles, XCircle, CheckCircle, Info, Heart, Plus } from 'lucide-react';

// --- CONSTANTS ---
const MAIN_INSTRUCTION_COPY = "Add 3+ interests to unlock your BAE matches. Every passion counts!";
const MOTIVATION_COPY = "The interest list is the heart of BAE—it fuels your connection potential. 💖";
const APP_NAME_FALLBACK = "SO-INTERESTING";

// --- Custom Toast Component (Replaces Forbidden Alerts) ---
interface ToastProps {
    message: string;
    type: 'error' | 'success' | 'info';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const colorClasses = {
        error: 'bg-red-500 border-red-300 text-white',
        success: 'bg-green-500 border-green-300 text-white',
        info: 'bg-blue-500 border-blue-300 text-white',
    };
    const Icon = type === 'error' ? XCircle : type === 'success' ? CheckCircle : Info;

    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl font-semibold flex items-center gap-3 border ${colorClasses[type]}`}
        >
            <Icon size={20} />
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
                &times;
            </button>
        </motion.div>
    );
};

// Simple navigation replacement
const useSimpleRouter = () => {
    const push = (path: string) => {
        window.history.pushState({}, '', path);
        window.location.reload(); 
    };
    return { push };
};

export default function ProfilePage() {
    // --- State for Firebase Instances ---
    const [authReady, setAuthReady] = useState(false);
    const [firebaseApp, setFirebaseApp] = useState<any>(null);
    const [db, setDb] = useState<any>(null);
    const [auth, setAuth] = useState<any>(null);

    // --- State for Application Data ---
    const [user, setUserState] = useState<User | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [interests, setInterestsState] = useState<string[]>([]);
    const [newInterest, setNewInterest] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [minInterestWarning, setMinInterestWarning] = useState(false);
    const [toastMessage, setToastMessage] = useState<{message: string, type: 'error' | 'success' | 'info'} | null>(null);

    const router = useSimpleRouter();

    // --- Firebase Initialization and Auth Listener ---
    useEffect(() => {
        const initFirebase = async () => {
            let appInstance;

            try {
                // Initialize using Vercel Environment Variable (as requested)
                const config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || "{}");
                if (Object.keys(config).length === 0) {
                    console.error("FIREBASE CONFIGURATION MISSING OR EMPTY.");
                    setAuthReady(true);
                    return;
                }

                if (!getApps().length) {
                    appInstance = initializeApp(config);
                } else {
                    appInstance = getApps()[0];
                }

                const firebaseAuth = getAuth(appInstance);
                const firestore = getFirestore(appInstance);

                setFirebaseApp(appInstance);
                setAuth(firebaseAuth);
                setDb(firestore);

                // Anonymous sign-in fallback if needed (ensures we have a UID)
                if (!firebaseAuth.currentUser) {
                    await signInAnonymously(firebaseAuth);
                }

                // Auth listener + load profile
                const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
                    setUserState(u);
                    if (!u) {
                        setAuthReady(true);
                        return;
                    }

                    const appName = appInstance.name || APP_NAME_FALLBACK;
                    const profileRef = doc(firestore, `artifacts/${appName}/users/${u.uid}/profile/data`);

                    try {
                        const snap = await getDoc(profileRef);
                        const data = snap.exists() ? snap.data() : null;

                        if (data) {
                            setDisplayName(data.displayName || u.displayName || u.email || 'Mystery BAE');
                            setInterestsState(data.interests || []);
                        } else {
                            setDisplayName(u.displayName || u.email || 'Mystery BAE');
                        }
                    } catch (e) {
                        console.error("Profile load failed", e);
                    } finally {
                        setAuthReady(true);
                    }
                });

                return () => unsub();

            } catch (e) {
                console.error("Firebase Initialization Failed", e);
                setAuthReady(true);
            }
        };

        initFirebase();
    }, []);

    const addInterest = () => {
        const i = newInterest.trim();
        if (i && !interests.includes(i)) {
            setInterestsState((prev) => [...prev, i.charAt(0).toUpperCase() + i.slice(1).toLowerCase()]); // Capitalize first letter
        }
        setNewInterest('');
    };

    const removeInterest = (i: string) => {
        setInterestsState((prev) => prev.filter((x) => x !== i));
    };

    const saveProfile = async () => {
        if (!user || !authReady || !db || !firebaseApp) return;

        if (interests.length < 3) {
            setMinInterestWarning(true);
            setTimeout(() => setMinInterestWarning(false), 2000);
            return;
        }

        setSaving(true);
        const appName = firebaseApp.name || APP_NAME_FALLBACK;
        const profileRef = doc(db, `artifacts/${appName}/users/${user.uid}/profile/data`);

        try {
            await setDoc(profileRef, {
                displayName,
                interests,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setSaved(true);
            setToastMessage({ message: "Interests saved successfully!", type: 'success' });
            setTimeout(() => setSaved(false), 1500);

        } catch (e) {
            console.error("Interest save failed", e);
            setToastMessage({ message: "Save failed. Check console for details.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const navigateMatch = useCallback(() => {
        if (interests.length < 3) {
            setMinInterestWarning(true);
            setTimeout(() => setMinInterestWarning(false), 2000);
            return;
        }
        router.push('/match/page');
    }, [interests.length, router]);
    
    // Component Loading State
    if (!authReady) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-red-100 flex items-center justify-center text-pink-500">
                <p className="text-xl animate-pulse font-black">Initializing BAE...</p>
            </div>
        );
    }

    const canBae = interests.length >= 3;
    const gradientText = "bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600";
    const minRequired = 3;
    const requiredRemaining = minRequired - interests.length;

    return (
        <main className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 px-4 sm:px-6 py-8 text-gray-800 flex flex-col items-center">

            {/* Minimal Header for Identity */}
            <header className="w-full max-w-4xl mb-4 py-2 border-b border-pink-200">
                <p className="text-sm text-gray-600 font-semibold">
                    Profile for: <span className="font-extrabold text-purple-700">{displayName}</span>
                </p>
                <p className="text-xs text-gray-400 truncate break-all">
                    UID: {user?.uid || "N/A"}
                </p>
            </header>

            {/* Interest Hub - Now the ONLY HUGE Focus */}
            <div className="w-full max-w-4xl bg-white/95 backdrop-blur-lg p-6 sm:p-10 rounded-3xl shadow-2xl border-2 border-pink-400/50 flex flex-col min-h-[70vh]">

                <div className="mb-8 pb-4 border-b border-pink-200">
                    <h1 className={`text-5xl sm:text-6xl font-black ${gradientText} text-center`}>
                        <Heart size={40} className="inline-block align-top mr-2"/>
                        <span className="leading-tight">Your BAE Passions</span>
                    </h1>
                    <p className="text-gray-600 text-lg mt-3 text-center font-medium">{MAIN_INSTRUCTION_COPY}</p>
                    <p className="text-gray-400 text-sm mt-1 text-center">{MOTIVATION_COPY}</p>
                </div>

                {/* Input Area */}
                <div className="flex gap-3 my-4">
                    <input
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addInterest()}
                        placeholder="Type a fun interest (e.g., Cat Videos, Retro Gaming)..."
                        className="flex-1 px-5 py-4 rounded-full bg-pink-50 ring-2 ring-pink-300 placeholder-gray-400 text-base focus:outline-none focus:ring-purple-500 shadow-inner transition"
                        maxLength={30}
                    />
                    <motion.button
                        onClick={addInterest}
                        whileHover={{scale:1.05}}
                        whileTap={{scale:0.95}}
                        disabled={!newInterest.trim()}
                        className="px-6 py-4 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full font-extrabold text-base shadow-lg hover:shadow-xl hover:brightness-110 transition disabled:opacity-50"
                    >
                        <Plus size={18} className="inline-block align-text-bottom mr-1"/> Add
                    </motion.button>
                </div>

                {/* Selected interest pills */}
                <div className="flex-grow overflow-y-auto mb-6 pr-1 space-y-3 pt-4">
                    <h3 className="text-xl font-extrabold text-purple-700 flex items-center gap-2 mt-2 border-b border-pink-100 pb-2">
                        <Sparkles size={20} className="text-yellow-500"/> Your Love List ({interests.length}/{minRequired})
                    </h3>
                    <AnimatePresence>
                        <div className="flex flex-wrap gap-4 p-2">
                            {interests.map((i) => (
                                <motion.span
                                    key={i}
                                    initial={{opacity:0, scale:0.8}}
                                    animate={{opacity:1, scale:1}}
                                    exit={{opacity:0, scale:0.8}}
                                    className="px-5 py-2 rounded-full bg-pink-200 border border-purple-400/50 text-base font-bold shadow-md flex items-center gap-3 text-purple-800 whitespace-nowrap hover:shadow-lg transition"
                                >
                                    {i}
                                    <button onClick={() => removeInterest(i)} className="text-purple-600 hover:text-red-600 transition leading-none font-black text-xl">×</button>
                                </motion.span>
                            ))}
                        </div>
                    </AnimatePresence>
                </div>

                {/* Min interest warning */}
                <AnimatePresence>
                    {minInterestWarning && (
                        <motion.div
                            initial={{opacity:0,y:-6}}
                            animate={{opacity:1,y:0}}
                            exit={{opacity:0,y:-6}}
                            className="bg-red-100 border-2 border-red-500 text-red-700 font-extrabold py-3 px-4 rounded-xl text-center mb-4 shadow-xl"
                        >
                            <XCircle size={18} className="inline mr-2"/> C'mon, give us at least 3 things to BAE with!
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom buttons - Prominent and Fun */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-pink-100">
                    <motion.button
                        onClick={saveProfile}
                        disabled={saving}
                        whileTap={{scale:0.97}}
                        className={`w-full py-4 rounded-2xl font-extrabold text-base shadow-lg transition-all border
                            ${saved
                                ? 'bg-green-500 text-white border-green-700 hover:bg-green-600'
                                : 'bg-white text-gray-700 border-pink-300 hover:bg-pink-50'
                            }
                            ${saving ? 'opacity-60 cursor-not-allowed' : ''}
                        `}
                    >
                        <Save size={18} className="mr-2 inline-block align-text-bottom"/>
                        {saving ? 'Saving Your BAE Profile…' : 'Save Your List'}
                    </motion.button>

                    <motion.button
                        onClick={navigateMatch}
                        whileHover={{ scale:1.02 }}
                        whileTap={{ scale:0.98 }}
                        disabled={!canBae}
                        className="w-full py-4 rounded-2xl font-black text-white text-lg shadow-2xl transition-all bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-700 hover:shadow-pink-500/70 disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed"
                    >
                        <Sparkles size={20} className="mr-2 inline-block align-text-bottom"/>
                        {canBae ? 'GO BAE NOW!' : `Need ${requiredRemaining} More Passions!`}
                    </motion.button>
                </div>
            </div>
            
            <AnimatePresence>
                {toastMessage && <Toast message={toastMessage.message} type={toastMessage.type} onClose={() => setToastMessage(null)} />}
            </AnimatePresence>
        </main>
    );
}