// src/App.jsx
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
import PenaltyNerve from './pages/games/PenaltyNerve';


function RequireUser({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/" element={<RequireUser><Home /></RequireUser>} />
        <Route path="/guild/:code" element={<RequireUser><Guild /></RequireUser>} />
        <Route path="/games/whoareya" element={<RequireUser> <Layout><WhoAreYa /></Layout></RequireUser>} />
        <Route path="/games/wordle" element={<RequireUser> <Layout><Wordle /></Layout></RequireUser>} />
        <Route path="/games/transfertrail" element={<RequireUser> <Layout><TransferTrail /></Layout></RequireUser>} />
       <Route path="/games/higherlower" element={<RequireUser><Layout><HigherOrLower /></Layout></RequireUser>} />
       <Route path="/games/matchpredictor" element={<RequireUser><Layout><MatchPredictor /></Layout></RequireUser>} />
        <Route path="/games/penaltynerve" element={<RequireUser><Layout><PenaltyNerve /></Layout></RequireUser>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}