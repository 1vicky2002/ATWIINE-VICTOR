import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Page = 'home' | 'polls' | 'admin' | 'profile' | 'about';

interface NavigationContextType {
  currentPage: Page;
  selectedPollSlug: string | null;
  selectedPollTitle: string | null;
  selectedCandidateId: string | null;
  selectedCandidateName: string | null;
  navigateTo: (page: Page, pollSlug?: string | null, pollTitle?: string | null, candidateId?: string | null, candidateName?: string | null) => void;
  updatePollTitle: (title: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [selectedPollSlug, setSelectedPollSlug] = useState<string | null>(null);
  const [selectedPollTitle, setSelectedPollTitle] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string | null>(null);

  const updatePollTitle = (title: string) => {
    setSelectedPollTitle(title);
  };

  // Sync state with URL on initial load and handle clean paths
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    
    let pageParam = params.get('page') as Page;
    let pollParam = params.get('poll');
    const candidateParam = params.get('candidate');
    const nameParam = params.get('name');

    // Clean URL Handling
    if (path.startsWith('/poll/')) {
      pageParam = 'home';
      pollParam = path.split('/')[2];
    } else if (path === '/about') {
      pageParam = 'about';
    } else if (path === '/profile') {
      pageParam = 'profile';
    } else if (path === '/admin') {
      pageParam = 'admin';
    }

    if (pageParam && ['home', 'polls', 'admin', 'profile', 'about'].includes(pageParam)) {
      setCurrentPage(pageParam);
    }
    if (pollParam) {
      setSelectedPollSlug(pollParam);
    }
    if (candidateParam) {
      setSelectedCandidateId(candidateParam);
    }
    if (nameParam) {
      setSelectedCandidateName(nameParam);
    }

    // Handle back/forward buttons
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const curPath = window.location.pathname;
      
      let pg: Page = (p.get('page') as Page) || 'home';
      let slg = p.get('poll');

      if (curPath.startsWith('/poll/')) {
        pg = 'home';
        slg = curPath.split('/')[2];
      } else if (curPath === '/about') {
        pg = 'about';
      } else if (curPath === '/profile') {
        pg = 'profile';
      } else if (curPath === '/admin') {
        pg = 'admin';
      }

      setCurrentPage(pg);
      setSelectedPollSlug(slg);
      setSelectedCandidateId(p.get('candidate'));
      setSelectedCandidateName(p.get('name'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: Page, pollSlug: string | null = null, pollTitle: string | null = null, candidateId: string | null = null, candidateName: string | null = null) => {
    setCurrentPage(page);
    setSelectedPollSlug(pollSlug);
    setSelectedPollTitle(pollTitle);
    setSelectedCandidateId(candidateId);
    setSelectedCandidateName(candidateName);
    
    let path = '/';
    const params = new URLSearchParams();

    if (page === 'home' && pollSlug) {
      path = `/poll/${pollSlug}`;
    } else if (page !== 'home') {
      path = `/${page}`;
    }

    if (candidateId) {
      params.set('candidate', candidateId);
    }
    if (candidateName) {
      params.set('name', candidateName.toLowerCase().replace(/\s+/g, '-'));
    }

    const finalUrl = path + (params.toString() ? `?${params.toString()}` : '');
    window.history.pushState({}, '', finalUrl);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <NavigationContext.Provider value={{ currentPage, selectedPollSlug, selectedPollTitle, selectedCandidateId, selectedCandidateName, navigateTo, updatePollTitle }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
