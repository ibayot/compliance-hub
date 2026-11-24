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
    enum Result { STANDARD, REQUESTED, BLOCKED }

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

            switch (launcher) {
                case "com.vivo.launcher":
                case "com.bbk.launcher2":
                case "com.bbk.launcher3":
                    Intent update = new Intent("launcher.action.CHANGE_APPLICATION_NOTIFICATION_NUM");
                    update.setPackage(launcher);
                    update.putExtra("packageName", app.getPackageName());
                    update.putExtra("className", app.getClassName());
                    update.putExtra("notificationNum", unreadCount);
                    // Vivo's documented launcher integration needs this background receiver flag.
                    // Android hides the named constant from the public SDK, so use its platform value.
                    update.addFlags(0x01000000);
                    context.sendBroadcast(update);
                    return Result.REQUESTED;
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

    private static Result callLauncher(Context context, String launcher, String authority, String path,
            String method, Bundle badge) {
        ProviderInfo provider = context.getPackageManager().resolveContentProvider(authority, 0);
        if (provider == null || !launcher.equals(provider.packageName)) return Result.STANDARD;
        context.getContentResolver().call(Uri.parse("content://" + authority + path), method, null, badge);
        return Result.REQUESTED;
    }
}
