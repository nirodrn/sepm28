import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { getUserByUid, createUser, updateUser, removeData, getData } from '../firebase/db';
import { pcsService } from './pcsService';

export const userService = {
  // Create a new user with authentication and database record
  async createNewUser(userData) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password || 'defaultPassword123'
      );
      
      const uid = userCredential.user.uid;
      
      // Create user record in database
      const userRecord = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        distributorId: userData.distributorId || null,
        distributorId: userData.distributorId || null,
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'system'
      };
      
      await createUser(uid, userRecord);
      
      // Initialize PCS permissions for non-Admin users
      if (userData.role !== 'Admin') {
        try {
          await pcsService.initializeUserPermissions(uid, userData.role);
        } catch (pcsError) {
          console.warn('Failed to initialize PCS permissions for new user:', pcsError.message);
        }
      }
      
      return { uid, ...userRecord };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  },

  // Get all users
  async getAllUsers() {
    try {
      const users = await getData('users');
      if (!users) return [];
      
      return Object.entries(users).map(([uid, userData]) => ({
        id: uid,
        uid,
        ...userData
      }));
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  },

  // Get user by ID
  async getUserById(uid) {
    try {
      const userData = await getUserByUid(uid);
      if (!userData) {
        throw new Error('User not found');
      }
      return { id: uid, uid, ...userData };
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  },

  // Update user
  async updateUserData(uid, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: Date.now(),
        updatedBy: auth.currentUser?.uid || 'system'
      };
      
      await updateUser(uid, updateData);
      return { uid, ...updateData };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  },

  // Delete user (soft delete by setting status to inactive)
  async deleteUser(uid) {
    try {
      await updateUser(uid, {
        status: 'inactive',
        deletedAt: Date.now(),
        deletedBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  },

  // Permanently remove user (use with caution)
  async permanentlyDeleteUser(uid) {
    try {
      await removeData(`users/${uid}`);
      return true;
    } catch (error) {
      throw new Error(`Failed to permanently delete user: ${error.message}`);
    }
  },

  // Reset user password (admin function)
  async resetUserPassword(uid, newPassword = 'newPassword123') {
    try {
      // Note: This would require admin SDK in a real implementation
      // For now, we'll just update the database record
      await updateUser(uid, {
        passwordResetAt: Date.now(),
        passwordResetBy: auth.currentUser?.uid || 'system'
      });
      return true;
    } catch (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }
  },

  // Get users by role
  async getUsersByRole(role) {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter(user => user.role === role && user.status === 'active');
    } catch (error) {
      throw new Error(`Failed to fetch users by role: ${error.message}`);
    }
  },

  // Get users by department
  async getUsersByDepartment(department) {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter(user => user.department === department && user.status === 'active');
    } catch (error) {
      throw new Error(`Failed to fetch users by department: ${error.message}`);
    }
  },

  // Get distributors (users with Distributor role)
  async getDistributors() {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter(user => user.role === 'Distributor' && user.status === 'active');
    } catch (error) {
      throw new Error(`Failed to fetch distributors: ${error.message}`);
    }
  },

  // Get distributor representatives for a specific distributor
  async getDistributorRepresentatives(distributorId) {
    try {
      const allUsers = await this.getAllUsers();
      return allUsers.filter(user => 
        user.role === 'DistributorRepresentative' && 
        user.distributorId === distributorId && 
        user.status === 'active'
      );
    } catch (error) {
      throw new Error(`Failed to fetch distributor representatives: ${error.message}`);
    }
  }
};