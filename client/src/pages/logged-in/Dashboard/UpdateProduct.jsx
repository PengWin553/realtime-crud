import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import * as signalR from '@microsoft/signalr';
import API_BASE_URL from '../../../../src/config.js';
import '../../../styles/CrudPage.css';
import '../../../styles/MainDisplayPage.css';

const INITIAL_PRODUCT_STATE = {
  prodName: '',
  prodDescription: '',
  prodPrice: '',
  prodMinStockLevel: ''
};

const UpdateProduct = () => {
  const location = useLocation();
  const [product, setProduct] = useState(location.state || INITIAL_PRODUCT_STATE);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { id } = useParams();
  const [hubConnection, setHubConnection] = useState(null);

  useEffect(() => {
    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/producthub`)
      .withAutomaticReconnect()
      .build();

    // Start the connection
    connection.start()
      .then(() => {
        console.log('SignalR Connected');
        setHubConnection(connection);
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    // Cleanup connection on component unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'prodName', 'prodDescription', 'prodPrice', 
      'prodMinStockLevel'
    ];

    const isValid = requiredFields.every(key => {
      if (!product[key]) {
        newErrors[key] = 'This field is required';
        return false;
      }
      return true;
    });

    // Additional validation for numeric fields
    if (product.prodPrice && isNaN(Number(product.prodPrice))) {
      newErrors.prodPrice = 'Price must be a number';
    }

    if (product.prodMinStockLevel && isNaN(Number(product.prodMinStockLevel))) {
      newErrors.prodMinStockLevel = 'Minimum stock level must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ProductsApi/UpdateProduct/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prodName: product.prodName,
          prodDescription: product.prodDescription,
          prodPrice: parseFloat(product.prodPrice),
          prodMinStockLevel: parseInt(product.prodMinStockLevel)
        }),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        toast.success('Product updated successfully');
        
        // Optional: Notify via SignalR if direct SignalR notification isn't handled by backend
        if (hubConnection) {
          try {
            await hubConnection.invoke('NotifyProductUpdated', updatedProduct);
          } catch (hubError) {
            console.error('SignalR notification error:', hubError);
          }
        }

        navigate('/');
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(`Failed to update product: ${error.message}`);
    }
  };

  const renderInputField = (key, label, type = "text") => {
    return (
      <div className="input_container" key={key}>
        <label className="input_label" htmlFor={key}>
          {label} {errors[key] && <span className="error-message">*{errors[key]}</span>}
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
        <h1 className="input-page-title">Update Product</h1>
        <i className='bx bx-save' onClick={handleSubmit}></i>
      </div>
      <div className="form_parent_container">
        <form onSubmit={handleSubmit} className="form_container">
          {renderInputField('prodName', 'Name')}
          {renderInputField('prodDescription', 'Description')}
          {renderInputField('prodPrice', 'Price', "number")}
          {renderInputField('prodMinStockLevel', 'Minimum Stock Level', "number")}
        </form>
      </div>
      <Toaster richColors />
    </div>
  );
};

export default UpdateProduct;