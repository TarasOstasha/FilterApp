import * as yup from 'yup';

export const LOGIN_USER_VALIDATION_SCHEMA = yup.object().shape({
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters'),
  password: yup.string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'Password cannot exceed 20 characters'),
});

export const LOGIN_CHANGE_PASSWORD_VALIDATION_SCHEMA = yup.object().shape({
  username: yup.string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username cannot exceed 20 characters'),
  oldPassword: yup.string()
    .required('Current password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'Password cannot exceed 20 characters'),
  newPassword: yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'Password cannot exceed 20 characters')
    .notOneOf([yup.ref('oldPassword')], 'New password must be different from the current password'),
  confirmPassword: yup.string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});

export const CHANGE_PASSWORD_VALIDATION_SCHEMA = yup.object().shape({
  oldPassword: yup.string()
    .required('Current password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'Password cannot exceed 20 characters'),
  newPassword: yup.string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(20, 'Password cannot exceed 20 characters')
    .notOneOf([yup.ref('oldPassword')], 'New password must be different from the current password'),
  confirmPassword: yup.string()
    .required('Please confirm your new password')
    .oneOf([yup.ref('newPassword')], 'Passwords must match'),
});
