package com.dswd.fo2icare.launcher;

import android.app.Activity;
import android.app.AlertDialog;
import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.util.Base64;

import com.google.firebase.installations.FirebaseInstallations;

import org.json.JSONObject;

import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;

import com.google.androidbrowserhelper.trusted.TwaProviderPicker;

import java.io.InputStream;
import java.io.OutputStream;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Enumeration;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Gives users an explicit, offline setup path for the internal HTTPS root CA.
 * Android 11+ requires the user to install CA certificates from Settings.
 */
public final class CertificateSetupActivity extends Activity {
    private static final int CREATE_CERTIFICATE_REQUEST = 401;
    private static final int POST_NOTIFICATIONS_REQUEST = 402;
    private static final long VERIFICATION_TIMEOUT_MS = 4_000;
    private static final long VERIFICATION_RETRY_DELAY_MS = 750;
    private static final String CERTIFICATE_SAVED = "certificateSaved";
    private static final String PREFERENCES = "certificate_setup";
    private static final String LAST_BROWSER_CHECK = "last_browser_check";
    private static final String CERTIFICATE_SEARCH = "Certificate";
    private static final String DEVICE_ID = "fcm_device_id";
    private static final String NOTIFICATION_PERMISSION_ASKED = "notification_permission_asked";
    private static final String NATIVE_FCM_FRAGMENT_KEY = "fo2_fcm";
    private final Handler browserHandler = new Handler(Looper.getMainLooper());
    private CustomTabsServiceConnection browserConnection;
    private boolean certificateSaved;
    private boolean resumed;
    private String pendingBrowserCheck = "";
    private TextView setupStatus;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        certificateSaved = savedInstanceState != null && savedInstanceState.getBoolean(CERTIFICATE_SAVED);
        FcmMessageService.ensureNotificationChannel(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        continueLaunch();
    }

    @Override
    protected void onPause() {
        resumed = false;
        cancelBrowserVerification();
        super.onPause();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        outState.putBoolean(CERTIFICATE_SAVED, certificateSaved);
        super.onSaveInstanceState(outState);
    }

    private void showSetupScreen() {
        if (setupStatus != null) return;
        int navy = Color.rgb(23, 43, 66);
        int teal = Color.rgb(20, 122, 118);
        int page = Color.rgb(247, 249, 251);

        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(page);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(24), dp(36), dp(24), dp(32));
        content.setGravity(Gravity.CENTER_VERTICAL);
        scroll.addView(content, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView title = new TextView(this);
        title.setText("Secure connection setup");
        title.setTextColor(navy);
        title.setTextSize(25);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        content.addView(title, fullWidth());

        TextView introduction = new TextView(this);
        introduction.setText(
                "Before FO2 iCare can open its internal HTTPS site, Android requires you " +
                "to trust the RICTMS root certificate once in Settings. This certificate grants " +
                "device-wide trust to certificates issued by the RICTMS internal CA. It contains " +
                "no private key or account data. Install it only on an approved device.");
        introduction.setTextColor(navy);
        introduction.setTextSize(16);
        introduction.setPadding(0, dp(12), 0, dp(20));
        content.addView(introduction, fullWidth());

        TextView steps = new TextView(this);
        steps.setText(
                "1. Save the public certificate file in Downloads.\n\n" +
                "2. Open Android Settings and paste Certificate into the search field. Choose Install a certificate > CA certificate. " +
                "Select the saved FO2 iCare certificate and confirm Android's trust warning.\n\n" +
                "3. Return to FO2 iCare. It opens automatically once Android trusts the certificate.");
        steps.setTextColor(navy);
        steps.setTextSize(15);
        steps.setPadding(0, 0, 0, dp(16));
        content.addView(steps, fullWidth());

        setupStatus = new TextView(this);
        setupStatus.setTextColor(navy);
        setupStatus.setTextSize(14);
        setupStatus.setPadding(0, 0, 0, dp(12));
        if (certificateSaved) setupStatus.setText("Certificate saved. Install it in Settings, then return here.");
        content.addView(setupStatus, fullWidth());

        Button saveCertificateButton = button("Save CA certificate", teal);
        saveCertificateButton.setOnClickListener(view -> requestCertificateSave());
        content.addView(saveCertificateButton, buttonLayout());

        Button findCertificateButton = button("Find certificate in Settings", navy);
        findCertificateButton.setOnClickListener(view -> openCertificateSearch());
        content.addView(findCertificateButton, buttonLayout());

        setContentView(scroll);
    }

    private void openCertificateSearch() {
        ClipboardManager clipboard = getSystemService(ClipboardManager.class);
        if (clipboard != null) {
            clipboard.setPrimaryClip(ClipData.newPlainText("Settings search", CERTIFICATE_SEARCH));
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && launchSettings(Settings.ACTION_APP_SEARCH_SETTINGS)) {
            return;
        }
        if (!launchSettings(Settings.ACTION_SETTINGS)) {
            setupStatus.setText("Open Android Settings and search for Certificate.");
        }
    }

    private boolean launchSettings(String action) {
        try {
            startActivity(new Intent(action));
            return true;
        } catch (ActivityNotFoundException | SecurityException ignored) {
            return false;
        }
    }

    private void requestCertificateSave() {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/x-x509-ca-cert");
        intent.putExtra(Intent.EXTRA_TITLE, "FO2-iCare-Root-CA.crt");
        try {
            startActivityForResult(intent, CREATE_CERTIFICATE_REQUEST);
        } catch (Exception error) {
            Toast.makeText(this, "Android could not open the file save screen.", Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != CREATE_CERTIFICATE_REQUEST) return;
        showSetupScreen();
        Uri destination = data == null ? null : data.getData();
        if (resultCode != RESULT_OK || destination == null) {
            setupStatus.setText("Certificate save canceled. You can use a copy already saved in Downloads.");
            return;
        }

        try (InputStream input = getResources().openRawResource(R.raw.compliance_hub_root_ca);
             OutputStream output = getContentResolver().openOutputStream(destination)) {
            if (output == null) throw new IllegalStateException("The selected file could not be opened.");
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
            }
            output.flush();
            setupStatus.setText("Certificate saved. Install it in Settings, then return here.");
            certificateSaved = true;
        } catch (Exception error) {
            setupStatus.setText("The certificate could not be saved. Choose Downloads and try again.");
        }
    }

    private void continueLaunch() {
        if (!isRootCaTrusted()) {
            getSharedPreferences(PREFERENCES, MODE_PRIVATE).edit().remove(LAST_BROWSER_CHECK).apply();
            showSetupScreen();
            return;
        }

        Uri launchUrl = getLaunchUrl();
        Uri origin = new Uri.Builder().scheme(launchUrl.getScheme())
                .encodedAuthority(launchUrl.getEncodedAuthority()).build();
        TwaProviderPicker.Action browser = TwaProviderPicker.pickProvider(getPackageManager());
        if (browser.launchMode != TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY || browser.provider == null) {
            showLaunchStatus("A compatible browser is needed for full-screen access.", true);
            return;
        }

        String browserCheck = origin + "|" + browser.provider;
        if (browserCheck.equals(getSharedPreferences(PREFERENCES, MODE_PRIVATE).getString(LAST_BROWSER_CHECK, null))) {
            openHub(browserCheck);
            return;
        }

        showLaunchStatus("Opening FO2 iCare…", false);
        verifyBrowserAssociation(origin, browser.provider, browserCheck, true);
    }

    private void showLaunchStatus(String message, boolean showBrowserAction) {
        setupStatus = null;
        LinearLayout content = new LinearLayout(this);
        content.setPadding(dp(24), dp(24), dp(24), dp(24));
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        TextView messageView = new TextView(this);
        messageView.setText(message);
        messageView.setTextSize(18);
        messageView.setGravity(Gravity.CENTER);
        content.addView(messageView, fullWidth());
        if (showBrowserAction) {
            Button openBrowserButton = button("Open in browser", Color.rgb(23, 43, 66));
            openBrowserButton.setOnClickListener(view -> openInBrowser());
            content.addView(openBrowserButton, buttonLayout());
        }
        setContentView(content);
    }

    private Uri getLaunchUrl() {
        return Uri.parse(getString(R.string.hub_launch_url));
    }

    private void verifyBrowserAssociation(Uri origin, String provider, String browserCheck, boolean canRetry) {
        CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
            @Override
            public void onCustomTabsServiceConnected(android.content.ComponentName name, CustomTabsClient client) {
                if (browserConnection != this) return;
                CustomTabsServiceConnection currentConnection = this;
                client.warmup(0);
                CustomTabsSession session = client.newSession(new CustomTabsCallback() {
                    @Override
                    public void onRelationshipValidationResult(int relation, Uri requestedOrigin,
                            boolean verified, Bundle extras) {
                        if (browserConnection != currentConnection || relation != CustomTabsService.RELATION_HANDLE_ALL_URLS
                                || requestedOrigin == null || !origin.getScheme().equals(requestedOrigin.getScheme())
                                || !origin.getEncodedAuthority().equals(requestedOrigin.getEncodedAuthority())) return;
                        finishBrowserVerification(origin, provider, browserCheck, verified, canRetry);
                    }
                });
                if (session == null || !session.validateRelationship(CustomTabsService.RELATION_HANDLE_ALL_URLS, origin, null)) {
                    finishBrowserVerification(origin, provider, browserCheck, false, canRetry);
                }
            }

            @Override
            public void onServiceDisconnected(android.content.ComponentName name) {
                if (browserConnection == this) finishBrowserVerification(origin, provider, browserCheck, false, canRetry);
            }
        };
        try {
            if (CustomTabsClient.bindCustomTabsService(this, provider, connection)) {
                browserConnection = connection;
                browserHandler.postDelayed(() -> finishBrowserVerification(origin, provider, browserCheck, false, canRetry),
                        VERIFICATION_TIMEOUT_MS);
                return;
            }
        } catch (SecurityException ignored) {
            // The selected browser can be disabled or changed while opening the app.
        }
        finishBrowserVerification(origin, provider, browserCheck, false, canRetry);
    }

    private void finishBrowserVerification(Uri origin, String provider, String browserCheck, boolean verified, boolean canRetry) {
        cancelBrowserVerification();
        if (!resumed || isFinishing()) return;
        if (!verified && canRetry) {
            browserHandler.postDelayed(() -> verifyBrowserAssociation(origin, provider, browserCheck, false),
                    VERIFICATION_RETRY_DELAY_MS);
            return;
        }
        // An optional Custom Tabs callback cannot replace the browser's own TWA verification.
        openHub(browserCheck);
    }

    private void cancelBrowserVerification() {
        browserHandler.removeCallbacksAndMessages(null);
        if (browserConnection != null) {
            CustomTabsServiceConnection connection = browserConnection;
            browserConnection = null;
            unbindService(connection);
        }
    }

    private void openInBrowser() {
        if (!isRootCaTrusted()) {
            showSetupScreen();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, getLaunchUrl()));
            finish();
        } catch (ActivityNotFoundException ignored) {
            showLaunchStatus("No browser is available. Enable a browser and reopen FO2 iCare.", false);
        }
    }

    private boolean isRootCaTrusted() {
        try (InputStream input = getResources().openRawResource(R.raw.compliance_hub_root_ca)) {
            CertificateFactory factory = CertificateFactory.getInstance("X.509");
            X509Certificate bundled = (X509Certificate) factory.generateCertificate(input);
            byte[] expected = sha256(bundled.getEncoded());

            KeyStore androidTrustStore = KeyStore.getInstance("AndroidCAStore");
            androidTrustStore.load(null);
            Enumeration<String> aliases = androidTrustStore.aliases();
            while (aliases.hasMoreElements()) {
                Certificate installed = androidTrustStore.getCertificate(aliases.nextElement());
                if (installed instanceof X509Certificate &&
                        MessageDigest.isEqual(expected, sha256(installed.getEncoded()))) {
                    return true;
                }
            }
        } catch (Exception ignored) {
            // If the trust store cannot be checked, fail closed and keep the setup screen visible.
        }
        return false;
    }

    private byte[] sha256(byte[] value) throws Exception {
        return MessageDigest.getInstance("SHA-256").digest(value);
    }

    private void openHub(String browserCheck) {
        pendingBrowserCheck = browserCheck;
        if (!isRootCaTrusted()) {
            showSetupScreen();
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !getSharedPreferences(PREFERENCES, MODE_PRIVATE).getBoolean(NOTIFICATION_PERMISSION_ASKED, false)) {
            getSharedPreferences(PREFERENCES, MODE_PRIVATE).edit()
                    .putBoolean(NOTIFICATION_PERMISSION_ASKED, true).apply();
            new AlertDialog.Builder(this)
                    .setTitle("Allow FO2 iCare alerts")
                    .setMessage("Allow notifications so FO2 iCare can alert you when a ticket or other app notification arrives. You can change this later in Android Settings.")
                    .setPositiveButton("Allow alerts", (dialog, which) ->
                            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, POST_NOTIFICATIONS_REQUEST))
                    .setNegativeButton("Continue without alerts", (dialog, which) -> openHubWithFcm(browserCheck))
                    .setOnCancelListener(dialog -> openHubWithFcm(browserCheck))
                    .show();
            return;
        }
        openHubWithFcm(browserCheck);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == POST_NOTIFICATIONS_REQUEST) {
            openHubWithFcm(pendingBrowserCheck);
        }
    }

    private void openHubWithFcm(String browserCheck) {
        String deviceId = getOrCreateDeviceId();
        boolean notificationsGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        AtomicBoolean launched = new AtomicBoolean(false);
        Runnable launchWithoutFid = () -> {
            if (launched.compareAndSet(false, true)) launchHubWithHandoff(browserCheck, deviceId, null, notificationsGranted);
        };
        try {
            FirebaseInstallations.getInstance().getId().addOnCompleteListener(task -> {
                if (launched.compareAndSet(false, true)) {
                    String fid = task.isSuccessful() ? task.getResult() : null;
                    launchHubWithHandoff(browserCheck, deviceId, fid, notificationsGranted);
                }
            });
            browserHandler.postDelayed(launchWithoutFid, 5_000);
        } catch (RuntimeException error) {
            launchWithoutFid.run();
        }
    }

    private String getOrCreateDeviceId() {
        android.content.SharedPreferences preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE);
        String current = preferences.getString(DEVICE_ID, null);
        if (current != null && !current.isEmpty()) return current;
        String created = UUID.randomUUID().toString();
        preferences.edit().putString(DEVICE_ID, created).apply();
        return created;
    }

    private void launchHubWithHandoff(String browserCheck, String deviceId, String fid, boolean notificationsGranted) {
        if (isFinishing()) return;
        Intent launch = new Intent(this, com.google.androidbrowserhelper.trusted.LauncherActivity.class);
        // Browser Helper otherwise starts a second launcher while the first is still alive.
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        JSONObject handoff = new JSONObject();
        try {
            handoff.put("version", 1);
            handoff.put("deviceId", deviceId);
            handoff.put("notificationsGranted", notificationsGranted);
            if (fid != null && !fid.isEmpty()) handoff.put("fid", fid);
            String encoded = Base64.encodeToString(handoff.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
            Uri handoffUrl = getLaunchUrl().buildUpon().encodedFragment(NATIVE_FCM_FRAGMENT_KEY + "=" + encoded).build();
            launch.setData(handoffUrl);
        } catch (Exception error) {
            // Launch the app normally if an optional push identifier cannot be encoded.
        }
        startActivity(launch);
        // This only avoids repeated warm-ups. The CA and the TWA association are still checked on every launch.
        getSharedPreferences(PREFERENCES, MODE_PRIVATE).edit().putString(LAST_BROWSER_CHECK, browserCheck).apply();
        finish();
    }

    private Button button(String label, int color) {
        Button result = new Button(this);
        result.setText(label);
        result.setTextColor(Color.WHITE);
        result.setTextSize(15);
        result.setAllCaps(false);
        result.setBackgroundTintList(android.content.res.ColorStateList.valueOf(color));
        result.setMinHeight(dp(52));
        return result;
    }

    private LinearLayout.LayoutParams fullWidth() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private LinearLayout.LayoutParams buttonLayout() {
        LinearLayout.LayoutParams layout = fullWidth();
        layout.topMargin = dp(8);
        return layout;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
