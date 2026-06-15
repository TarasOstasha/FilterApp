import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home/Home';
import './styles/App.scss';
import CsvImportExport from './pages/Home/CsvImportExport/CsvImportExport';
import Login from './pages/Login/Login';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import FilterPageLayout from './components/ExternalChrome/FilterPageLayout';


const App: React.FC = () => {

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <CsvImportExport />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <FilterPageLayout>
                <Home />
              </FilterPageLayout>
            }
          />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
