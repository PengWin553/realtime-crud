import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import * as signalR from "@microsoft/signalr";
import API_BASE_URL from '../../../../src/config.js';
import "../../../styles/MainDisplayPage.css";
import "../../../styles/search.css";
import "../../../styles/modals.css";

const ProductsIn = () => {
    const [productsIn, setProductsIn] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedProductIn, setSelectedProductIn] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
    const [productInToDelete, setProductInToDelete] = useState(null);
    const [productInToDiscard, setProductInToDiscard] = useState(null);
    const [discardAmount, setDiscardAmount] = useState(0);
    const dropdownRef = useRef(null);
    const modalRef = useRef(null);
    const deleteModalRef = useRef(null);
    const discardModalRef = useRef(null);
    const hubConnectionRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Establish SignalR connection
        const hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/productHub`)
            .withAutomaticReconnect()
            .build();

        hubConnectionRef.current = hubConnection;

        // Add SignalR event listeners BEFORE starting the connection
        hubConnection.on("ReceiveStockAdded", (stock) => {
            setProductsIn(prev => {
                // Check if stock already exists to prevent duplicates
                const exists = prev.some(s => s.prodInId === stock.prodInId);
                return exists ? prev : [...prev, stock];
            });
            toast.success(`New stock added for ${stock.prodName}`);
        });

        hubConnection.on("ReceiveStockUpdated", (updatedStock) => {
            setProductsIn(prev => prev.map(prod =>
                prod.prodInId === updatedStock.prodInId ? updatedStock : prod
            ));
            toast.success(`Stock updated for ${updatedStock.prodName}`);
        });

        hubConnection.on("ReceiveStockDeleted", (stockInfo) => {
            setProductsIn(prev => prev.filter(prod => prod.prodInId !== stockInfo.prodInId));
            toast.success(`Stock deleted for ${stockInfo.prodName}`);
        });

        hubConnection.on("ReceiveStockDiscarded", (discardInfo) => {
            setProductsIn(prev => prev.map(prod =>
                prod.prodInId === discardInfo.prodInId ? discardInfo.updatedStock : prod
            ));
            toast.success(`Stock discarded for ${discardInfo.prodName}`);
        });

        // Start the connection
        hubConnection.start()
            .then(() => {
                console.log("SignalR Connected");
                fetchProductsIn();
            })
            .catch(err => {
                console.error("SignalR Connection Error:", err);
                toast.error("Failed to establish real-time connection");
                fetchProductsIn();
            });

        // Cleanup connection on component unmount
        return () => {
            if (hubConnection) {
                hubConnection.stop();
            }
        };
    }, []);

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
            if (discardModalRef.current && !discardModalRef.current.contains(event.target)) {
                setIsDiscardModalOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchProductsIn = async () => {
        try {
            const response = await fetch(API_BASE_URL + "/api/ProductsInApi/GetAllStocksOfProducts");
            const result = await response.json();
            setProductsIn(result);
        } catch (error) {
            toast.error('Failed to load product stocks.');
        } finally {
            setLoading(false);
        }
    };

    const toggleDropdown = (id) => {
        setActiveDropdown(prev => (prev === id ? null : id));
    };

    const openUpdatePage = (productIn) => {
        const formattedDate = productIn.prodExpiryDate
            ? new Date(productIn.prodExpiryDate).toLocaleDateString('en-CA')
            : '';

        const { prodInId, prodId, prodStock, prodRejectStock, prodRemainingStock, prodName } = productIn;

        navigate(`/update-product-stock/${prodInId}`, {
            state: {
                prodInId,
                prodId,
                prodStock,
                prodRejectStock,
                prodRemainingStock,
                prodExpiryDate: formattedDate,
                prodName
            }
        });
    };

    const openDeleteModal = (productIn) => {
        setProductInToDelete(productIn);
        setIsDeleteModalOpen(true);
    };

    const openDiscardModal = (productIn) => {
        setProductInToDiscard(productIn);
        setDiscardAmount(productIn.prodRemainingStock);
        setIsDiscardModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productInToDelete) return;

        try {
            const response = await fetch(API_BASE_URL + `/api/ProductsInApi/DeleteStockOfProduct/${productInToDelete.prodInId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Immediately update local state
                setProductsIn(prev => prev.filter(prod => prod.prodInId !== productInToDelete.prodInId));
                toast.success('Product stock deleted successfully');
            } else {
                toast.error('Failed to delete product stock');
            }
        } catch (error) {
            console.error('Error deleting product stock:', error);
            toast.error('Failed to delete product stock. Please try again.');
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const confirmDiscard = async () => {
        if (!productInToDiscard || !discardAmount) return;

        try {
            const url = `${API_BASE_URL}/api/ProductsInApi/DiscardStock?prodInId=${productInToDiscard.prodInId}&discardAmount=${discardAmount}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const updatedProduct = await response.json();
                // Immediately update local state
                setProductsIn(prev => prev.map(prod =>
                    prod.prodInId === updatedProduct.prodInId ? updatedProduct : prod
                ));
                toast.success('Product stock discarded successfully');
            } else {
                const errorData = await response.text();
                toast.error(errorData || 'Failed to discard product stock');
            }
        } catch (error) {
            console.error('Error discarding product stock:', error);
            toast.error('Failed to discard product stock. Please try again.');
        } finally {
            setIsDiscardModalOpen(false);
        }
    };

    const getItemClass = (productIn) => {
        const classes = ['item-item'];

        if (productIn.prodRemainingStock === 0) {
            classes.push('item-disabled');
        } else if (productIn.prodRemainingStock < productIn.prodStock) {
            classes.push('in-use');
        }

        const expirationStatus = getExpirationStatus(productIn);
        if (expirationStatus === 'expiring') {
            classes.push('item-warning-yellow');
        } else if (expirationStatus === 'expired') {
            classes.push('item-expired');
        }

        return classes.join(' ');
    };

    const getExpirationStatus = (productIn) => {
        if (productIn.prodExpiryDate) {
            const expiryDate = new Date(productIn.prodExpiryDate);
            const today = new Date();
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry <= 0) {
                return 'expired';
            } else if (daysUntilExpiry <= 3) {
                return 'expiring';
            }
        }
        return 'normal';
    };

    if (loading) return <div className="loading-container"><h1>Loading...</h1></div>;

    return (
        <div className="parent-container">
            <h1 className="title">Product Stocks</h1>

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
                    {productsIn.map(productIn => {
                        const expirationStatus = getExpirationStatus(productIn);
                        return (
                            <div
                                key={productIn.prodInId}
                                className={getItemClass(productIn)}
                            >
                                <div className="item-info" onClick={() => {
                                    setSelectedProductIn(productIn);
                                    setIsModalOpen(true);
                                }}>
                                    <h4>{productIn.prodName ? `${productIn.prodName}` : `Product ID: ${productIn.prodId}`}</h4>
                                    <p>Stock: {productIn.prodRemainingStock ?? 'N/A'} / {productIn.prodStock ?? 'N/A'}</p>
                                    <p className='very-small-text'>Expiry: {new Date(productIn.prodExpiryDate).toLocaleDateString()}</p>
                                </div>
                                {productIn.prodRemainingStock > 0 && (
                                    <>
                                        {expirationStatus === 'expired' ? (
                                            <div className="delete-action">
                                                <i className='bx bx-trash' onClick={() => openDiscardModal(productIn)}></i>
                                            </div>
                                        ) : (
                                            <div className="options-icon" onClick={() => toggleDropdown(productIn.prodInId)}> … </div>
                                        )}
                                        {activeDropdown === productIn.prodInId && (
                                            <div className="dropdown-menu show" ref={dropdownRef}>
                                                <div className="dropdown-item" onClick={() => openUpdatePage(productIn)}>Update</div>
                                                <div className="dropdown-item" onClick={() => openDeleteModal(productIn)}>Delete</div>
                                                {expirationStatus === 'expiring' && (
                                                    <div className="dropdown-item" onClick={() => openDiscardModal(productIn)}>Discard</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Modal components remain the same as in the previous version */}
                {isModalOpen && selectedProductIn && (
                    <div className="modal-overlay">
                        <div className="modal-content" ref={modalRef}>
                            <h3 className="modal-title">Product Stock Details</h3>
                            <p className="hidden-display"><label className="modal-info">ProdStockId:</label> {selectedProductIn.prodInId}</p>
                            <p><label className="modal-info">Product:</label> {selectedProductIn.prodName ?? selectedProductIn.prodId}</p>
                            <p><label className="modal-info">Remaining:</label> {selectedProductIn.prodRemainingStock ?? 'N/A'}</p>
                            <p><label className="modal-info">Rejects:</label> {selectedProductIn.prodRejectStock ?? 'N/A'}</p>
                            <p><label className="modal-info">Total Okay Stock:</label> {selectedProductIn.prodStock ?? 'N/A'}</p>
                            <p><label className="modal-info">Expiry Date:</label> {selectedProductIn.prodExpiryDate ? new Date(selectedProductIn.prodExpiryDate).toLocaleDateString() : 'N/A'}</p>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}><i className='bx bx-x'></i></button>
                        </div>
                    </div>
                )}

                {/* Delete and Discard modals remain the same */}
                {isDeleteModalOpen && productInToDelete && (
                    <div className="modal-overlay">
                        <div className="modal-content" ref={deleteModalRef}>
                            <h3 className="modal-title">Confirm Deletion</h3>
                            <p>Are you sure you want to delete this stock of {productInToDelete.prodName}?</p>
                            <div className="modal-actions">
                                <button className="modal-button cancel" onClick={() => setIsDeleteModalOpen(false)}>Cancel</button>
                                <button className="modal-button delete" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                )}

                {isDiscardModalOpen && productInToDiscard && (
                    <div className="modal-overlay">
                        <div className="modal-content" ref={discardModalRef}>
                            <h3 className="modal-title">Discard Expiring Stock</h3>
                            <p>How much stock of {productInToDiscard.prodName} do you want to discard?</p>
                            <p>Remaining stock: {productInToDiscard.prodRemainingStock}</p>
                            <input
                                type="number"
                                value={discardAmount}
                                onChange={(e) => setDiscardAmount(Math.min(Number(e.target.value), productInToDiscard.prodRemainingStock))}
                                max={productInToDiscard.prodRemainingStock}
                                min={0}
                            />
                            <div className="modal-actions">
                                <button className="modal-button cancel" onClick={() => setIsDiscardModalOpen(false)}>Cancel</button>
                                <button className="modal-button delete" onClick={confirmDiscard}>Discard</button>
                            </div>
                        </div>
                    </div>
                )}

                <button className="fab" onClick={() => navigate('/add-product-stock')}>+</button>
            </div>

            <Toaster richColors position="top-right" />
        </div>
    );
};

export default ProductsIn;