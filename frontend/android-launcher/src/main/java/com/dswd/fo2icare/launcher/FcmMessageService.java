package com.dswd.fo2icare.launcher;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.service.notification.StatusBarNotification;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Handles native FO2 iCare alerts and the unread notification shown to Android launchers. */
public final class FcmMessageService extends FirebaseMessagingService {
    private static final String LEGACY_CHANNEL = "fo2_icare_alerts";
    private static final String ROUTINE_CHANNEL = "fo2_icare_notifications_v2";
    private static final String TEST_CHANNEL = "fo2_icare_test_alerts";
    private static final String NEARING_CHANNEL = "fo2_icare_nearing_sla";
    private static final String OVERDUE_CHANNEL = "fo2_icare_overdue_sla";
    private static final int UNREAD_NOTIFICATION = 7101;
    private static final String BADGE_PREFERENCES = "notification_badge";
    private static final String LAST_COUNT_AT = "last_count_at";

    public static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        createChannel(context, manager, LEGACY_CHANNEL, "FO2 iCare Alerts", R.raw.routine_notification, true);
        createChannel(context, manager, ROUTINE_CHANNEL, "FO2 iCare Notifications", R.raw.routine_notification, true);
        createChannel(context, manager, TEST_CHANNEL, "Test alerts", R.raw.routine_notification, false);
        createChannel(context, manager, NEARING_CHANNEL, "Nearing SLA", R.raw.nearing_sla, false);
        createChannel(context, manager, OVERDUE_CHANNEL, "Overdue SLA", R.raw.overdue_sla, false);
    }

    private static void createChannel(Context context, NotificationManager manager, String id,
            String label, int sound, boolean badge) {
        if (manager.getNotificationChannel(id) != null) return;
        NotificationChannel channel = new NotificationChannel(id, label, NotificationManager.IMPORTANCE_DEFAULT);
        channel.setShowBadge(badge);
        channel.setSound(soundUri(context, sound), new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        manager.createNotificationChannel(channel);
    }

    private static Uri soundUri(Context context, int sound) {
        return new Uri.Builder().scheme("android.resource").authority(context.getPackageName())
                .appendPath("raw").appendPath(context.getResources().getResourceEntryName(sound)).build();
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        super.onMessageReceived(message);
        ensureNotificationChannel(this);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null || !manager.areNotificationsEnabled()) return;

        Map<String, String> data = message.getData();
        String kind = data.getOrDefault("kind", "notification");
        try {
            switch (kind) {
                case "badge_sync":
                case "notification":
                    updateUnread(manager, kind, data);
                    break;
                case "test":
                    manager.notify(7102, notification(TEST_CHANNEL, R.raw.routine_notification,
                            "Your test alert arrived on this device.").setAutoCancel(true).build());
                    break;
                case "nearing_sla":
                    manager.notify(7103, notification(NEARING_CHANNEL, R.raw.nearing_sla,
                            "You have an SLA reminder.").setAutoCancel(true).build());
                    break;
                case "overdue_sla":
                    manager.notify(7104, notification(OVERDUE_CHANNEL, R.raw.overdue_sla,
                            "You have an SLA reminder.").setAutoCancel(true).build());
                    break;
                default:
                    break;
            }
        } catch (SecurityException ignored) {
            // Android notification permission can be revoked while the app is running.
        }
    }

    private void updateUnread(NotificationManager manager, String kind, Map<String, String> data) {
        int count;
        long at;
        try {
            count = Integer.parseInt(data.getOrDefault("unreadCount", "0"));
            at = Long.parseLong(data.getOrDefault("countAt", "0"));
        } catch (NumberFormatException ignored) {
            return;
        }
        android.content.SharedPreferences preferences = getSharedPreferences(BADGE_PREFERENCES, MODE_PRIVATE);
        if (at < preferences.getLong(LAST_COUNT_AT, 0)) return;
        preferences.edit().putLong(LAST_COUNT_AT, at).apply();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            for (StatusBarNotification active : manager.getActiveNotifications()) {
                if (LEGACY_CHANNEL.equals(active.getNotification().getChannelId())) {
                    manager.cancel(active.getTag(), active.getId());
                }
            }
        }
        if (count <= 0) {
            manager.cancel(UNREAD_NOTIFICATION);
            return;
        }
        NotificationCompat.Builder alert = notification(ROUTINE_CHANNEL, R.raw.routine_notification,
                "You have unread notifications.").setNumber(count);
        if ("badge_sync".equals(kind)) alert.setSilent(true).setOnlyAlertOnce(true);
        manager.notify(UNREAD_NOTIFICATION, alert.build());
    }

    private NotificationCompat.Builder notification(String channel, int sound, String body) {
        Intent launchIntent = new Intent(this, CertificateSetupActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channel)
                .setSmallIcon(R.drawable.hub_notification)
                .setColor(getColor(R.color.fo2_icare_notification_color))
                .setContentTitle("FO2 iCare").setContentText(body).setContentIntent(contentIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) builder.setSound(soundUri(this, sound));
        return builder;
    }
}
