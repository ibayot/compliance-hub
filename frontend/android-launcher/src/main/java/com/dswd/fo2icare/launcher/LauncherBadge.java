package com.dswd.fo2icare.launcher;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import java.util.LinkedHashSet;
import java.util.Set;

/** Best-effort badge updates for launchers with a separate unread-count interface. */
final class LauncherBadge {
    private static final String VIVO_BADGE_ACTION = "launcher.action.CHANGE_APPLICATION_NOTIFICATION_NUM";
    private static final String VIVO_BADGE_PERMISSION = "com.vivo.notification.permission.BADGE_ICON";
    private static final String[] VIVO_LAUNCHERS = {
        "com.vivo.launcher", "com.bbk.launcher2", "com.bbk.launcher3", "com.bbk.launcher"
    };

    private LauncherBadge() {}

    private static String systemHomePackage(Context context) {
        ResolveInfo home = context.getPackageManager().resolveActivity(
                new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
                PackageManager.MATCH_DEFAULT_ONLY);
        if (home == null || home.activityInfo == null || !isSystemApp(home.activityInfo.applicationInfo)) return null;
        return home.activityInfo.packageName;
    }

    private static boolean isSystemApp(ApplicationInfo app) {
        int systemFlags = ApplicationInfo.FLAG_SYSTEM | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP;
        return app != null && (app.flags & systemFlags) != 0;
    }

    static void update(Context context, int unreadCount) {
        try {
            String launcher = systemHomePackage(context);
            if (launcher == null) return;
            Intent appIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            ComponentName app = appIntent == null ? null : appIntent.getComponent();
            if (app == null) return;

            if (usesVivoBadge(launcher)) {
                updateVivoBadge(context, launcher, app, unreadCount);
                return;
            }
            switch (launcher) {
                case "com.huawei.android.launcher":
                case "com.hihonor.android.launcher":
                    Bundle badge = new Bundle();
                    badge.putString("package", app.getPackageName());
                    badge.putString("class", app.getClassName());
                    badge.putInt("badgenumber", unreadCount);
                    callLauncher(context, launcher, launcher + ".settings", "/badge/", "change_badge", badge);
                    break;
                case "com.oppo.launcher":
                case "com.coloros.launcher":
                case "com.oplus.launcher":
                    Bundle count = new Bundle();
                    count.putInt("app_badge_count", unreadCount);
                    callLauncher(context, launcher, "com.android.badge", "/badge", "setAppBadgeCount", count);
                    break;
            }
        } catch (RuntimeException ignored) {
            // An unavailable or permission-restricted launcher must not affect notification delivery.
        }
    }

    private static boolean usesVivoBadge(String launcher) {
        for (String vivoLauncher : VIVO_LAUNCHERS) {
            if (vivoLauncher.equals(launcher)) return true;
        }
        // The V2427 uses this package name, which is shared with other manufacturers.
        return "com.android.launcher3".equals(launcher)
                && ("vivo".equalsIgnoreCase(Build.MANUFACTURER) || "vivo".equalsIgnoreCase(Build.BRAND));
    }

    private static void updateVivoBadge(Context context, String launcher, ComponentName app, int unreadCount) {
        if (context.checkSelfPermission(VIVO_BADGE_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        PackageManager packages = context.getPackageManager();
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(launcher);
        for (String knownLauncher : VIVO_LAUNCHERS) candidates.add(knownLauncher);

        for (String candidate : candidates) {
            Intent update = new Intent(VIVO_BADGE_ACTION).setPackage(candidate);
            for (ResolveInfo match : packages.queryBroadcastReceivers(update, 0)) {
                ActivityInfo receiver = match.activityInfo;
                if (receiver == null || !candidate.equals(receiver.packageName)
                        || !isSystemApp(receiver.applicationInfo) || !receiver.enabled || !receiver.applicationInfo.enabled
                        || !receiver.exported || (receiver.permission != null
                        && context.checkSelfPermission(receiver.permission) != PackageManager.PERMISSION_GRANTED)) continue;

                update.setComponent(new ComponentName(candidate, receiver.name));
                update.putExtra("packageName", app.getPackageName());
                update.putExtra("className", app.getClassName());
                update.putExtra("notificationNum", unreadCount);
                context.sendBroadcast(update);
                return;
            }
        }
    }

    private static void callLauncher(Context context, String launcher, String authority, String path,
            String method, Bundle badge) {
        ProviderInfo provider = context.getPackageManager().resolveContentProvider(authority, 0);
        if (provider == null || !launcher.equals(provider.packageName) || !provider.enabled || !provider.exported) return;
        context.getContentResolver().call(Uri.parse("content://" + authority + path), method, null, badge);
    }
}
