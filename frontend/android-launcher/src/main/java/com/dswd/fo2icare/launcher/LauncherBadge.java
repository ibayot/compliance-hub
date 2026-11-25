package com.dswd.fo2icare.launcher;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

/** Best-effort badge updates for launchers with a separate unread-count interface. */
final class LauncherBadge {
    enum Result { STANDARD, REQUESTED, BLOCKED }
    private static final String VIVO_BADGE_PERMISSION = "com.vivo.notification.permission.BADGE_ICON";
    private static final int INCLUDE_BACKGROUND_RECEIVERS = 0x01000000;

    private LauncherBadge() {}

    static String systemHomePackage(Context context) {
        ResolveInfo home = context.getPackageManager().resolveActivity(
                new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
                PackageManager.MATCH_DEFAULT_ONLY);
        if (home == null || home.activityInfo == null || home.activityInfo.applicationInfo == null) return null;
        int systemFlags = ApplicationInfo.FLAG_SYSTEM | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP;
        return (home.activityInfo.applicationInfo.flags & systemFlags) != 0 ? home.activityInfo.packageName : null;
    }

    static Result update(Context context, int unreadCount) {
        try {
            String launcher = systemHomePackage(context);
            if (launcher == null) return Result.STANDARD;
            Intent appIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            ComponentName app = appIntent == null ? null : appIntent.getComponent();
            if (app == null) return Result.STANDARD;

            if (usesVivoBadge(launcher, Build.MANUFACTURER, Build.BRAND)) {
                return updateVivoBadge(context, launcher, app, unreadCount);
            }
            switch (launcher) {
                case "com.huawei.android.launcher":
                case "com.hihonor.android.launcher":
                    Bundle badge = new Bundle();
                    badge.putString("package", app.getPackageName());
                    badge.putString("class", app.getClassName());
                    badge.putInt("badgenumber", unreadCount);
                    return callLauncher(context, launcher, launcher + ".settings", "/badge/", "change_badge", badge);
                case "com.oppo.launcher":
                case "com.coloros.launcher":
                case "com.oplus.launcher":
                    Bundle count = new Bundle();
                    count.putInt("app_badge_count", unreadCount);
                    return callLauncher(context, launcher, "com.android.badge", "/badge", "setAppBadgeCount", count);
                default:
                    return Result.STANDARD;
            }
        } catch (RuntimeException ignored) {
            // An unavailable or permission-restricted launcher must not affect notification delivery.
            return Result.BLOCKED;
        }
    }

    private static boolean usesVivoBadge(String launcher, String manufacturer, String brand) {
        return "com.vivo.launcher".equals(launcher)
                || "com.bbk.launcher2".equals(launcher)
                || "com.bbk.launcher3".equals(launcher)
                // The V2427 uses this package name, which is shared with other manufacturers.
                || ("com.android.launcher3".equals(launcher)
                    && ("vivo".equalsIgnoreCase(manufacturer) || "vivo".equalsIgnoreCase(brand)));
    }

    private static Result updateVivoBadge(Context context, String launcher, ComponentName app, int unreadCount) {
        if (context.checkSelfPermission(VIVO_BADGE_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            return Result.BLOCKED;
        }
        Intent update = new Intent("launcher.action.CHANGE_APPLICATION_NOTIFICATION_NUM");
        update.setPackage(launcher);
        update.putExtra("packageName", app.getPackageName());
        update.putExtra("className", app.getClassName());
        update.putExtra("notificationNum", unreadCount);
        update.addFlags(INCLUDE_BACKGROUND_RECEIVERS);
        context.sendBroadcast(update);
        return Result.REQUESTED;
    }

    private static Result callLauncher(Context context, String launcher, String authority, String path,
            String method, Bundle badge) {
        ProviderInfo provider = context.getPackageManager().resolveContentProvider(authority, 0);
        if (provider == null || !launcher.equals(provider.packageName)) return Result.STANDARD;
        context.getContentResolver().call(Uri.parse("content://" + authority + path), method, null, badge);
        return Result.REQUESTED;
    }
}
