import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AcademicProvider from '../context/AcademicProvider';
import { useAuth } from '../context/auth-context';

const MainLayout = () => {
    const { user } = useAuth();
    return (
        <AcademicProvider key={user?.id || 'guest'}>
        <div className="app-container">
            <Sidebar />
            <main className="app-main">
                <Topbar />
                <div className="app-content-body">
                    <Outlet />
                </div>
            </main>
        </div>
        </AcademicProvider>
    );
};

export default MainLayout;
