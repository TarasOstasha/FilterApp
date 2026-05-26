import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home/Home';
import './styles/App.scss';
import CsvImportExport from './pages/Home/CsvImportExport/CsvImportExport';
import Login from './pages/Login/Login';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import RootRedirect from './components/RootRedirect/RootRedirect';
import { PRODUCTS_PATH } from './constants/routes';


const App: React.FC = () => {

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path={PRODUCTS_PATH} element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <CsvImportExport />
              </ProtectedRoute>
            }
          />
          {/* <Route path="/admin" element={<CsvImportExport />} /> */}
        </Routes>
      </Router>
      {/* <Home /> */}
    </div>
  );
};

export default App;
