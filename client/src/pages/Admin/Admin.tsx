// src/pages/Admin/Admin.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Admin.module.scss';
import logo from './Logo-Master.png';

const Admin: React.FC = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/login');
    };

    return (
        <div className={styles['admin-wrapper']}>
            <div>
                <img src={logo} alt="xyzdsplays" />
            </div>
            <div className={styles['admin-panel']}>
                {/* <h2>Admin Panel</h2> */}
                <button onClick={handleLogout} className={styles['logout-button']}>
                    Logout
                </button>
      
            </div>
        </div>
    );
};

export default Admin;
