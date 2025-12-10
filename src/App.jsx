import React, { useState, useEffect } from 'react';
import { ChemistryApp } from './ChemistryApp';
import { BiologyApp } from './BiologyApp';
import { CosmosApp } from './CosmosApp';
import { PhysicsApp } from './PhysicsApp';
import { QuizApp } from './QuizApp';
import './App.css';

import { AIChatbot } from './components/AIChatbot';
import { UserProvider } from './context/UserContext';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const [mode, setMode] = useState('menu');
  /* console.log("Current Mode:", mode); */


  let content;
  if (mode === 'chemistry') {
    content = <ChemistryApp onBack={() => setMode('menu')} />;
  } else if (mode === 'biology') {
    content = <BiologyApp onBack={() => setMode('menu')} />;
  } else if (mode === 'cosmos') {
    content = <CosmosApp onBack={() => setMode('menu')} />;
  } else if (mode === 'physics') {
    content = <PhysicsApp onBack={() => setMode('menu')} />;
  } else if (mode === 'quiz') {
    content = <QuizApp onBack={() => setMode('menu')} />;
  } else {
    // Replace old Menu with new Dashboard
    content = <Dashboard setMode={setMode} />;
  }

  return (
    <>
      {content}
      <AIChatbot mode={mode} />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ErrorBoundary>
  );
}

export default App;
