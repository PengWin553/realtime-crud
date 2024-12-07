import { Route, Routes } from "react-router-dom";

// Dashboard folder
import Dashboard from "../pages/logged-in/Dashboard/Dashboard";
import AddProduct from "../pages/logged-in/Dashboard/AddProduct";
import UpdateProduct from "../pages/logged-in/Dashboard/UpdateProduct";

// ProductsIn folder
import ProductsIn from "../pages/logged-in/ProductsIn/ProductsIn";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/update-product/:id" element={<UpdateProduct />} />

            <Route path="/products-in" element={<ProductsIn />} />
        </Routes>
    );
}

export default AppRoutes;