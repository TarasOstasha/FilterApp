// src/pages/Admin/Admin.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { toast } from 'react-toastify';
import styles from './Admin.module.scss';
import logo from './Logo-Master.png';
import { changePassword } from '../../api';
import { CHANGE_PASSWORD_VALIDATION_SCHEMA } from '../../utils/validatedSchemas';

function getUsernameFromToken(): string {
    const token = localStorage.getItem('authToken');
    if (!token) return '';

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return typeof payload.username === 'string' ? payload.username : '';
    } catch {
        return '';
    }
}

const Admin: React.FC = () => {
    const navigate = useNavigate();
    const username = getUsernameFromToken();

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        navigate('/login');
    };

    const handleChangePassword = async (values: {
        oldPassword: string;
        newPassword: string;
        confirmPassword: string;
    }) => {
        const response = await changePassword({
            oldPassword: values.oldPassword,
            newPassword: values.newPassword,
        });

        if (response) {
            toast.success('Password changed successfully');
            localStorage.removeItem('authToken');
            navigate('/login');
        }
    };

    return (
        <div className={styles['admin-wrapper']}>
            <div>
                <Link to="/admin" reloadDocument>
                    <img src={logo} alt="xyzdsplays" style={{ cursor: 'pointer' }} />
                </Link>
            </div>
            <div className={styles['admin-panel']}>
                <button onClick={handleLogout} className={styles['logout-button']}>
                    Logout
                </button>

                <section className={styles['change-password-section']}>
                    <h3>Change Password</h3>
                    {username && (
                        <p className={styles['logged-in-as']}>Logged in as <strong>{username}</strong></p>
                    )}
                    <Formik
                        initialValues={{
                            oldPassword: '',
                            newPassword: '',
                            confirmPassword: '',
                        }}
                        validationSchema={CHANGE_PASSWORD_VALIDATION_SCHEMA}
                        onSubmit={handleChangePassword}
                    >
                        <Form className={styles['change-password-form']}>
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
                            <button type="submit" className={styles['submit-button']}>
                                Update Password
                            </button>
                        </Form>
                    </Formik>
                </section>
            </div>
        </div>
    );
};

export default Admin;
