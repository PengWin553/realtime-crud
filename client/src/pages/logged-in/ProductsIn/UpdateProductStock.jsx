import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import * as signalR from '@microsoft/signalr';
import API_BASE_URL from '../../../../src/config.js';
import '../../../styles/CrudPage.css';
import '../../../styles/MainDisplayPage.css';

const INITIAL_STOCK_STATE = {
  prodId: '',
  prodStock: '',
  prodRejectStock: '',
  prodRemainingStock: '',
  prodExpiryDate: ''
};

const UpdateProductStock = () => {
  const location = useLocation();
  const [stockEntry, setStockEntry] = useState(location.state || INITIAL_STOCK_STATE);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { id } = useParams();
  const [hubConnection, setHubConnection] = useState(null);
  const [productName, setProductName] = useState('');

  useEffect(() => {
    // Fetch the current stock entry details if not passed via location state
    const fetchStockEntry = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/ProductsInApi/${id}`);
        if (response.ok) {
          const data = await response.json();
          setStockEntry({
            prodId: data.prodId,
            prodStock: data.prodStock,
            prodRejectStock: data.prodRejectStock,
            prodRemainingStock: data.prodRemainingStock,
            prodExpiryDate: data.prodExpiryDate ? new Date(data.prodExpiryDate).toISOString().split('T')[0] : ''
          });
          setProductName(data.prodName);
        }
      } catch (error) {
        console.error('Error fetching stock entry:', error);
        toast.error('Failed to load stock entry');
      }
    };

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

    // Fetch stock entry details
    fetchStockEntry();

    // Cleanup connection on component unmount
    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStockEntry(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'prodStock', 'prodRejectStock', 'prodExpiryDate'
    ];

    const isValid = requiredFields.every(key => {
      if (!stockEntry[key]) {
        newErrors[key] = 'This field is required';
        return false;
      }
      return true;
    });

    // Additional validation for numeric fields
    if (stockEntry.prodStock && isNaN(Number(stockEntry.prodStock))) {
      newErrors.prodStock = 'Stock must be a number';
    }

    if (stockEntry.prodRejectStock && isNaN(Number(stockEntry.prodRejectStock))) {
      newErrors.prodRejectStock = 'Reject stock must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ProductsInApi/UpdateStockOfProduct/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prodId: stockEntry.prodId,
          prodStock: parseInt(stockEntry.prodStock),
          prodRejectStock: parseInt(stockEntry.prodRejectStock),
          prodExpiryDate: stockEntry.prodExpiryDate
        }),
      });

      if (response.ok) {
        const updatedStockEntry = await response.json();
        toast.success('Stock entry updated successfully');
        
        // Optional: Notify via SignalR if direct SignalR notification isn't handled by backend
        if (hubConnection) {
          try {
            await hubConnection.invoke('NotifyStockUpdated', updatedStockEntry);
          } catch (hubError) {
            console.error('SignalR notification error:', hubError);
          }
        }

        navigate('/products-in');
      } else {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to update stock entry');
      }
    } catch (error) {
      console.error('Error updating stock entry:', error);
      toast.error(`Failed to update stock entry: ${error.message}`);
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
          value={stockEntry[key]}
          onChange={handleChange}
          id={key}
          step={type === 'number' ? "1" : undefined}
        />
      </div>
    );
  };

  return (
    <div className="parent-container">
      <div className="top-container">
        <i className='bx bx-arrow-back' onClick={() => navigate('/products-in')}></i>
        <h1 className="input-page-title">Update Stock for {productName}</h1>
        <i className='bx bx-save' onClick={handleSubmit}></i>
      </div>
      <div className="form_parent_container">
        <form onSubmit={handleSubmit} className="form_container">
          {renderInputField('prodStock', 'Total Stock', "number")}
          {renderInputField('prodRejectStock', 'Reject Stock', "number")}
          {renderInputField('prodExpiryDate', 'Expiry Date', "date")}
        </form>
      </div>
      <Toaster richColors />
    </div>
  );
};

export default UpdateProductStock;