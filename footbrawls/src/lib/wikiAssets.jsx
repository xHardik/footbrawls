import { useState, useEffect } from 'react';


export function usePlayerWikiPhoto(playerName) {
  const [photoUrl, setPhotoUrl] = useState('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>');

  useEffect(() => {
    if (!playerName) return;

    const cacheKey = `wya_photo_v2_${playerName}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setPhotoUrl(cached);
      return;
    }

    let wikiName = playerName.trim().replace(/\s+/g, '_');
    if (playerName === 'Alisson') wikiName = 'Alisson_(footballer,_born_1992)';
    else if (playerName === 'Marquinhos') wikiName = 'Marquinhos_(footballer,_born_1994)';
    else if (playerName === 'Rodri') wikiName = 'Rodri_(footballer,_born_1996)';
    else if (playerName === 'Gavi') wikiName = 'Gavi_(footballer)';
    else if (playerName === 'Vinicius Jr') wikiName = 'Vinícius_Júnior';
    else if (playerName === 'Ruben Dias') wikiName = 'Rúben_Dias';
    else if (playerName === 'Joao Felix') wikiName = 'João_Félix';

    const formattedName = encodeURIComponent(wikiName);

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${formattedName}`)
      .then((res) => res.json())
      .then((data) => {
        const url = data.thumbnail?.source || data.originalimage?.source;
        if (url) {
          localStorage.setItem(cacheKey, url);
          setPhotoUrl(url);
        }
      })
      .catch(() => {});
  }, [playerName]);

  return photoUrl;
}


export function useClubWikiLogo(clubName) {
  const [logoUrl, setLogoUrl] = useState('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>');

  useEffect(() => {
    if (!clubName) return;

    const cacheKey = `wya_logo_v2_${clubName}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setLogoUrl(cached);
      return;
    }

    
    let wikiQuery = clubName.trim().replace(/\s+/g, '_');
    if (clubName === 'Arsenal') wikiQuery = 'Arsenal_F.C.';
    else if (clubName === 'Real Madrid') wikiQuery = 'Real_Madrid_CF';
    else if (clubName === 'Inter Milan') wikiQuery = 'Inter_Milan';
    else if (clubName === 'Bayern Munich') wikiQuery = 'FC_Bayern_Munich';
    else if (clubName === 'Aston Villa') wikiQuery = 'Aston_Villa_F.C.';
    else if (clubName === 'Man City') wikiQuery = 'Manchester_City_F.C.';
    else if (clubName === 'Man United' || clubName === 'Manchester United') wikiQuery = 'Manchester_United_F.C.';
    else if (clubName === 'Atletico Madrid') wikiQuery = 'Atlético_Madrid';
    else if (clubName === 'Chelsea') wikiQuery = 'Chelsea_F.C.';
    else if (clubName === 'Liverpool') wikiQuery = 'Liverpool_F.C.';
    else if (clubName === 'PSG') wikiQuery = 'Paris_Saint-Germain_F.C.';
    else if (clubName === 'Barcelona') wikiQuery = 'FC_Barcelona';
    else if (clubName === 'Bayer Leverkusen') wikiQuery = 'Bayer_04_Leverkusen';
    else if (clubName === 'AC Milan') wikiQuery = 'A.C._Milan';
    else if (clubName === 'Inter Miami') wikiQuery = 'Inter_Miami_CF';
    else if (clubName === 'Juventus') wikiQuery = 'Juventus_F.C.';
    else if (clubName === 'Tottenham') wikiQuery = 'Tottenham_Hotspur_F.C.';
    else if (clubName === 'Al Nassr') wikiQuery = 'Al_Nassr_FC';
    else if (clubName === 'Roma') wikiQuery = 'A.S._Roma';
    else if (clubName === 'Galatasaray') wikiQuery = 'Galatasaray_S.K._(football)';
    else if (clubName === 'Borussia Dortmund' || clubName === 'Dortmund') wikiQuery = 'Borussia_Dortmund';
    else if (clubName === 'Benfica') wikiQuery = 'S.L._Benfica';
    else if (clubName === 'Sporting CP') wikiQuery = 'Sporting_CP';
    else if (clubName === 'Monaco') wikiQuery = 'AS_Monaco_FC';
    else if (clubName === 'Napoli') wikiQuery = 'S.S.C._Napoli';
    else if (clubName === 'Ajax') wikiQuery = 'AFC_Ajax';
    else if (clubName === 'Marseille') wikiQuery = 'Olympique_de_Marseille';
    else if (clubName === 'Lyon') wikiQuery = 'Olympique_Lyonnais';
    else if (clubName === 'Everton') wikiQuery = 'Everton_F.C.';
    else if (clubName === 'Udinese') wikiQuery = 'Udinese_Calcio';
    else if (clubName === 'PSV') wikiQuery = 'PSV_Eindhoven';
    else if (clubName === 'Lille') wikiQuery = 'Lille_OSC';
    else if (clubName === 'Gent') wikiQuery = 'K.A.A._Gent';
    else if (!wikiQuery.includes('_')) wikiQuery += '_F.C.';


    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        const url = data.thumbnail?.source || data.originalimage?.source;
        if (url) {
          localStorage.setItem(cacheKey, url);
          setLogoUrl(url);
        }
      })
      .catch(() => {});
  }, [clubName]);

  return logoUrl;
}


export function PlayerPhoto({ name, size = 26, style = {} }) {
  const photo = usePlayerWikiPhoto(name);
  return (
    <img 
      src={photo} 
      alt={name} 
      style={{ 
        width: size, 
        height: size, 
        borderRadius: '50%', 
        objectFit: 'cover',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.03)',
        ...style
      }} 
    />
  );
}


export function ClubLogo({ club, size = 26, style = {} }) {
  const logo = useClubWikiLogo(club);
  return (
    <img 
      src={logo} 
      alt={club} 
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        background: 'transparent',
        ...style
      }} 
    />
  );
}


export function useNationalTeamWikiLogo(teamName) {
  const [logoUrl, setLogoUrl] = useState('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>');

  useEffect(() => {
    if (!teamName) return;

    const cacheKey = `wya_team_logo_${teamName}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      setLogoUrl(cached);
      return;
    }

    const wikiQuery = `${teamName.trim().replace(/\s+/g, '_')}_national_football_team`;

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        const url = data.thumbnail?.source || data.originalimage?.source;
        if (url) {
          localStorage.setItem(cacheKey, url);
          setLogoUrl(url);
        }
      })
      .catch(() => {});
  }, [teamName]);

  return logoUrl;
}


export function NationalTeamLogo({ teamName, size = 26, style = {} }) {
  const logo = useNationalTeamWikiLogo(teamName);
  return (
    <img 
      src={logo} 
      alt={teamName} 
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
        background: 'transparent',
        ...style
      }} 
    />
  );
}
