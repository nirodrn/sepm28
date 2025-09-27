import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const packingMaterialRequestService = {
  // Create Packing Material Request (Warehouse Staff)
  async createPackingMaterialRequest(requestData) {
    try {
      const currentUser = auth.currentUser;
      const request = {
        ...requestData,
        status: 'pending_ho',
        requestedBy: currentUser?.uid,
        requestedByName: currentUser?.displayName || currentUser?.email || 'Warehouse Staff',
        requestedByRole: 'WarehouseStaff',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workflow: {
          submitted: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'WarehouseStaff'
          }
        }
      };
      
      const id = await pushData('packingMaterialRequests', request);
      
      // Create notification for HO
      await this.createNotification('HeadOfOperations', {
        type: 'packing_material_request',
        requestId: id,
        message: `New packing material request from ${request.requestedByName}`,
        data: { requestType: 'packingMaterial', materials: request.materials }
      });
      
      return { id, ...request };
    } catch (error) {
      throw new Error(`Failed to create packing material request: ${error.message}`);
    }
  },

  // Get Packing Material Requests
  async getPackingMaterialRequests(filters = {}) {
    try {
      const requests = await getData('packingMaterialRequests');
      if (!requests) return [];
      
      let filteredRequests = Object.entries(requests).map(([id, request]) => ({
        id,
        ...request
      }));

      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }
      
      if (filters.requestedBy) {
        filteredRequests = filteredRequests.filter(req => req.requestedBy === filters.requestedBy);
      }

      return filteredRequests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch packing material requests: ${error.message}`);
    }
  },

  // HO Approve and Forward to MD
  async hoApproveAndForward(requestId, approvalData = {}) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`packingMaterialRequests/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'pending_ho') {
        throw new Error('Request is not in pending HO approval status');
      }

      const updates = {
        status: 'forwarded_to_md',
        hoApprovedBy: currentUser?.uid,
        hoApprovedByName: currentUser?.displayName || currentUser?.email || 'Head of Operations',
        hoApprovedAt: Date.now(),
        hoApprovalComments: approvalData.comments || 'Approved by Head of Operations',
        forwardedToMD: true,
        forwardedAt: Date.now(),
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          hoApproved: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'HeadOfOperations',
            comments: approvalData.comments || 'Approved by Head of Operations'
          },
          forwardedToMD: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'HeadOfOperations'
          }
        }
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Create notification for MD
      await this.createNotification('MainDirector', {
        type: 'packing_material_request_forwarded',
        requestId,
        message: `Packing material request forwarded for final approval`,
        data: { requestType: 'packingMaterial', hoApprovedBy: updates.hoApprovedByName }
      });
      
      // Notify requester about HO approval
      await this.createNotification(request.requestedBy, {
        type: 'request_ho_approved',
        requestId,
        message: `Your packing material request has been approved by HO and forwarded to MD`,
        data: { requestType: 'packingMaterial', materials: request.materials }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to HO approve and forward request: ${error.message}`);
    }
  },

  // HO Reject Request
  async hoRejectRequest(requestId, rejectionData) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`packingMaterialRequests/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      const updates = {
        status: 'ho_rejected',
        rejectedBy: currentUser?.uid,
        rejectedByName: currentUser?.displayName || currentUser?.email || 'Head of Operations',
        rejectedAt: Date.now(),
        rejectionReason: rejectionData.reason || 'Rejected by Head of Operations',
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          hoRejected: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'HeadOfOperations',
            reason: rejectionData.reason || 'Rejected by Head of Operations'
          }
        }
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify requester about rejection
      await this.createNotification(request.requestedBy, {
        type: 'request_ho_rejected',
        requestId,
        message: `Your packing material request has been rejected by HO`,
        data: { requestType: 'packingMaterial', reason: rejectionData.reason, materials: request.materials }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to HO reject request: ${error.message}`);
    }
  },

  // MD Final Approval
  async mdApproveRequest(requestId, approvalData = {}) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`packingMaterialRequests/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'forwarded_to_md') {
        throw new Error('Request is not forwarded to MD for approval');
      }

      const updates = {
        status: 'md_approved',
        mdApprovedBy: currentUser?.uid,
        mdApprovedByName: currentUser?.displayName || currentUser?.email || 'Main Director',
        mdApprovedAt: Date.now(),
        mdApprovalComments: approvalData.comments || 'Approved by Main Director',
        finalApproval: true,
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          mdApproved: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'MainDirector',
            comments: approvalData.comments || 'Approved by Main Director'
          }
        }
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify requester and HO about final approval
      await this.createNotification(request.requestedBy, {
        type: 'request_md_approved',
        requestId,
        message: `Your packing material request has been finally approved by MD`,
        data: { requestType: 'packingMaterial', materials: request.materials }
      });
      
      await this.createNotification(request.hoApprovedBy, {
        type: 'request_md_approved',
        requestId,
        message: `Packing material request you forwarded has been approved by MD`,
        data: { requestType: 'packingMaterial', materials: request.materials }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to MD approve request: ${error.message}`);
    }
  },

  // Create purchase preparation after MD approval
  async createPurchasePreparationAfterApproval(requestId) {
    try {
      const request = await getData(`packingMaterialRequests/${requestId}`);
      if (!request) throw new Error('Request not found');
      
      const { purchasePreparationService } = await import('./purchasePreparationService');
      return await purchasePreparationService.createPurchasePreparation({
        id: requestId,
        type: 'packing_material',
        items: request.materials,
        mdApprovedAt: request.mdApprovedAt,
        mdApprovedBy: request.mdApprovedBy
      });
    } catch (error) {
      throw new Error(`Failed to create purchase preparation: ${error.message}`);
    }
  },

  // MD Reject Request
  async mdRejectRequest(requestId, rejectionData) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`packingMaterialRequests/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      const updates = {
        status: 'md_rejected',
        rejectedBy: currentUser?.uid,
        rejectedByName: currentUser?.displayName || currentUser?.email || 'Main Director',
        rejectedAt: Date.now(),
        rejectionReason: rejectionData.reason || 'Rejected by Main Director',
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          mdRejected: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'MainDirector',
            reason: rejectionData.reason || 'Rejected by Main Director'
          }
        }
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify requester and HO about rejection
      await this.createNotification(request.requestedBy, {
        type: 'request_md_rejected',
        requestId,
        message: `Your packing material request has been rejected by MD`,
        data: { requestType: 'packingMaterial', reason: rejectionData.reason, materials: request.materials }
      });
      
      await this.createNotification(request.hoApprovedBy, {
        type: 'request_md_rejected',
        requestId,
        message: `Packing material request you forwarded has been rejected by MD`,
        data: { requestType: 'packingMaterial', reason: rejectionData.reason, materials: request.materials }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to MD reject request: ${error.message}`);
    }
  },

  // Mark Request as Received (Warehouse Staff)
  async markAsReceived(requestId) {
    try {
      const currentUser = auth.currentUser;
      const updates = {
        status: 'received',
        receivedBy: currentUser?.uid,
        receivedByName: currentUser?.displayName || currentUser?.email || 'Warehouse Staff',
        receivedAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Notify relevant parties
      const request = await getData(`packingMaterialRequests/${requestId}`);
      await this.createNotification('PackingMaterialsStoreManager', {
        type: 'materials_received',
        requestId,
        message: `Materials received for request - ready to add to store`,
        data: { requestType: 'packingMaterial' }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to mark as received: ${error.message}`);
    }
  },

  // Add to Store (Warehouse Staff)
  async addToStore(requestId) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`packingMaterialRequests/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      const updates = {
        status: 'added_to_store',
        addedToStoreBy: currentUser?.uid,
        addedToStoreByName: currentUser?.displayName || currentUser?.email || 'Warehouse Staff',
        addedToStoreAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      
      // Update stock levels for each material
      if (request.materials) {
        for (const material of request.materials) {
          // Add to packing materials stock
          const stockPath = `packingMaterialsStock/${material.materialId}`;
          const currentStock = await getData(stockPath);
          
          // Ensure quantities are valid numbers
          const currentQuantity = Number(currentStock?.quantity) || 0;
          const materialQuantity = Number(material.requestedQuantity) || 0;
          
          if (currentStock) {
            await updateData(stockPath, {
              quantity: currentQuantity + materialQuantity,
              lastUpdated: Date.now(),
              updatedBy: currentUser?.uid
            });
          } else {
            await setData(stockPath, {
              materialId: material.materialId,
              materialName: material.materialName,
              quantity: materialQuantity,
              unit: material.unit,
              lastUpdated: Date.now(),
              createdBy: currentUser?.uid
            });
          }
          
          // Also update the main material record's currentStock
          const materialData = await getData(`packingMaterials/${material.materialId}`);
          if (materialData) {
            const materialCurrentStock = Number(materialData.currentStock) || 0;
            await updateData(`packingMaterials/${material.materialId}`, {
              currentStock: materialCurrentStock + materialQuantity,
              lastUpdated: Date.now(),
              updatedBy: currentUser?.uid
            });
          }
        }
      }
      
      // Notify relevant parties
      await this.createNotification('PackingMaterialsStoreManager', {
        type: 'materials_added_to_store',
        requestId,
        message: `Materials from request have been added to store inventory`,
        data: { requestType: 'packingMaterial' }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to add to store: ${error.message}`);
    }
  },

  // Get packing material request by ID
  async getById(requestId) {
    try {
      const request = await getData(`packingMaterialRequests/${requestId}`);
      if (!request) {
        throw new Error('Request not found');
      }
      return { id: requestId, ...request };
    } catch (error) {
      throw new Error(`Failed to fetch request: ${error.message}`);
    }
  },

  // Update request status
  async updateStatus(requestId, status) {
    try {
      const updates = {
        status,
        updatedAt: Date.now()
      };
      
      await updateData(`packingMaterialRequests/${requestId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  },

  // Create Notification
  async createNotification(recipientRole, notificationData) {
    try {
      // Get users with the specified role
      const users = await getData('users').catch(() => null);
      if (!users) {
        console.warn('Unable to access users data for notifications, skipping notification creation');
        return;
      }

      const targetUsers = Object.entries(users).filter(([_, user]) => {
        if (typeof recipientRole === 'string' && recipientRole.includes('@')) {
          // Direct user ID notification
          return false;
        }
        return user.role === recipientRole;
      });

      // If recipientRole is a user ID, send directly
      if (typeof recipientRole === 'string' && !recipientRole.includes('Operations') && !recipientRole.includes('Director')) {
        try {
          await pushData(`notifications/${recipientRole}`, {
            ...notificationData,
            status: 'unread',
            createdAt: Date.now()
          });
        } catch (error) {
          console.warn('Failed to create direct notification:', error.message);
        }
        return;
      }

      // Send to all users with the role
      for (const [userId, _] of targetUsers) {
        try {
          await pushData(`notifications/${userId}`, {
            ...notificationData,
            status: 'unread',
            createdAt: Date.now()
          });
        } catch (error) {
          console.warn(`Failed to create notification for user ${userId}:`, error.message);
        }
      }
    } catch (error) {
      console.warn('Failed to create notification:', error.message);
    }
  },

  // Get requests by current user
  async getMyRequests() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return [];

      const requests = await this.getPackingMaterialRequests({ requestedBy: currentUser.uid });
      return requests;
    } catch (error) {
      throw new Error(`Failed to fetch user requests: ${error.message}`);
    }
  },

  // Get requests for HO approval
  async getRequestsForHOApproval() {
    try {
      return await this.getPackingMaterialRequests({ status: 'pending_ho' });
    } catch (error) {
      throw new Error(`Failed to fetch requests for HO approval: ${error.message}`);
    }
  },

  // Get requests for MD approval
  async getRequestsForMDApproval() {
    try {
      return await this.getPackingMaterialRequests({ status: 'forwarded_to_md' });
    } catch (error) {
      throw new Error(`Failed to fetch requests for MD approval: ${error.message}`);
    }
  }
};