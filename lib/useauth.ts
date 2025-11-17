"use client";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, provider } from "./firebaseClient";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return {
    user,
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
  };
}
