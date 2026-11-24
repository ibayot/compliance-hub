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
    private static final String PREVIOUS_ROUTINE_CHANNEL = "fo2_icare_notifications_v2";
    private static final String ROUTINE_CHANNEL = "fo2_icare_notifications_v3";
    private static final String TEST_CHANNEL = "fo2_icare_test_alerts_v2";
    private static final String NEARING_CHANNEL = "fo2_icare_nearing_sla_v2";
    private static final String OVERDUE_CHANNEL = "fo2_icare_overdue_sla_v2";
    private static final int UNREAD_NOTIFICATION = 7101;
    private static final String BADGE_PREFERENCES = "notification_badge";
    private static final String LAST_COUNT_AT = "last_count_at";

    static NotificationChannel routineChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return manager == null ? null : manager.getNotificationChannel(ROUTINE_CHANNEL);
    }

    public static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        createChannel(context, manager, LEGACY_CHANNEL, null, "FO2 iCare Alerts", "routine", true);
        createChannel(context, manager, ROUTINE_CHANNEL, PREVIOUS_ROUTINE_CHANNEL, "FO2 iCare Notifications", "routine", true);
        createChannel(context, manager, TEST_CHANNEL, "fo2_icare_test_alerts", "Test alerts", "routine", false);
        createChannel(context, manager, NEARING_CHANNEL, "fo2_icare_nearing_sla", "Nearing SLA", "nearing", false);
        createChannel(context, manager, OVERDUE_CHANNEL, "fo2_icare_overdue_sla", "Overdue SLA", "overdue", false);
    }

    private static void createChannel(Context context, NotificationManager manager, String id,
            String previousId, String label, String sound, boolean badge) {
        if (manager.getNotificationChannel(id) != null) return;
        NotificationChannel previous = previousId == null ? null : manager.getNotificationChannel(previousId);
        int importance = previous == null ? NotificationManager.IMPORTANCE_DEFAULT : previous.getImportance();
        NotificationChannel channel = new NotificationChannel(id, label, importance);
        channel.setShowBadge(badge && (previous == null || previous.canShowBadge()));
        Uri soundUri = NotificationSoundProvider.soundUri(context, sound);
        if (previous != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && previous.hasUserSetSound()) {
            soundUri = previous.getSound();
        }
        channel.setSound(soundUri, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
        manager.createNotificationChannel(channel);
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
                    updateUnread(manager, kind, data, message.getSentTime());
                    break;
                case "test":
                    manager.notify(7102, notification(TEST_CHANNEL, "routine",
                            "Your test alert arrived on this device.").setAutoCancel(true).build());
                    break;
                case "nearing_sla":
                    manager.notify(7103, notification(NEARING_CHANNEL, "nearing",
                            "You have an SLA reminder.").setAutoCancel(true).build());
                    break;
                case "overdue_sla":
                    manager.notify(7104, notification(OVERDUE_CHANNEL, "overdue",
                            "You have an SLA reminder.").setAutoCancel(true).build());
                    break;
                default:
                    break;
            }
        } catch (SecurityException ignored) {
            // Android notification permission can be revoked while the app is running.
        }
    }

    private void updateUnread(NotificationManager manager, String kind, Map<String, String> data, long sentAt) {
        int count;
        long at;
        try {
            count = Integer.parseInt(data.getOrDefault("unreadCount", "0"));
            at = Long.parseLong(data.getOrDefault("countAt", Long.toString(sentAt)));
        } catch (NumberFormatException ignored) {
            return;
        }
        android.content.SharedPreferences preferences = getSharedPreferences(BADGE_PREFERENCES, MODE_PRIVATE);
        if (at < preferences.getLong(LAST_COUNT_AT, 0)) return;
        preferences.edit().putLong(LAST_COUNT_AT, at).apply();
        boolean hasSummary = false;
        for (StatusBarNotification active : manager.getActiveNotifications()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                String channel = active.getNotification().getChannelId();
                if (LEGACY_CHANNEL.equals(channel) || PREVIOUS_ROUTINE_CHANNEL.equals(channel)) {
                    manager.cancel(active.getTag(), active.getId());
                    continue;
                }
            }
            if (active.getTag() == null && active.getId() == UNREAD_NOTIFICATION) hasSummary = true;
        }
        if (count <= 0) {
            manager.cancel(UNREAD_NOTIFICATION);
            return;
        }
        NotificationCompat.Builder alert = notification(ROUTINE_CHANNEL, "routine",
                "You have unread notifications.").setNumber(count);
        if ("badge_sync".equals(kind)) {
            // Keep an existing summary ungrouped so launchers can continue to badge it.
            if (hasSummary) alert.setOnlyAlertOnce(true);
            else alert.setSilent(true);
        }
        manager.notify(UNREAD_NOTIFICATION, alert.build());
    }

    private NotificationCompat.Builder notification(String channel, String sound, String body) {
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
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) builder.setSound(NotificationSoundProvider.soundUri(this, sound));
        return builder;
    }
}
