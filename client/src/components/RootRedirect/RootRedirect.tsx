import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { PRODUCTS_PATH } from '../../constants/routes';

/** Preserves query string when redirecting legacy `/` URLs to `/products`. */
const RootRedirect: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={`${PRODUCTS_PATH}${search}`} replace />;
};

export default RootRedirect;
