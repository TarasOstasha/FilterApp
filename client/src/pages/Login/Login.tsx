// src/pages/Login/Login.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Login.module.scss';


const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/admin/login', { username, password });
            // Save token to localStorage
            localStorage.setItem('authToken', response.data.token);
            toast.success('Login successful!');
            // Redirect to admin page
            navigate('/admin');
        } catch (error) {
            toast.error('Invalid credentials');
        }
    };

    return (
        <div className={styles['login-form']}>
            <h2>Admin Login</h2>
            <form onSubmit={handleSubmit}>
                <div className={styles['form-group']}>
                    <label>Username:</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className={styles['form-group']}>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className={styles['login-button']}>
                    Login
                </button>
            </form>
        </div>
    );
};

export default Login;
