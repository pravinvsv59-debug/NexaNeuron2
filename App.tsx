import React, { useState, useCallback, useEffect } from 'react';
import { Feature } from './types';
import Sidebar from './components/Sidebar';
import Chatbot from './components/Chatbot';
import ImageGenerator from './components/ImageGenerator';
import ImageAnalyzer from './components/ImageAnalyzer';
import VideoGenerator from './components/VideoGenerator';
import VideoAnalyzer from './components/VideoAnalyzer';
import LiveAgent from './components/LiveAgent';
import GroundingSearch from './components/GroundingSearch';
import ComplexTaskSolver from './components/ComplexTaskSolver';
import TextToSpeech from './components/TextToSpeech';
import VideoEditor from './components/VideoEditor';
import Profile from './components/Profile';
import { Bars3Icon, MoonIcon, SunIcon, CoinIcon } from './constants';
import { auth, db, googleProvider } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import LandingPage from './components/LandingPage';
import Logo from './components/Logo';
import Spinner from './components/Spinner';
import PremiumPage from './components/PremiumPage';

type Theme = 'light' | 'dark';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  coins?: number;
  isGuest: boolean;
  isPremium?: boolean;
}

const App: React.FC = () => {
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [activeFeature, setActiveFeature] = useState<Feature>(Feature.CHATBOT);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPremiumPageOpen, setIsPremiumPageOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = window.localStorage.getItem('theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
      }
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark'; // Default to dark
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        localStorage.removeItem('guestProfile');
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        let userData;

        if (userDoc.exists()) {
          userData = userDoc.data();
          const updates: { lastLogin: Date; coins?: number; isPremium?: boolean } = { lastLogin: new Date() };
          if (typeof userData.coins === 'undefined') {
            updates.coins = 100;
          }
          if (typeof userData.isPremium === 'undefined') {
            updates.isPremium = false;
          }
          await updateDoc(userRef, updates);
          userData = (await getDoc(userRef)).data();
        } else {
          userData = {
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            lastLogin: new Date(),
            coins: 100,
            isPremium: false,
          };
          await setDoc(userRef, userData);
        }
        
        setUser({
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            coins: userData?.coins,
            isGuest: false,
            isPremium: userData?.isPremium,
        });

      } else {
        const guestProfileRaw = localStorage.getItem('guestProfile');
        if (guestProfileRaw) {
          setUser(JSON.parse(guestProfileRaw));
        } else {
          const newGuestProfile: UserProfile = {
            uid: 'guest-' + Date.now(),
            displayName: 'Guest',
            email: null,
            photoURL: null,
            coins: 10,
            isGuest: true,
            isPremium: false,
          };
          localStorage.setItem('guestProfile', JSON.stringify(newGuestProfile));
          setUser(newGuestProfile);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };
  
  const handleCoinsUpdate = (newBalance: number) => {
    if (user) {
        const updatedUser = { ...user, coins: newBalance };
        setUser(updatedUser);
        if (user.isGuest) {
            localStorage.setItem('guestProfile', JSON.stringify(updatedUser));
        }
    }
  };

  const handlePremiumUnlocked = async () => {
    if (user) {
        // For real users, isPremium is the only state. For guests, we keep their coins but mark them premium.
        const updatedUser = { ...user, isPremium: true, coins: user.isGuest ? user.coins : undefined }; 
        setUser(updatedUser);
        if (user.isGuest) {
            localStorage.setItem('guestProfile', JSON.stringify(updatedUser));
        } else {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { isPremium: true });
        }
        // Wait a moment for success animation to show before closing the page.
        setTimeout(() => {
          setIsPremiumPageOpen(false);
        }, 2000);
    }
  };

  const handleSelectFeature = useCallback((feature: Feature) => {
    setIsMenuOpen(false);
    setActiveFeature(feature);
  }, []);

  const renderActiveFeature = () => {
    if (!user) return <Spinner />;
    switch (activeFeature) {
      case Feature.CHATBOT:
        return <Chatbot />;
      case Feature.IMAGE_GENERATOR:
        return <ImageGenerator user={user} onUpdateCoins={handleCoinsUpdate} />;
      case Feature.IMAGE_ANALYZER:
        return <ImageAnalyzer />;
      case Feature.VIDEO_GENERATOR:
        return <VideoGenerator user={user} onUpdateCoins={handleCoinsUpdate} />;
      case Feature.VIDEO_ANALYZER:
        return <VideoAnalyzer />;
      case Feature.VIDEO_EDITING:
        return <VideoEditor />;
      case Feature.LIVE_AGENT:
        return <LiveAgent />;
      case Feature.GROUNDING_SEARCH:
        return <GroundingSearch />;
      case Feature.COMPLEX_TASK_SOLVER:
        return <ComplexTaskSolver />;
      case Feature.TEXT_TO_SPEECH:
        return <TextToSpeech />;
      default:
        return <Chatbot />;
    }
  };

  if (!isAppStarted) {
    return <LandingPage onStart={() => setIsAppStarted(true)} />;
  }
  
  if (isPremiumPageOpen && user) {
    return <PremiumPage user={user} onClose={() => setIsPremiumPageOpen(false)} onPremiumUnlocked={handlePremiumUnlocked} />;
  }

  if (!user) {
    return (
        <div className="relative min-h-screen font-sans">
            <div className="premium-background"></div>
            <div className="flex items-center justify-center h-screen">
                <Spinner size="lg" />
            </div>
        </div>
    );
  }

  return (
    <div className="relative min-h-screen font-sans">
       <div className="premium-background"></div>
      <div className="flex flex-col h-screen bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl text-gray-900 dark:text-white">
        <Sidebar 
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          activeFeature={activeFeature} 
          onSelectFeature={handleSelectFeature} 
        />

        <header className="flex-shrink-0 flex items-center justify-between p-4 h-20 border-b border-gray-900/10 dark:border-white/10 bg-transparent z-10">
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-md text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <Logo className="h-8 ml-2" textClassName="text-xl" />
            {user && (
                <button 
                  onClick={() => setIsPremiumPageOpen(true)}
                  className="hidden sm:flex items-center gap-2 bg-black/10 dark:bg-white/10 px-3 py-1.5 rounded-full ml-4 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                  aria-label="View coin balance and premium options"
                >
                    <CoinIcon className="w-6 h-6" />
                    <span className="font-bold text-yellow-500 dark:text-yellow-400 text-lg">
                      {user.isPremium ? 'PREMIUM' : user.coins ?? 0}
                    </span>
                </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-indigo-500" />}
            </button>
            <Profile user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
          </div>
        </header>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-transparent">
          <div className="max-w-4xl mx-auto h-full">
            {renderActiveFeature()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;