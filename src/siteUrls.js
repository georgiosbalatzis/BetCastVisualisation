const aggregated = process.env.REACT_APP_F1STORIES_BUILD === 'true';
export const siteUrl = (pathname) => `${aggregated ? '' : 'https://f1-stories.gr'}${pathname}`;
export const betcastUrl = aggregated ? '/betcast/' : 'https://georgiosbalatzis.github.io/BetCastVisualisation/';
