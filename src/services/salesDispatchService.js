import { ref, get, update, push } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '../firebase/firebaseConfig';

const database = getDatabase(app);

export const getApprovedSalesRequests = async () => {
  try {
    const historyRef = ref(database, 'salesApprovalHistory');
    const snapshot = await get(historyRef);
    if (!snapshot.exists()) return [];
    
    const approvedRequests = [];
    snapshot.forEach((child) => {
      const request = child.val();
      // Only include approved requests that haven't been dispatched yet
      if (request.status === 'Approved' && !request.isDispatched) {
        approvedRequests.push({ 
          ...request, 
          id: child.key,
          remainingQuantities: { ...request.items } // Copy original quantities for tracking remaining amounts
        });
      }
    });
    
    return approvedRequests;
  } catch (error) {
    console.error('Error fetching approved sales requests:', error);
    throw error;
  }
};

export const dispatchRequest = async (requestId, dispatchData) => {
  try {
    const { items, dispatchedBy, dispatchedByName, dispatchedByRole, notes } = dispatchData;
    
    // Validate dispatch quantities against approved quantities
    const requestRef = ref(database, `salesApprovalHistory/${requestId}`);
    const snapshot = await get(requestRef);
    if (!snapshot.exists()) {
      throw new Error('Request not found');
    }

    const request = snapshot.val();
    const approvedItems = request.items;

    // Verify quantities don't exceed approved amounts
    for (const [itemId, dispatchItem] of Object.entries(items)) {
      const approvedQty = approvedItems[itemId]?.qty || 0;
      if (dispatchItem.qty > approvedQty) {
        throw new Error(`Dispatch quantity for ${dispatchItem.name} exceeds approved quantity`);
      }
    }

    const updates = {};
    
    // Create dispatch record
    const dispatchHistoryRef = push(ref(database, 'dispatchHistory'));
    const dispatchRecord = {
      requestId,
      dispatchedAt: Date.now(),
      items,
      dispatchedBy,
      dispatchedByName,
      dispatchedByRole,
      notes,
      originalRequestType: request.requestType,
      requesterId: request.requesterId,
      requesterName: request.requesterName,
      requesterRole: request.requesterRole,
      type: request.type
    };
    
    updates[`/dispatchHistory/${dispatchHistoryRef.key}`] = dispatchRecord;
    
    // Check if all items have been fully dispatched
    let isFullyDispatched = true;
    const existingDispatches = await getRequestDispatches(requestId);
    const totalDispatchedQty = {};
    
    // Sum up existing dispatched quantities
    existingDispatches.forEach(dispatch => {
      Object.entries(dispatch.items).forEach(([itemId, item]) => {
        totalDispatchedQty[itemId] = (totalDispatchedQty[itemId] || 0) + item.qty;
      });
    });
    
    // Add current dispatch quantities
    Object.entries(items).forEach(([itemId, item]) => {
      totalDispatchedQty[itemId] = (totalDispatchedQty[itemId] || 0) + item.qty;
    });
    
    // Check if any items still have remaining quantity
    Object.entries(approvedItems).forEach(([itemId, item]) => {
      const totalDispatched = totalDispatchedQty[itemId] || 0;
      if (totalDispatched < item.qty) {
        isFullyDispatched = false;
      }
    });
    
    // Update request status if fully dispatched
    if (isFullyDispatched) {
      updates[`/salesApprovalHistory/${requestId}/status`] = 'Dispatched';
      updates[`/salesApprovalHistory/${requestId}/isDispatched`] = true;
      updates[`/salesApprovalHistory/${requestId}/fullyDispatchedAt`] = Date.now();
    }
    
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error dispatching request:', error);
    throw error;
  }
};

export const getRequestDispatches = async (requestId) => {
  try {
    const dispatchRef = ref(database, 'dispatchHistory');
    const snapshot = await get(dispatchRef);
    if (!snapshot.exists()) return [];
    
    const dispatches = [];
    snapshot.forEach((child) => {
      const dispatch = child.val();
      if (dispatch.requestId === requestId) {
        dispatches.push({ ...dispatch, id: child.key });
      }
    });
    
    return dispatches;
  } catch (error) {
    console.error('Error fetching request dispatches:', error);
    throw error;
  }
};