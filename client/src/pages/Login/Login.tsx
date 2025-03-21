// src/pages/Login/Login.tsx
import { Formik, Form, Field, ErrorMessage } from 'formik';
import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Login.module.scss';
import { LOGIN_USER_VALIDATION_SCHEMA } from '../../utils/validatedSchemas';
import { loginUser } from '../../api';


const Login: React.FC = () => {
    const navigate = useNavigate();

    // Correct handleSubmit that works with Formik
    const handleSubmit = async (values: { username: string; password: string }) => {
        try {
            // const response = await axios.post('http://localhost:5000/api/admin/login', values);
            // localStorage.setItem('authToken', response.data.token);
            // toast.success('Login successful!');
            // navigate('/admin');

            const response = await loginUser(values);
            if (response) {
                
                localStorage.setItem('authToken', response.data.token);
                toast.success('Login successful!');
           
                navigate('/admin');
            }

        } catch (error) {
            //toast.error('Invalid credentials');
            
        }
    };

    return (
        <div className={styles['login-form']}>
            <h2>Admin Login</h2>
            <Formik
                initialValues={{ username: '', password: '' }}
                validationSchema={LOGIN_USER_VALIDATION_SCHEMA}
                onSubmit={handleSubmit}
            >
                <Form>
                    <div>
                        {/* <label>Username:</label> */}
                        <Field placeholder="Username" type="text" name="username" />
                        <ErrorMessage name="username" component="div" className={styles['error-message']} />
                    </div>
                    <div>
                        {/* <label>Password:</label> */}
                        <Field placeholder="Password" type="password" name="password" />
                        <ErrorMessage name="password" component="div" className={styles['error-message']} />
                    </div>
                    <button type="submit">Login</button>
                </Form>
            </Formik>
        </div>
    );
};

export default Login;
