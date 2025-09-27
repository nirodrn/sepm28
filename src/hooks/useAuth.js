import { useState, useEffect } from 'react';
import { onAuthStateChange } from '../firebase/auth';
import { getUserByUid } from '../firebase/db';
import { pcsService } from '../services/pcsService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getUserByUid(firebaseUser.uid);
          if (userData) {
            setUser(firebaseUser);
            setUserRole(userData);
            
            // Initialize PCS permissions for non-Admin users if they don't exist
            if (userData.role !== 'Admin') {
              try {
                // Ensure PCS entry exists for non-Admin users
                await pcsService.ensurePCSEntry(firebaseUser.uid, userData.role);
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions:', pcsError.message);
              }
            }
          } else {
            // User exists in Auth but not in database - check if it's a known admin
            console.warn('User not found in database, checking for admin access');
            
            // Check if this is the admin user based on email
            if (firebaseUser.email === 'admin@example.com') {
              setUser(firebaseUser);
              setUserRole({
                name: 'System Administrator',
                email: firebaseUser.email,
                role: 'Admin',
                department: 'Admin',
                status: 'active'
              });
            } else if (firebaseUser.email === 'readonly@example.com') {
              setUser(firebaseUser);
              const readOnlyUserRole = {
                name: 'Read Only Admin',
                email: firebaseUser.email,
                role: 'ReadOnlyAdmin',
                department: 'Admin',
                status: 'active'
              };
              setUserRole(readOnlyUserRole);
              
              // Initialize PCS permissions for ReadOnlyAdmin
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'ReadOnlyAdmin');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for ReadOnlyAdmin:', pcsError.message);
              }
            } else if (firebaseUser.email === 'whstaff@example.com') {
              setUser(firebaseUser);
              const warehouseUserRole = {
                name: 'John Smith',
                email: firebaseUser.email,
                role: 'WarehouseStaff',
                department: 'WarehouseOperations',
                status: 'active'
              };
              setUserRole(warehouseUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'WarehouseStaff');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for WarehouseStaff:', pcsError.message);
              }
            } else if (firebaseUser.email === 'ho@example.com') {
              setUser(firebaseUser);
              const hoUserRole = {
                name: 'Sarah Johnson',
                email: firebaseUser.email,
                role: 'HeadOfOperations',
                department: 'HeadOfOperations',
                status: 'active'
              };
              setUserRole(hoUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'HeadOfOperations');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for HeadOfOperations:', pcsError.message);
              }
            } else if (firebaseUser.email === 'md@example.com') {
              setUser(firebaseUser);
              const mdUserRole = {
                name: 'Michael Director',
                email: firebaseUser.email,
                role: 'MainDirector',
                department: 'MainDirector',
                status: 'active'
              };
              setUserRole(mdUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'MainDirector');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for MainDirector:', pcsError.message);
              }
            } else if (firebaseUser.email === 'production@example.com') {
              setUser(firebaseUser);
              const productionUserRole = {
                name: 'Emily Production',
                email: firebaseUser.email,
                role: 'ProductionManager',
                department: 'Production',
                status: 'active'
              };
              setUserRole(productionUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'ProductionManager');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for ProductionManager:', pcsError.message);
              }
            } else if (firebaseUser.email === 'packstore@example.com') {
              setUser(firebaseUser);
              const packingAreaUserRole = {
                name: 'David Pack',
                email: firebaseUser.email,
                role: 'PackingAreaManager',
                department: 'PackingArea',
                status: 'active'
              };
              setUserRole(packingAreaUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'PackingAreaManager');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for PackingAreaManager:', pcsError.message);
              }
            } else if (firebaseUser.email === 'fgstore@example.com') {
              setUser(firebaseUser);
              const fgStoreUserRole = {
                name: 'Lisa Goods',
                email: firebaseUser.email,
                role: 'FinishedGoodsStoreManager',
                department: 'FinishedGoodsStore',
                status: 'active'
              };
              setUserRole(fgStoreUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'FinishedGoodsStoreManager');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for FinishedGoodsStoreManager:', pcsError.message);
              }
            } else if (firebaseUser.email === 'dataentry@example.com') {
              setUser(firebaseUser);
              const dataEntryUserRole = {
                name: 'Robert Entry',
                email: firebaseUser.email,
                role: 'DataEntry',
                department: 'DataEntry',
                status: 'active'
              };
              setUserRole(dataEntryUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'DataEntry');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for DataEntry:', pcsError.message);
              }
            } else if (firebaseUser.email === 'packingarea@example.com') {
              setUser(firebaseUser);
              const packingMaterialsUserRole = {
                name: 'Alex Packing',
                email: firebaseUser.email,
                role: 'PackingMaterialsStoreManager',
                department: 'PackingMaterialsStore',
                status: 'active'
              };
              setUserRole(packingMaterialsUserRole);
              
              // Initialize PCS permissions
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'PackingMaterialsStoreManager');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for PackingMaterialsStoreManager:', pcsError.message);
              }
            } else {
              // Unknown user - default to DataEntry
              console.warn('Unknown user, defaulting to DataEntry role');
              setUser(firebaseUser);
              const defaultUserRole = {
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: firebaseUser.email,
                role: 'DataEntry', // Default role
                department: 'DataEntry',
                status: 'active'
              };
              setUserRole(defaultUserRole);
              
              // Initialize PCS permissions for default user
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'DataEntry');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions for default user:', pcsError.message);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error.message);
          
          // If it's a permission error, still allow login with basic auth data
          if (error.message.includes('Permission denied') || error.code === 'PERMISSION_DENIED') {
            console.warn('Database permission denied, using email-based role mapping');
            
            // Use email-based role mapping when database is inaccessible
            if (firebaseUser.email === 'admin@example.com') {
              setUser(firebaseUser);
              setUserRole({
                name: 'System Administrator',
                email: firebaseUser.email,
                role: 'Admin',
                department: 'Admin',
                status: 'active'
              });
            } else {
              setUser(firebaseUser);
              const fallbackUserRole = {
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                email: firebaseUser.email,
                role: 'DataEntry', // Default role when database is inaccessible
                department: 'DataEntry',
                status: 'active'
              };
              setUserRole(fallbackUserRole);
              
              // Try to initialize PCS permissions even when database has permission issues
              try {
                await pcsService.ensurePCSEntry(firebaseUser.uid, 'DataEntry');
              } catch (pcsError) {
                console.warn('Failed to initialize PCS permissions during fallback:', pcsError.message);
              }
            }
          } else {
            // For other errors, clear user state
            setUser(null);
            setUserRole(null);
          }
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, userRole, loading };
};