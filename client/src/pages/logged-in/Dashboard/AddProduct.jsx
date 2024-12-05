import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import * as signalR from '@microsoft/signalr';
import API_BASE_URL from '../../../../src/config.js';
import '../../../styles/MainDisplayPage.css';
import '../../../styles/CrudPage.css';

const AddProduct = () => {
  const [product, setProduct] = useState({
    prodName: '',
    prodDescription: '',
    prodPrice: '',
    prodMinStockLevel: '',
  });

  const [errors, setErrors] = useState({});
  const [existingProducts, setExistingProducts] = useState([]);
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
    fetchExistingProducts();
  }, []);

  const fetchExistingProducts = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/api/ProductsApi/GetProducts');
      if (response.ok) {
        const data = await response.json();
        setExistingProducts(data.map(prod => prod.prodName.toLowerCase()));
      } else {
        console.error('Failed to fetch existing products');
      }
    } catch (error) {
      console.error('Error fetching existing products:', error);
    }
  };

  const handleChange = ({ target: { name, value } }) => {
    setProduct(prev => ({ ...prev, [name]: value }));
    
    if (name === 'prodName') {
      if (existingProducts.includes(value.toLowerCase())) {
        setErrors(prev => ({ ...prev, [name]: `${value} already exists` }));
      } else {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = Object.keys(product).reduce((acc, key) => {
      if (!product[key]) {
        acc[key] = 'This field is required';
      }
      return acc;
    }, {});

    if (existingProducts.includes(product.prodName.toLowerCase())) {
      newErrors.prodName = `${product.prodName} already exists`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Set the prodOverallStock to 0 before sending the request
      const productWithStock = { ...product, prodOverallStock: '0' };

      const response = await fetch(API_BASE_URL + '/api/ProductsApi/SaveProduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productWithStock),
      });

      if (response.ok) {
        const savedProduct = await response.json();
        
        // Optional: Manually trigger SignalR method if needed
        if (hubConnection) {
          try {
            await hubConnection.invoke("SendProductAdded", savedProduct);
          } catch (hubError) {
            console.error('SignalR invoke error:', hubError);
          }
        }

        toast.success('Product added successfully');
        navigate('/');
      } else {
        throw new Error('Failed to add product');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product. Please try again.');
    }
  };

  const renderInput = (key, label, type = "text") => {
    return (
      <div className="input_container" key={key}>
        <label className="input_label" htmlFor={key}>
          {label}
          {errors[key] && <span className="error-message"> *{errors[key]}</span>}
        </label>
        <input
          required
          type={type}
          className="input_field"
          name={key}
          value={product[key]}
          onChange={handleChange}
          id={key}
          step={key === 'prodPrice' ? "0.01" : "1"}
        />
      </div>
    );
  };

  return (
    <div className="parent-container">
      <div className="top-container">
        <i className='bx bx-arrow-back' onClick={() => navigate('/')}></i>
        <h1 className="input-page-title">Add New Product</h1>
        <i className='bx bx-save' onClick={handleSubmit}></i>
      </div>
      <div className="form_parent_container">
        <form onSubmit={handleSubmit} className="form_container">
          {renderInput('prodName', 'Name')}
          {renderInput('prodDescription', 'Description')}
          {renderInput('prodPrice', 'Price', "number")}
          {renderInput('prodMinStockLevel', 'Minimum Stock Level', "number")}
        </form>
      </div>
      <Toaster richColors />
    </div>
  );
};

export default AddProduct;