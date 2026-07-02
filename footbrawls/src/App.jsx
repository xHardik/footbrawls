
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './lib/user';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Guild from './pages/Guild';
import WhoAreYa from './pages/games/whoareya';
import Wordle from './pages/games/wordle';
import Layout from './components/Layout';
import TransferTrail from './pages/games/transfertrail';
import HigherOrLower from './pages/games/higherlower';
import MatchPredictor from './pages/games/matchpredictor';
import PenaltyNerve from './pages/games/penaltynerve';
import DribbleGauntlet from './pages/games/dribble';
import DailyTrivia from './pages/games/dailytrivia';
import Top10Guess from './pages/games/top10';
import Raid from './pages/Raid';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ContactUs from './pages/ContactUs';
import Ranks from './pages/Ranks';
import VsFriends from './pages/VsFriends';
import Profile from './pages/Profile';
import VastPlayer from './components/VastPlayer';

function RequireUser({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <VastPlayer />
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<RequireUser><Home /></RequireUser>} />
          <Route path="/guild" element={<RequireUser><Guild /></RequireUser>} />
          <Route path="/raid" element={<RequireUser><Raid /></RequireUser>} />
          <Route path="/vs-friends" element={<RequireUser><VsFriends /></RequireUser>} />
          <Route path="/ranks" element={<RequireUser><Layout><Ranks /></Layout></RequireUser>} />
          <Route path="/profile" element={<RequireUser><Profile /></RequireUser>} />
          <Route path="/games/whoareya" element={<RequireUser><Layout hideMobileNav><WhoAreYa /></Layout></RequireUser>} />
          <Route path="/games/wordle" element={<RequireUser><Layout hideMobileNav><Wordle /></Layout></RequireUser>} />
          <Route path="/games/transfertrail" element={<RequireUser><Layout><TransferTrail /></Layout></RequireUser>} />
          <Route path="/games/higherlower" element={<RequireUser><Layout hideMobileNav><HigherOrLower /></Layout></RequireUser>} />
          <Route path="/games/matchpredictor" element={<RequireUser><Layout hideMobileNav><MatchPredictor /></Layout></RequireUser>} />
          <Route path="/games/penaltynerve" element={<RequireUser><Layout hideMobileNav><PenaltyNerve /></Layout></RequireUser>} />
          <Route path="/games/dribble" element={<RequireUser><Layout hideMobileNav><DribbleGauntlet /></Layout></RequireUser>} />
          <Route path="/games/dailytrivia" element={<RequireUser><Layout hideMobileNav><DailyTrivia /></Layout></RequireUser>} />
          <Route path="/games/top10" element={<RequireUser><Layout hideMobileNav><Top10Guess /></Layout></RequireUser>} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}