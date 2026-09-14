import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MainLayout = () => {
    return (
        <div className="app-container">
            <Sidebar />
            <main className="app-main">
                <Topbar />
                <div className="app-content-body">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
