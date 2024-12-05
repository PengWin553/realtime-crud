import { Route, Routes } from "react-router-dom";

// Dashboard folder
import Dashboard from "../pages/logged-in/Dashboard/Dashboard";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
        </Routes>
    );
}

export default AppRoutes;