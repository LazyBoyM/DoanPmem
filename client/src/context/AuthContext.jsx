import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { jwtDecode } from 'jwt-decode';

import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;
                    if (decoded.exp < currentTime) {
                        logout();
                    } else {
                        // Optionally fetch latest profile data
                        const response = await axiosClient.get('/auth/me');
                        if (response.success) {
                            setUser(response.data);
                        } else {
                            // Do not accept a session whose profile cannot be verified.
                            logout();
                        }
                    }
                } catch (error) {
                    console.error("Invalid token", error);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username, password) => {
        try {
            const response = await axiosClient.post('/auth/login', { username, password });
            if (response.success) {
                localStorage.setItem('token', response.token);
                setUser(response.user);
                return { success: true, role: response.user.role };
            }
            return { success: false, message: response.message || 'Đăng nhập thất bại' };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Đã có lỗi xảy ra' };
        }
    };

    function logout() {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
