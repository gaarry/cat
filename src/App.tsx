import { usePetStore } from './store/usePetStore';
import { OnboardingPage } from './pages/OnboardingPage';
import { ChatPage } from './pages/ChatPage';

function App() {
  const isOnboarded = usePetStore((s) => s.isOnboarded);

  return (
    <div className="min-h-screen">
      {isOnboarded ? <ChatPage /> : <OnboardingPage />}
    </div>
  );
}

export default App;
