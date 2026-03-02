import Notification from '../models/Notification.js';
import User from '../models/User.js'; // Assuming you might need user details for email
import { sendEmail } from './email.service.js';

export const createNotification = async (data) => {
  try {
    // 1. Save to Database
    const notification = new Notification(data);
    await notification.save();

    // 2. Helper to update email status
    const updateEmailStatus = async (status) => {
      notification.emailStatus = status;
      await notification.save();
    };

    // 3. Send Email if requested
    if (data.channel === 'email' || data.channel === 'all') {
      // checking if it implies email
      // We might need to fetch the user's email if not provided in data
      // But usually notification is linked to a userId
      const user = await User.findById(data.userId);

      if (user && user.email) {
        const htmlContent = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                      <h2 style="color: white; margin: 0;">${data.titre}</h2>
                    </div>
                    <div style="padding: 20px; background-color: #f9f9f9; color: #333; line-height: 1.6;">
                      <p style="font-size: 16px;">Bonjour,</p>
                      <p style="font-size: 16px;">${data.message}</p>
                      ${
                        data.data && data.data.url
                          ? `<div style="text-align: center; margin-top: 30px;">
                        <a href="${data.data.url}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Voir les détails</a>
                      </div>`
                          : ''
                      }
                    </div>
                    <div style="background-color: #eee; padding: 10px; text-align: center; font-size: 12px; color: #777;">
                      <p>Ceci est une notification automatique, merci de ne pas répondre.</p>
                    </div>
                  </div>
                `;

        const emailResult = await sendEmail(user.email, data.titre, htmlContent);

        if (emailResult.success) {
          await updateEmailStatus('sent');
        } else {
          await updateEmailStatus('failed');
        }
      } else {
        console.warn(`User ${data.userId} has no email or not found for notification.`);
        await updateEmailStatus('failed');
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const getUserNotifications = async (userId) => {
  return Notification.find({ userId }).sort({ createdAt: -1 });
};

export const markNotificationAsRead = async (notificationId) => {
  return Notification.findByIdAndUpdate(
    notificationId,
    { lu: true, lueAt: new Date() },
    { new: true },
  );
};

export const deleteNotification = async (notificationId) => {
  return Notification.findByIdAndDelete(notificationId);
};
