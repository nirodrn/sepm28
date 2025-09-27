import { loginUser, logoutUser } from '../firebase/auth';
import { getUserByUid } from '../firebase/db';

export const authenticateUser = async (email, password) => {
  try {
    const user = await loginUser(email, password);
    const userData = await getUserByUid(user.uid);
    
    if (!userData) {
      throw new Error('User data not found');
    }

    if (userData.status !== 'active') {
      throw new Error('Account is not active');
    }

    return { user, userData };
  } catch (error) {
    throw error;
  }
};

export const logoutCurrentUser = async () => {
  try {
    await logoutUser();
  } catch (error) {
    throw error;
  }
};