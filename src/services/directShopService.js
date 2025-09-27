import { getData, setData, updateData, pushData } from '../firebase/db';
import { auth } from '../firebase/auth';

export const directShopService = {
  // Get direct shop requests from Firebase table
  async getDirectShopRequests(filters = {}) {
    try {
      const requests = await getData('dsreqs');
      if (!requests) return [];
      
      let filteredRequests = Object.entries(requests).map(([id, request]) => ({
        id,
        ...request
      }));

      if (filters.status) {
        filteredRequests = filteredRequests.filter(req => req.status === filters.status);
      }
      
      if (filters.shopId) {
        filteredRequests = filteredRequests.filter(req => req.shopId === filters.shopId);
      }

      return filteredRequests.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch direct shop requests: ${error.message}`);
    }
  },

  // Get all direct shop requests for MD review
  async getAllDirectShopRequests() {
    try {
      const requests = await getData('dsreqs');
      if (!requests) return [];
      
      return Object.entries(requests).map(([id, request]) => ({
        id,
        ...request,
        // Convert date string to timestamp for consistent sorting
        createdAt: request.date ? new Date(request.date).getTime() : Date.now()
      })).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to fetch all direct shop requests: ${error.message}`);
    }
  },

  // MD Approve and Forward to HO
  async mdApproveRequest(requestId, approvalData = {}) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`dsreqs/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Request is not pending MD approval');
      }

      const updates = {
        status: 'md_approved_forwarded_to_ho',
        mdApprovedBy: currentUser?.uid,
        mdApprovedByName: currentUser?.displayName || currentUser?.email || 'Main Director',
        mdApprovedAt: Date.now(),
        mdApprovalComments: approvalData.comments || 'Approved by Main Director',
        forwardedToHO: true,
        forwardedToHOAt: Date.now(),
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          mdApproved: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'MainDirector',
            comments: approvalData.comments || 'Approved by Main Director'
          },
          forwardedToHO: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'MainDirector'
          }
        }
      };
      
      await updateData(`dsreqs/${requestId}`, updates);
      
      // Notify HO
      await this.createNotification('HeadOfOperations', {
        type: 'direct_shop_request_forwarded',
        requestId,
        message: `Direct shop request forwarded by MD for final approval`,
        data: { 
          requestType: 'direct_shop',
          shopName: request.shopName || request.requestedByName,
          mdApprovedBy: updates.mdApprovedByName,
          product: request.product,
          quantity: request.quantity
        }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to MD approve request: ${error.message}`);
    }
  },

  // HO Final Approval and Forward to FG Store
  async hoApproveAndForwardToFG(requestId, approvalData = {}) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`dsreqs/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'md_approved_forwarded_to_ho') {
        throw new Error('Request is not forwarded by MD for HO approval');
      }

      const updates = {
        status: 'ho_approved_forwarded_to_fg',
        hoApprovedBy: currentUser?.uid,
        hoApprovedByName: currentUser?.displayName || currentUser?.email || 'Head of Operations',
        hoApprovedAt: Date.now(),
        hoApprovalComments: approvalData.comments || 'Approved by Head of Operations',
        forwardedToFG: true,
        forwardedToFGAt: Date.now(),
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          hoApproved: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'HeadOfOperations',
            comments: approvalData.comments || 'Approved by Head of Operations'
          },
          forwardedToFG: {
            by: currentUser?.uid,
            at: Date.now(),
            role: 'HeadOfOperations'
          }
        }
      };
      
      await updateData(`dsreqs/${requestId}`, updates);
      
      // Notify FG Store Manager
      await this.createNotification('FinishedGoodsStoreManager', {
        type: 'direct_shop_request_approved',
        requestId,
        message: `Direct shop request approved - ready for dispatch`,
        data: { 
          requestType: 'direct_shop_approved',
          shopName: request.shopName || request.requestedByName,
          hoApprovedBy: updates.hoApprovedByName,
          product: request.product,
          quantity: request.quantity
        }
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to HO approve request: ${error.message}`);
    }
  },


  // Process direct shop request dispatch
  async processDirectShopDispatch(requestId, dispatchData) {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`dsreqs/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.status !== 'ho_approved_forwarded_to_fg') {
        throw new Error('Request is not approved for dispatch');
      }

      // Create external dispatch record
      const { fgDispatchToExternalService } = await import('./fgDispatchToExternalService');
      
      const dispatchPayload = {
        requestId: requestId,
        recipientType: 'direct_shop',
        recipientId: request.requestedBy,
        recipientName: request.requestedByName,
        recipientRole: 'shop_owner',
        recipientLocation: request.shopLocation || 'Unknown Location',
        recipientContact: request.shopContact || '',
        shopName: request.shopName || request.requestedByName,
        items: [{
          productId: request.productId || 'unknown',
          productName: request.product,
          quantity: request.quantity,
          unit: 'units',
          unitPrice: dispatchData.unitPrice || 0,
          type: 'units'
        }],
        notes: dispatchData.notes || `Dispatch for direct shop request ${requestId}`,
        expectedDeliveryDate: dispatchData.expectedDeliveryDate,
        priority: request.urgent ? 'urgent' : 'normal'
      };
      
      const dispatch = await fgDispatchToExternalService.dispatchToExternal(dispatchPayload);
      
      // Update request status
      await updateData(`dsreqs/${requestId}`, {
        status: 'dispatched',
        dispatchId: dispatch.dispatchId,
        dispatchedAt: Date.now(),
        dispatchedBy: currentUser?.uid,
        dispatchedByName: currentUser?.displayName || currentUser?.email || 'FG Store Manager',
        releaseCode: dispatch.releaseCode,
        updatedAt: Date.now()
      });
      
      // Notify mobile app
      await this.notifyMobileApp(requestId, 'dispatched', {
        releaseCode: dispatch.releaseCode,
        dispatchId: dispatch.dispatchId
      });
      
      return dispatch;
    } catch (error) {
      throw new Error(`Failed to process dispatch: ${error.message}`);
    }
  },

  // Reject Request (MD or HO)
  async rejectRequest(requestId, rejectionData, rejectedBy = 'MD') {
    try {
      const currentUser = auth.currentUser;
      const request = await getData(`dsreqs/${requestId}`);
      
      if (!request) {
        throw new Error('Request not found');
      }

      const updates = {
        status: rejectedBy === 'MD' ? 'md_rejected' : 'ho_rejected',
        rejectedBy: currentUser?.uid,
        rejectedByName: currentUser?.displayName || currentUser?.email || rejectedBy,
        rejectedAt: Date.now(),
        rejectionReason: rejectionData.reason || `Rejected by ${rejectedBy}`,
        updatedAt: Date.now(),
        workflow: {
          ...request.workflow,
          rejected: {
            by: currentUser?.uid,
            at: Date.now(),
            role: rejectedBy === 'MD' ? 'MainDirector' : 'HeadOfOperations',
            reason: rejectionData.reason || `Rejected by ${rejectedBy}`
          }
        }
      };
      
      await updateData(`dsreqs/${requestId}`, updates);
      
      // Notify mobile app about rejection
      await this.notifyMobileApp(requestId, 'rejected', {
        reason: rejectionData.reason,
        rejectedBy: rejectedBy
      });
      
      return updates;
    } catch (error) {
      throw new Error(`Failed to reject request: ${error.message}`);
    }
  },

  // Create notification
  async createNotification(recipientRole, notificationData) {
    try {
      const users = await getData('users');
      if (!users) return;

      const targetUsers = Object.entries(users).filter(([_, user]) => {
        return user.role === recipientRole;
      });

      for (const [userId, _] of targetUsers) {
        await pushData(`notifications/${userId}`, {
          ...notificationData,
          status: 'unread',
          createdAt: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }
  },

  // Update request status
  async updateRequestStatus(requestId, status, additionalData = {}) {
    try {
      const updates = {
        status,
        updatedAt: Date.now(),
        ...additionalData
      };
      
      await updateData(`dsreqs/${requestId}`, updates);
      return updates;
    } catch (error) {
      throw new Error(`Failed to update request status: ${error.message}`);
    }
  },

  // Notify mobile app about status changes
  async notifyMobileApp(requestId, status, additionalData = {}) {
    try {
      const notification = {
        requestId,
        status,
        timestamp: Date.now(),
        ...additionalData
      };
      
      await pushData(`mobileNotifications/${requestId}`, notification);
    } catch (error) {
      console.error('Failed to notify mobile app:', error);
    }
  }
};