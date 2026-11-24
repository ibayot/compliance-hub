package com.dswd.fo2icare.launcher;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;

/** Best-effort badge updates for launchers with a separate unread-count interface. */
final class LauncherBadge {
    private LauncherBadge() {}

    static void update(Context context, int unreadCount) {
        try {
            PackageManager packages = context.getPackageManager();
            ResolveInfo home = packages.resolveActivity(
                    new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
                    PackageManager.MATCH_DEFAULT_ONLY);
            if (home == null || home.activityInfo == null || home.activityInfo.applicationInfo == null) return;
            int systemFlags = ApplicationInfo.FLAG_SYSTEM | ApplicationInfo.FLAG_UPDATED_SYSTEM_APP;
            if ((home.activityInfo.applicationInfo.flags & systemFlags) == 0) return;

            String launcher = home.activityInfo.packageName;
            Intent appIntent = packages.getLaunchIntentForPackage(context.getPackageName());
            ComponentName app = appIntent == null ? null : appIntent.getComponent();
            if (app == null) return;

            switch (launcher) {
                case "com.vivo.launcher":
                    Intent update = new Intent("launcher.action.CHANGE_APPLICATION_NOTIFICATION_NUM");
                    update.setPackage(launcher);
                    update.putExtra("packageName", app.getPackageName());
                    update.putExtra("className", app.getClassName());
                    update.putExtra("notificationNum", unreadCount);
                    context.sendBroadcast(update);
                    break;
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
                default:
                    // Other launchers can render the standard Android notification badge.
                    break;
            }
        } catch (RuntimeException ignored) {
            // An unavailable or permission-restricted launcher must not affect notification delivery.
        }
    }

    private static void callLauncher(Context context, String launcher, String authority, String path,
            String method, Bundle badge) {
        ProviderInfo provider = context.getPackageManager().resolveContentProvider(authority, 0);
        if (provider == null || !launcher.equals(provider.packageName)) return;
        context.getContentResolver().call(Uri.parse("content://" + authority + path), method, null, badge);
    }
}
