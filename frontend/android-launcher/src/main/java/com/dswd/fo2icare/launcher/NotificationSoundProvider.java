package com.dswd.fo2icare.launcher;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.content.res.Resources;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

/** Stable, read-only URLs for the public chimes that Android plays from notification channels. */
public final class NotificationSoundProvider extends ContentProvider {
    public static Uri soundUri(Context context, String sound) {
        return new Uri.Builder().scheme("content")
                .authority(context.getPackageName() + ".notification-sounds").appendPath(sound).build();
    }

    @Override public boolean onCreate() { return true; }

    private static int soundResource(Uri uri) {
        if (uri.getPathSegments().size() != 1) return 0;
        switch (uri.getPathSegments().get(0)) {
            case "routine": return R.raw.routine_notification;
            case "nearing": return R.raw.nearing_sla;
            case "overdue": return R.raw.overdue_sla;
            default: return 0;
        }
    }

    @Override
    public AssetFileDescriptor openAssetFile(Uri uri, String mode) throws FileNotFoundException {
        int resource = soundResource(uri);
        Context context = getContext();
        if (!"r".equals(mode) || resource == 0 || context == null) {
            throw new FileNotFoundException("Unknown notification sound.");
        }
        try {
            return context.getResources().openRawResourceFd(resource);
        } catch (Resources.NotFoundException e) {
            throw new FileNotFoundException("Notification sound is unavailable.");
        }
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        int resource = soundResource(uri);
        Context context = getContext();
        if (!"r".equals(mode) || resource == 0 || context == null) {
            throw new FileNotFoundException("Unknown notification sound.");
        }
        // Consumers that request a plain file descriptor cannot use the APK's asset offset.
        return ParcelFileDescriptor.open(cachedSound(context, resource, uri.getLastPathSegment()),
                ParcelFileDescriptor.MODE_READ_ONLY);
    }

    private synchronized File cachedSound(Context context, int resource, String name) throws FileNotFoundException {
        String packageCopy = Integer.toHexString(context.getApplicationInfo().sourceDir.hashCode());
        File cached = new File(context.getCacheDir(), "notification-" + packageCopy + "-" + name + ".wav");
        if (cached.isFile() && cached.length() > 0) return cached;

        File temporary = null;
        try {
            temporary = File.createTempFile("notification-sound-", ".wav", context.getCacheDir());
            try (InputStream input = context.getResources().openRawResource(resource);
                 FileOutputStream output = new FileOutputStream(temporary)) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = input.read(buffer)) != -1) output.write(buffer, 0, bytesRead);
            }
            if (!temporary.renameTo(cached)) throw new IOException("Could not cache sound.");
            return cached;
        } catch (IOException | Resources.NotFoundException e) {
            throw new FileNotFoundException("Notification sound is unavailable.");
        } finally {
            if (temporary != null && temporary.exists()) temporary.delete();
        }
    }

    @Override public String getType(Uri uri) { return soundResource(uri) == 0 ? null : "audio/wav"; }
    @Override public Cursor query(Uri uri, String[] p, String s, String[] a, String order) { return null; }
    @Override public Uri insert(Uri uri, ContentValues values) { throw new UnsupportedOperationException("Read only."); }
    @Override public int update(Uri uri, ContentValues values, String s, String[] a) { throw new UnsupportedOperationException("Read only."); }
    @Override public int delete(Uri uri, String s, String[] a) { throw new UnsupportedOperationException("Read only."); }
}
