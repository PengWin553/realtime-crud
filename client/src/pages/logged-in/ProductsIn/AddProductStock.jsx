import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import * as signalR from '@microsoft/signalr';
import API_BASE_URL from '../../../../src/config.js';
import '../../../styles/MainDisplayPage.css';
import '../../../styles/CrudPage.css';

const AddProductStock = () => {
  const [products, setProducts] = useState([]);
  const [productStock, setProductStock] = useState({
    prodId: '',
    prodStock: '',
    prodRejectStock: '',
    prodExpiryDate: '',
  });

  const [errors, setErrors] = useState({});
  const [hubConnection, setHubConnection] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Establish SignalR connection
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/productHub`, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    // Start the connection
    newConnection.start()
      .then(() => {
        console.log('SignalR Connected');
        setHubConnection(newConnection);
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    // Cleanup connection on component unmount
    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/api/ProductsApi/GetProducts');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error('Failed to fetch products');
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error loading products');
    }
  };

  const handleChange = ({ target: { name, value } }) => {
    setProductStock(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Check if product is selected
    if (!productStock.prodId) {
      newErrors.prodId = 'Please select a product';
    }

    // Check stock quantity
    if (!productStock.prodStock) {
      newErrors.prodStock = 'Stock quantity is required';
    } else if (isNaN(productStock.prodStock) || Number(productStock.prodStock) <= 0) {
      newErrors.prodStock = 'Stock quantity must be a positive number';
    }

    // Check reject stock (optional, but must be non-negative if provided)
    if (productStock.prodRejectStock && 
        (isNaN(productStock.prodRejectStock) || Number(productStock.prodRejectStock) < 0)) {
      newErrors.prodRejectStock = 'Reject stock must be a non-negative number';
    }

    // Check expiry date
    if (!productStock.prodExpiryDate) {
      newErrors.prodExpiryDate = 'Expiry date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await fetch(API_BASE_URL + '/api/ProductsInApi/SaveStockOfProduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productStock,
          prodRejectStock: productStock.prodRejectStock || 0
        }),
      });

      if (response.ok) {
        const savedStock = await response.json();
        
        // Optional: Manually trigger SignalR method if needed
        if (hubConnection) {
          try {
            await hubConnection.invoke("SendStockAdded", savedStock);
          } catch (hubError) {
            console.error('SignalR invoke error:', hubError);
          }
        }

        toast.success('Product stock added successfully');
        navigate('/products-in');
      } else {
        throw new Error('Failed to add product stock');
      }
    } catch (error) {
      console.error('Error adding product stock:', error);
      toast.error('Failed to add product stock. Please try again.');
    }
  };

  const renderInput = (key, label, type = "text", isSelect = false) => {
    return (
      <div className="input_container" key={key}>
        <label className="input_label" htmlFor={key}>
          {label}
          {errors[key] && <span className="error-message"> *{errors[key]}</span>}
        </label>
        {isSelect ? (
          <select
            className="input_field"
            name={key}
            value={productStock[key]}
            onChange={handleChange}
            id={key}
          >
            <option value="">Select a Product</option>
            {products.map(product => (
              <option key={product.prodId} value={product.prodId}>
                {product.prodName}
              </option>
            ))}
          </select>
        ) : (
          <input
            required
            type={type}
            className="input_field"
            name={key}
            value={productStock[key]}
            onChange={handleChange}
            id={key}
            step={type === 'number' ? "1" : undefined}
            min={type === 'number' ? "0" : undefined}
          />
        )}
      </div>
    );
  };

  return (
    <div className="parent-container">
      <div className="top-container">
        <i className='bx bx-arrow-back' onClick={() => navigate('/products-in')}></i>
        <h1 className="input-page-title">Add Product Stock</h1>
        <i className='bx bx-save' onClick={handleSubmit}></i>
      </div>
      <div className="form_parent_container">
        <form onSubmit={handleSubmit} className="form_container">
          {renderInput('prodId', 'Product', "text", true)}
          {renderInput('prodStock', 'Stock Quantity', "number")}
          {renderInput('prodRejectStock', 'Reject Stock', "number")}
          {renderInput('prodExpiryDate', 'Expiry Date', "date")}
        </form>
      </div>
      <Toaster richColors />
    </div>
  );
};

export default AddProductStock;