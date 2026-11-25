package com.dswd.fo2icare.launcher;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import java.text.NumberFormat;

/** Optional home-screen app icon whose unread number is drawn by FO2 iCare. */
public final class UnreadBadgeWidget extends AppWidgetProvider {
    private static final String SUMMARY_DISMISSED = "com.dswd.fo2icare.launcher.SUMMARY_DISMISSED";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        if (widgetIds.length > 0) {
            render(context, manager, widgetIds, FcmMessageService.widgetUnreadCount(context));
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (SUMMARY_DISMISSED.equals(intent.getAction())) {
            refresh(context);
            return;
        }
        super.onReceive(context, intent);
    }

    static PendingIntent summaryDismissed(Context context) {
        Intent intent = new Intent(context, UnreadBadgeWidget.class).setAction(SUMMARY_DISMISSED);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
    }

    static void refresh(Context context) {
        try {
            if (isAdded(context)) updateAll(context, FcmMessageService.widgetUnreadCount(context));
        } catch (RuntimeException ignored) {
            // The launcher may be unavailable while Android is restoring the Home Screen.
        }
    }

    private static boolean isAdded(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager != null && manager.getAppWidgetIds(new ComponentName(context, UnreadBadgeWidget.class)).length > 0;
    }

    static void updateAll(Context context, int unreadCount) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            if (manager == null) return;
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, UnreadBadgeWidget.class));
            if (ids.length > 0) render(context, manager, ids, unreadCount);
        } catch (RuntimeException ignored) {
            // A widget host failure must not interrupt launch or Android notifications.
        }
    }

    private static void render(Context context, AppWidgetManager manager, int[] ids, int unreadCount) {
        Intent open = new Intent(context, CertificateSetupActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openApp = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.unread_badge_widget);
        views.setOnClickPendingIntent(R.id.unread_widget_open, openApp);
        views.setViewVisibility(R.id.unread_widget_count, unreadCount > 0 ? View.VISIBLE : View.GONE);
        String number = NumberFormat.getIntegerInstance().format(unreadCount);
        views.setTextViewText(R.id.unread_widget_count,
                unreadCount > 99 ? context.getString(R.string.unread_widget_overflow) : number);
        views.setContentDescription(R.id.unread_widget_open,
                context.getResources().getQuantityString(R.plurals.unread_widget_open, unreadCount, number));
        manager.updateAppWidget(ids, views);
    }
}
