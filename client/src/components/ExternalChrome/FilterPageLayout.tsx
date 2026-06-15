import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ExternalHeader from './ExternalHeader';
import ExternalFooter from './ExternalFooter';
import VolusionStylesLoader from './VolusionStylesLoader';
import { VolusionChromeProvider } from './VolusionChromeContext';
import './ExternalChrome.scss';

interface FilterPageLayoutProps {
  children: React.ReactNode;
}

const FilterPageLayout: React.FC<FilterPageLayoutProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const catId = searchParams.get('catId');
  const showSiteChrome = !catId;

  if (!showSiteChrome) {
    return <div className="filter-app-root">{children}</div>;
  }

  return (
    <VolusionChromeProvider>
      <VolusionStylesLoader />
      <ExternalHeader />
      <div className="filter-app-root">{children}</div>
      <ExternalFooter />
    </VolusionChromeProvider>
  );
};

export default FilterPageLayout;
