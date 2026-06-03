// src/pages/Login/Login.tsx
import { Formik, Form, Field, ErrorMessage } from 'formik';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './Login.module.scss';
import {
    LOGIN_USER_VALIDATION_SCHEMA,
    LOGIN_CHANGE_PASSWORD_VALIDATION_SCHEMA,
} from '../../utils/validatedSchemas';
import { loginUser, changePassword } from '../../api';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [changePasswordMode, setChangePasswordMode] = useState(false);

    const handleLogin = async (values: { username: string; password: string }) => {
        const response = await loginUser(values);
        if (response) {
            localStorage.setItem('authToken', response.data.token);
            toast.success('Login successful!');
            navigate('/admin');
        }
    };

    const handleChangePassword = async (values: {
        username: string;
        oldPassword: string;
        newPassword: string;
        confirmPassword: string;
    }) => {
        const response = await changePassword({
            username: values.username,
            oldPassword: values.oldPassword,
            newPassword: values.newPassword,
        });

        if (response) {
            toast.success('Password changed successfully. You can log in with your new password.');
            setChangePasswordMode(false);
        }
    };

    return (
        <div className={styles['login-form']}>
            <h2>{changePasswordMode ? 'Change Password' : 'Admin Login'}</h2>

            <label className={styles['mode-toggle']}>
                <input
                    type="checkbox"
                    checked={changePasswordMode}
                    onChange={(e) => setChangePasswordMode(e.target.checked)}
                />
                Change password
            </label>

            {!changePasswordMode ? (
                <Formik
                    initialValues={{ username: '', password: '' }}
                    validationSchema={LOGIN_USER_VALIDATION_SCHEMA}
                    onSubmit={handleLogin}
                >
                    <Form>
                        <div>
                            <Field placeholder="Username" type="text" name="username" />
                            <ErrorMessage
                                name="username"
                                component="div"
                                className={styles['error-message']}
                            />
                        </div>
                        <div>
                            <Field placeholder="Password" type="password" name="password" />
                            <ErrorMessage
                                name="password"
                                component="div"
                                className={styles['error-message']}
                            />
                        </div>
                        <button type="submit">Login</button>
                    </Form>
                </Formik>
            ) : (
                <Formik
                    initialValues={{
                        username: '',
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                    }}
                    validationSchema={LOGIN_CHANGE_PASSWORD_VALIDATION_SCHEMA}
                    onSubmit={handleChangePassword}
                >
                    <Form>
                        <div>
                            <Field placeholder="Username" type="text" name="username" />
                            <ErrorMessage
                                name="username"
                                component="div"
                                className={styles['error-message']}
                            />
                        </div>
                        <div>
                            <Field
                                placeholder="Current password"
                                type="password"
                                name="oldPassword"
                                autoComplete="current-password"
                            />
                            <ErrorMessage
                                name="oldPassword"
                                component="div"
                                className={styles['error-message']}
                            />
                        </div>
                        <div>
                            <Field
                                placeholder="New password"
                                type="password"
                                name="newPassword"
                                autoComplete="new-password"
                            />
                            <ErrorMessage
                                name="newPassword"
                                component="div"
                                className={styles['error-message']}
                            />
                        </div>
                        <div>
                            <Field
                                placeholder="Confirm new password"
                                type="password"
                                name="confirmPassword"
                                autoComplete="new-password"
                            />
                            <ErrorMessage
                                name="confirmPassword"
                                component="div"
                                className={styles['error-message']}
                            />
                        </div>
                        <button type="submit">Update Password</button>
                    </Form>
                </Formik>
            )}

            <ToastContainer />
        </div>
    );
};

export default Login;
