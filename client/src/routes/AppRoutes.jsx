import { Route, Routes } from "react-router-dom";

// Dashboard folder
import Dashboard from "../pages/logged-in/Dashboard/Dashboard";
import AddProduct from "../pages/logged-in/Dashboard/AddProduct";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-product" element={<AddProduct />} />
        </Routes>
    );
}

export default AppRoutes;