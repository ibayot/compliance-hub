package com.dswd.fo2icare.launcher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/** Displays generic FO2 iCare alerts while the TWA is in the foreground. */
public final class FcmMessageService extends FirebaseMessagingService {
    public static final String CHANNEL_ID = "fo2_icare_alerts";

    public static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.fo2_icare_notification_channel_name),
                NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("FO2 iCare application alerts");
        channel.setShowBadge(true);
        channel.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
        manager.createNotificationChannel(channel);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);
        ensureNotificationChannel(this);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || !manager.areNotificationsEnabled()) return;

        int unreadCount = 0;
        try {
            unreadCount = Math.max(0, Integer.parseInt(message.getData().getOrDefault("unreadCount", "0")));
        } catch (NumberFormatException ignored) {
            // The alert remains useful even if an optional badge count is malformed.
        }

        Intent launchIntent = new Intent(this, CertificateSetupActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.hub_notification)
                .setColor(getColor(R.color.fo2_icare_notification_color))
                .setContentTitle("FO2 iCare")
                .setContentText("You have a new notification.")
                .setNumber(unreadCount)
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setDefaults(Notification.DEFAULT_SOUND | Notification.DEFAULT_VIBRATE)
                .build();
        try {
            manager.notify((int) (System.currentTimeMillis() & 0x7fffffff), notification);
        } catch (SecurityException ignored) {
            // Android notification permission can be revoked while the app is running.
        }
    }
}
