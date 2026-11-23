package com.dswd.fo2icare.launcher;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.provider.Settings;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresPermission;

import com.google.androidbrowserhelper.trusted.DelegationService;

import java.util.Locale;

/** Sets up the Android channel used by the existing browser notification delegation. */
public final class HubNotificationService extends DelegationService {
    @Override
    @RequiresPermission(Manifest.permission.POST_NOTIFICATIONS)
    public boolean onNotifyNotificationWithChannel(@NonNull String platformTag, int platformId,
            @NonNull Notification notification, @NonNull String channelName) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            // Use AndroidX's channel ID so upgrades keep the user's existing channel choices.
            String channelId = channelName.toLowerCase(Locale.ROOT).replace(' ', '_') + "_channel_id";
            if (manager != null && manager.areNotificationsEnabled() && manager.getNotificationChannel(channelId) == null) {
                NotificationChannel channel = new NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_DEFAULT);
                channel.setShowBadge(true);
                channel.setSound(Settings.System.DEFAULT_NOTIFICATION_URI, new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                manager.createNotificationChannel(channel);
            }
        }
        return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, channelName);
    }
}
