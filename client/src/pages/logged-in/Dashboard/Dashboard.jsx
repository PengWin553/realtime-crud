import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import API_BASE_URL from '../../../config';
import "../../../styles/MainDisplayPage.css";
import "../../../styles/search.css";
import "../../../styles/modals.css";
import * as signalR from '@microsoft/signalr';

const Dashboard = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const dropdownRef = useRef(null);
    const modalRef = useRef(null);
    const deleteModalRef = useRef(null);
    const hubConnectionRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch products
        const fetchProducts = async () => {
            try {
                const response = await fetch(API_BASE_URL + "/api/ProductsApi/GetProducts");
                const result = await response.json();
                setProducts(result);
                setLoading(false);
            } catch (error) {
                toast.error('Failed to load products.');
                setLoading(false);
            }
        };

        // Setup SignalR connection
        const setupSignalRConnection = async () => {
            try {
                const connection = new signalR.HubConnectionBuilder()
                    .withUrl(`${API_BASE_URL}/producthub`, {
                        skipNegotiation: false,
                        transport: signalR.HttpTransportType.WebSockets |
                            signalR.HttpTransportType.ServerSentEvents |
                            signalR.HttpTransportType.LongPolling,
                        withCredentials: true
                    })
                    .configureLogging(signalR.LogLevel.Information)
                    .build();

                // Handle product added event
                connection.on("ReceiveProductAdded", (newProduct) => {
                    setProducts(prevProducts => {
                        // Check if product already exists to prevent duplicates
                        const exists = prevProducts.some(p => p.prodId === newProduct.prodId);
                        if (!exists) {
                            return [newProduct, ...prevProducts];
                        }
                        return prevProducts;
                    });
                    toast.success('New product added');
                });

                // Handle product updated event
                connection.on("ReceiveProductUpdated", (updatedProduct) => {
                    setProducts(prevProducts =>
                        prevProducts.map(p =>
                            p.prodId === updatedProduct.prodId ? updatedProduct : p
                        )
                    );
                    toast.success('Product updated');
                });

                // Handle product deleted event
                connection.on("ReceiveProductDeleted", (deletedProductId) => {
                    setProducts(prevProducts =>
                        prevProducts.filter(p => p.prodId !== deletedProductId)
                    );
                    toast.success('Product deleted');
                });

                // Start the connection
                await connection.start();
                hubConnectionRef.current = connection;
            } catch (error) {
                console.error('SignalR Connection Error:', error);
                toast.error('Could not establish real-time connection');
            }
        };

        // Fetch products and setup SignalR
        fetchProducts();
        setupSignalRConnection();

        // Cleanup connection on component unmount
        return () => {
            if (hubConnectionRef.current) {
                hubConnectionRef.current.stop();
            }
        };
    }, []);

    // Rest of the existing component methods remain the same as in your original code
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
            }
            if (deleteModalRef.current && !deleteModalRef.current.contains(event.target)) {
                setIsDeleteModalOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = (id) => {
        setActiveDropdown(prev => (prev === id ? null : id));
    };

    const openUpdatePage = (product) => {
        const { prodId, prodName, prodDescription, prodPrice, prodOverallStock, prodMinStockLevel } = product;

        navigate(`/update-product/${prodId}`, {
            state: {
                prodId,
                prodName,
                prodDescription,
                prodPrice,
                prodOverallStock,
                prodMinStockLevel,
            }
        });
    };

    const openDeleteModal = (product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        try {
            const response = await fetch(API_BASE_URL + `/api/ProductsApi/DeleteProduct/${productToDelete.prodId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Removed local state update as SignalR will handle it
                toast.success('Product deleted successfully');
            } else {
                toast.error('Failed to delete product');
            }
        } catch (error) {
            toast.error('Failed to delete product. Please try again.');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    if (loading) return <div className="loading-container"><h1>Loading...</h1></div>;

    // Rest of the render method remains the same as in your original code
    return (
        <div className="parent-container">
            <h1 className="title">Products</h1>

            <div className="main-content-container">
                <div className="SearchInputContainer">
                    <input
                        placeholder="Search"
                        id="input"
                        className="searchinput"
                        name="text"
                        type="text"
                    />
                    <label className="labelforsearch" htmlFor="input">
                        <i className='bx bx-search-alt-2 search-icon'></i>
                    </label>
                </div>

                <div className="item-list">
                    {products.map(product => (
                        <div key={product.prodId} className="item-item">
                            <div className="item-info" onClick={() => {
                                setSelectedProduct(product);
                                setIsModalOpen(true);
                            }}>
                                <h4>{product.prodName}</h4>
                                <p>{product.prodOverallStock} in stock</p>
                            </div>
                            <div className="options-icon" onClick={() => toggleDropdown(product.prodId)}> … </div>
                            {activeDropdown === product.prodId && (
                                <div className="dropdown-menu show" ref={dropdownRef}>
                                    <div className="dropdown-item" onClick={() => openUpdatePage(product)}>Update</div>
                                    <div className="dropdown-item" onClick={() => openDeleteModal(product)}>Delete</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Modal and other sections remain the same */}
                {isModalOpen && selectedProduct && (
                    <div className="modal-overlay">
                        <div className="modal-content" ref={modalRef}>
                            <h3 className="modal-title">{selectedProduct.prodName}</h3>
                            <p className="hidden-display"><label className="modal-info">ID:</label> {selectedProduct.prodId}</p>
                            <p><label className="modal-info">Description:</label> {selectedProduct.prodDescription}</p>
                            <p><label className="modal-info">Price:</label> ₱{selectedProduct.prodPrice}</p>
                            <p><label className="modal-info">Overall Stock:</label> {selectedProduct.prodOverallStock}</p>
                            <p><label className="modal-info">Minimum Stock Level:</label> {selectedProduct.prodMinStockLevel}</p>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}><i className='bx bx-x'></i></button>
                        </div>
                    </div>
                )}

                {isDeleteModalOpen && productToDelete && (
                    <div className="modal-overlay">
                        <div className="modal-content" ref={deleteModalRef}>
                            <h3 className="modal-title">Confirm Deletion</h3>
                            <p>Are you sure you want to delete {productToDelete.prodName}?</p>
                            <div className="modal-actions">
                                <button className="modal-button cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                                <button className="modal-button delete" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                )}

                <button className="fab" onClick={() => navigate('/add-product')}>+</button>
            </div>

            <Toaster expand={true} richColors position='top-right' className='mr-8'></Toaster>
        </div>
    );
};

export default Dashboard;