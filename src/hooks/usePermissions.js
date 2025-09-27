import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { pcsService } from '../services/pcsService';
import { subscribeToData, getData } from '../firebase/db';

// Helper functions to handle Firebase key restrictions
const formatFirebaseKeyToPath = (key) => {
  // Convert Firebase keys back to paths: 'dashboard' to '/dashboard' and 'admin_users' to '/admin/users'
  if (!key.includes('_')) {
    return `/${key}`;
  }
  return `/${key.replace(/_/g, '/')}`;
};

export const usePermissions = () => {
  const { user, userRole } = useAuth();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setPermissions({});
      setLoading(false);
      return;
    }

    // Load permissions from PCS table
    const loadPermissions = async () => {
      try {
        setLoading(true);
        
        // For Admin users, grant all permissions
        if (userRole?.role === 'Admin') {
          const allPages = pcsService.getAllAvailablePages();
          const adminPermissions = {};
          allPages.forEach(page => {
            adminPermissions[page.path] = true;
          });
          setPermissions(adminPermissions);
          setLoading(false);
          return;
        }
        
        // For non-Admin users, ensure PCS entry exists and load permissions
        const pcsData = await pcsService.ensurePCSEntry(user.uid, userRole?.role);
        const userPermissions = pcsData?.pages || { '/dashboard': true };
        
        // Always ensure dashboard is accessible
        const finalPermissions = { '/dashboard': true, ...userPermissions };
        
        setPermissions(finalPermissions);
      } catch (error) {
        console.error('Error loading permissions:', error);
        // On error, default to dashboard only
        setPermissions({ '/dashboard': true });
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();

    // Subscribe to real-time updates for PCS changes (only for non-Admin users)
    let unsubscribe = () => {};
    
    if (userRole?.role !== 'Admin') {
      unsubscribe = subscribeToData(`pcs/${user.uid}`, (snapshot) => {
        try {
          const data = snapshot.val();
          if (data && data.pages) {
            // Convert Firebase keys back to page paths
            const convertedPages = {};
            Object.entries(data.pages).forEach(([firebaseKey, value]) => {
              const pagePath = formatFirebaseKeyToPath(firebaseKey);
              convertedPages[pagePath] = value;
            });
            
            // Always ensure dashboard is accessible
            const finalPermissions = { '/dashboard': true, ...convertedPages };
            setPermissions(finalPermissions);
            
            // Force a small delay to ensure state update is processed
            setTimeout(() => {
              setLoading(false);
            }, 100);
          } else {
            // If no data, default to dashboard only
            setPermissions({ '/dashboard': true });
            setLoading(false);
          }
        } catch (error) {
          console.error('Error in PCS real-time listener:', error);
          setPermissions({ '/dashboard': true });
          setLoading(false);
        }
      });
    }

    return () => unsubscribe();
  }, [user?.uid, userRole?.role]);

  // Check if user has permission for a specific page
  const hasPagePermission = (pagePath) => {
    if (!user || !userRole) return false;
    
    // Admin always has access to everything
    if (userRole.role === 'Admin') return true;
    
    // For non-Admin users, check PCS permissions (which may include cross-role access)
    return permissions[pagePath] === true;
  };

  // Get all pages user has access to
  const getAccessiblePages = () => {
    if (!userRole) return [];
    
    const allPages = pcsService.getAllAvailablePages();
    
    // For Admin, return all pages
    if (userRole.role === 'Admin') {
      return allPages;
    }
    
    // For non-Admin, filter by PCS permissions (includes any cross-role access granted by Admin)
    const accessiblePages = allPages.filter(page => permissions[page.path] === true);
    
    // Ensure dashboard is always included for non-Admin users
    const hasDashboard = accessiblePages.some(page => page.path === '/dashboard');
    if (!hasDashboard) {
      const dashboardPage = allPages.find(page => page.path === '/dashboard');
      if (dashboardPage) {
        accessiblePages.unshift(dashboardPage);
      }
    }
    
    return accessiblePages;
  };

  return {
    permissions,
    loading,
    hasPagePermission,
    getAccessiblePages
  };
};