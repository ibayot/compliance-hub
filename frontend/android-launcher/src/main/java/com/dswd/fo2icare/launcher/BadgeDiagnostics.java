package com.dswd.fo2icare.launcher;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

/** Temporary, device-local evidence for the Vivo badge issue. */
final class BadgeDiagnostics {
    enum Refresh {
        INVALID, STALE, CLEARED, NOTIFICATIONS_BLOCKED, ROUTINE_CHANNEL_BLOCKED,
        SUMMARY_CHANNEL_BLOCKED, POST_FAILED, POST_REQUESTED
    }

    static final String SUMMARY_REVISION = "fo2_summary_revision";
    private static final String PREFERENCES = "badge_diagnostics";
    private static final long RETENTION_MS = 15 * 60 * 1000L;

    private BadgeDiagnostics() {}

    static void record(Context context, String kind, Refresh refresh) {
        record(context, kind, refresh, 0);
    }

    static synchronized void record(Context context, String kind, Refresh refresh, long revision) {
        if (!"badge_sync".equals(kind)) return;
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit()
                .putString("result", refresh.name())
                .putLong("recorded_at", System.currentTimeMillis())
                .putLong("revision", revision)
                .apply();
    }

    static synchronized JSONObject snapshot(Context context, Notification summary, String channel,
            boolean channelAllowsBadge, boolean restoreAllowed) throws JSONException {
        JSONObject result = new JSONObject();
        result.put("channel", channel);
        if (summary != null) result.put("channelAllowsBadge", channelAllowsBadge);
        result.put("restoreAllowed", restoreAllowed);

        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
        long age = System.currentTimeMillis() - preferences.getLong("recorded_at", 0);
        if (age < 0 || age >= RETENTION_MS) {
            if (preferences.contains("result")) preferences.edit().clear().apply();
            return result;
        }
        String refresh = preferences.getString("result", null);
        if (Refresh.POST_REQUESTED.name().equals(refresh)) {
            long revision = preferences.getLong("revision", 0);
            refresh = summary != null && summary.number > 0 && revision > 0
                    && summary.extras.getLong(SUMMARY_REVISION, 0) == revision ? "POSTED" : "POST_UNCONFIRMED";
        }
        result.put("refresh", refresh);
        result.put("ageSeconds", age / 1000);
        return result;
    }
}
