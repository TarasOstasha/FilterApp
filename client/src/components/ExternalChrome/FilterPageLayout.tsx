import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ExternalHeader from './ExternalHeader';
import ExternalFooter from './ExternalFooter';
import VolusionStylesLoader from './VolusionStylesLoader';
import './ExternalChrome.scss';

interface FilterPageLayoutProps {
  children: React.ReactNode;
}

const FilterPageLayout: React.FC<FilterPageLayoutProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const catId = searchParams.get('catId');
  const showSiteChrome = !catId;

  return (
    <>
      {showSiteChrome && <VolusionStylesLoader />}
      {showSiteChrome && <ExternalHeader />}
      <div className="filter-app-root">{children}</div>
      {showSiteChrome && <ExternalFooter />}
    </>
  );
};

export default FilterPageLayout;
