import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from "react-router-dom";
import '../styles/Sidebar.css';

const Sidebar = () => {
  const [isSidebarClosed, setIsSidebarClosed] = useState(true);
  const [openMenus, setOpenMenus] = useState({});
  const sidebarRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarClosed(!isSidebarClosed);
  };

  const toggleMenu = (index) => {
    setOpenMenus(prevState => ({
      ...prevState,
      [index]: !prevState[index]
    }));
  };

  // Close the sidebar when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarClosed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { icon: 'bxs-dashboard', name: 'Dashboard', path: '/' },
    { icon: 'bx-baguette', name: 'Products In', path: '/products-in' },
  ];

  return (
    <>
      <div ref={sidebarRef} className={`sidebar ${isSidebarClosed ? 'close' : ''}`}>
        <div className="logo-details">
          <i className='bx bx-baguette shelfaware-icon'></i>
          <span className="logo_name">ShelfAware</span>
        </div>
        <ul className="nav-links">
          {navLinks.map((link, index) => (
            <li key={index} className={openMenus[index] ? 'showMenu' : ''}>
              <div className="iocn-link">
                <NavLink to={link.path} className="link" activeClassName="active">
                  <i className={`bx ${link.icon}`}></i>
                  <span className="link_name">{link.name}</span>
                </NavLink>
                {link.subMenu && (
                  <i className='bx bxs-chevron-down arrow' onClick={() => toggleMenu(index)}></i>
                )}
              </div>
              {link.subMenu && (
                <ul className="sub-menu">
                  <li><NavLink to={link.path} className="link_name">{link.name}</NavLink></li>
                  {link.subMenu.map((subItem, subIndex) => (
                    <li key={subIndex}><NavLink to={`/${subItem.toLowerCase().replace(/\s+/g, '-')}`} className="sub-link">{subItem}</NavLink></li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        <div className="profile-details">
          <div className="name-job">
            <div className="profile_name">PengWin553</div>
            <div className="job">Admin</div>
          </div>
          <i className='bx bx-log-out'></i>
        </div>
      </div>
      {isSidebarClosed && (
        <i className='bx bx-menu sidebar-toggle' onClick={toggleSidebar}></i>
      )}
    </>
  );
};

export default Sidebar;