import { useState, useEffect } from 'react';
import { subscribeToData } from '../firebase/db';
import { useAuth } from './useAuth';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToData(`notifications/${user.uid}`, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const notificationList = Object.entries(data).map(([id, notification]) => ({
            id,
            ...notification
          })).sort((a, b) => b.createdAt - a.createdAt);
          
          setNotifications(notificationList);
          setUnreadCount(notificationList.filter(n => n.status === 'unread').length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (notificationId) => {
    try {
      await updateData(`notifications/${user.uid}/${notificationId}`, {
        status: 'read',
        readAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updates = {};
      notifications.forEach(notification => {
        if (notification.status === 'unread') {
          updates[`notifications/${user.uid}/${notification.id}/status`] = 'read';
          updates[`notifications/${user.uid}/${notification.id}/readAt`] = Date.now();
        }
      });
      
      await updateData('/', updates);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
};