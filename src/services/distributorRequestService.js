import { ref, get, update, push } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '../firebase/firebaseConfig';

const database = getDatabase(app);

// Request types
const REQUEST_TYPES = {
  DISTRIBUTOR: 'distributorReqs',
  DIRECT_REP: 'drreqs',
  DIRECT_SHOP: 'dsreqs'
};

export const getDistributorRequests = async () => {
  try {
    // Fetch all types of requests
    const [distributorSnapshot, drSnapshot, dsSnapshot] = await Promise.all([
      get(ref(database, REQUEST_TYPES.DISTRIBUTOR)),
      get(ref(database, REQUEST_TYPES.DIRECT_REP)),
      get(ref(database, REQUEST_TYPES.DIRECT_SHOP))
    ]);
    
    const requests = [];

    // Add distributor requests
    if (distributorSnapshot.exists()) {
      distributorSnapshot.forEach((child) => {
        const data = child.val();
        requests.push({ 
          ...data,
          requestType: 'distributor',
          items: data.items || {},
          priority: data.priority || 'normal'
        });
      });
    }

    // Add direct representative requests
    if (drSnapshot.exists()) {
      drSnapshot.forEach((child) => {
        const data = child.val();
        requests.push({ 
          ...data,
          requestType: 'direct_representative',
          items: data.items || {},
          priority: data.priority || 'normal'
        });
      });
    }

    // Add direct shop requests
    if (dsSnapshot.exists()) {
      dsSnapshot.forEach((child) => {
        const data = child.val();
        requests.push({ 
          ...data,
          requestType: 'direct_shop',
          priority: data.urgent ? 'urgent' : 'normal',
          // Normalize structure to match other request types
          items: {
            [data.product]: {
              name: data.product,
              qty: data.quantity
            }
          },
          createdAt: new Date(data.date).getTime(),
          updatedAt: new Date(data.date).getTime(),
          requestedByRole: 'DirectShop'
        });
      });
    }

    return requests;
  } catch (error) {
    console.error('Error fetching sales requests:', error);
    throw error;
  }
};

export const approveRequest = async (requestId, requestData) => {
  try {
    // Determine request path based on request type
    let requestPath;
    if (requestData.requestedByRole === 'DirectRepresentative') {
      requestPath = REQUEST_TYPES.DIRECT_REP;
    } else if (requestData.requestedByRole === 'DirectShop') {
      requestPath = REQUEST_TYPES.DIRECT_SHOP;
    } else {
      requestPath = REQUEST_TYPES.DISTRIBUTOR;
    }

    // Update request status
    const updates = {};
    updates[`/${requestPath}/${requestId}/status`] = 'Approved';
    updates[`/${requestPath}/${requestId}/updatedAt`] = Date.now();

    // Add to approval history with detailed information
    const historyData = {
      requestId,
      approvedAt: Date.now(),
      items: requestData.items,
      requesterId: requestData.requestedBy,
      requesterName: requestData.requestedByName,
      requesterRole: requestData.requestedByRole,
      requestType: requestData.requestedByRole === 'DirectShop' ? 'direct_shop' : 
                  requestData.requestedByRole === 'DirectRepresentative' ? 'direct_representative' : 
                  'distributor',
      priority: requestData.priority,
      notes: requestData.notes,
      status: 'Approved',
      approvedBy: requestData.approvedBy || '', // ID of the approver
      approverName: requestData.approverName || '', // Name of the approver
      approverRole: requestData.approverRole || '', // Role of the approver (HO/MD)
      totalQuantity: Object.values(requestData.items).reduce((sum, item) => sum + item.qty, 0),
      type: requestData.requestedByRole === 'DirectShop' ? 'direct_shop_sale' :
            requestData.requestedByRole === 'DirectRepresentative' ? 'direct_rep_sale' :
            'distributor_sale'
    };

    const historyRef = ref(database, 'salesApprovalHistory');
    const newHistoryRef = push(historyRef);
    updates[`/salesApprovalHistory/${newHistoryRef.key}`] = historyData;

    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error approving distributor request:', error);
    throw error;
  }
};

export const rejectRequest = async (requestId, requestData) => {
  try {
    // Determine request path based on request type
    let requestPath;
    if (requestData.requestedByRole === 'DirectRepresentative') {
      requestPath = REQUEST_TYPES.DIRECT_REP;
    } else if (requestData.requestedByRole === 'DirectShop') {
      requestPath = REQUEST_TYPES.DIRECT_SHOP;
    } else {
      requestPath = REQUEST_TYPES.DISTRIBUTOR;
    }

    const updates = {
      [`/${requestPath}/${requestId}/status`]: 'Rejected',
      [`/${requestPath}/${requestId}/updatedAt`]: Date.now()
    };
    
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error('Error rejecting request:', error);
    throw error;
  }
};

export const getApprovalHistory = async () => {
  try {
    const historyRef = ref(database, 'salesApprovalHistory');
    const snapshot = await get(historyRef);
    if (!snapshot.exists()) return [];
    
    const history = [];
    snapshot.forEach((child) => {
      history.push({ ...child.val(), id: child.key });
    });
    return history;
  } catch (error) {
    console.error('Error fetching approval history:', error);
    throw error;
  }
};