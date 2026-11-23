package com.dswd.compliancehub.launcher;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

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

/**
 * Gives users an explicit, offline setup path for the internal HTTPS root CA.
 * Android 11+ requires the user to install CA certificates from Settings.
 */
public final class CertificateSetupActivity extends Activity {
    private static final int CREATE_CERTIFICATE_REQUEST = 401;
    private static final long VERIFICATION_TIMEOUT_MS = 4_000;
    private static final long VERIFICATION_RETRY_DELAY_MS = 750;
    private static final String CERTIFICATE_SAVED = "certificateSaved";
    private final Handler browserHandler = new Handler(Looper.getMainLooper());
    private CustomTabsServiceConnection browserConnection;
    private boolean certificateSaved;
    private boolean verificationInProgress;
    private boolean verificationFailed;
    private boolean automaticVerificationAttempted;
    private boolean resumed;
    private Button saveCertificateButton;
    private Button openSecuritySettingsButton;
    private Button openHubButton;
    private Button openBrowserButton;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        certificateSaved = savedInstanceState != null && savedInstanceState.getBoolean(CERTIFICATE_SAVED);
        showSetupScreen();
    }

    @Override
    protected void onResume() {
        super.onResume();
        resumed = true;
        refreshTrustStatus();
        if (!automaticVerificationAttempted && openHubButton.isEnabled()) {
            automaticVerificationAttempted = true;
            startBrowserVerification();
        }
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
                "Compliance Hub uses Chrome to display the application. Before Chrome can verify " +
                "the internal HTTPS connection and remove the address bar, Android requires you " +
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
                "2. Open Android Security settings and choose Install a certificate > CA certificate. " +
                "Select the saved Compliance Hub certificate and confirm Android's trust warning.\n\n" +
                "3. Return here. Compliance Hub checks for the installed certificate before opening the site.");
        steps.setTextColor(navy);
        steps.setTextSize(15);
        steps.setPadding(0, 0, 0, dp(16));
        content.addView(steps, fullWidth());

        statusText = new TextView(this);
        statusText.setTextColor(navy);
        statusText.setTextSize(14);
        statusText.setPadding(0, 0, 0, dp(12));
        content.addView(statusText, fullWidth());

        saveCertificateButton = button("Save CA certificate", teal);
        saveCertificateButton.setOnClickListener(view -> requestCertificateSave());
        content.addView(saveCertificateButton, buttonLayout());

        openSecuritySettingsButton = button("Open Android security settings", navy);
        openSecuritySettingsButton.setEnabled(false);
        openSecuritySettingsButton.setOnClickListener(view -> {
            try {
                startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS));
            } catch (Exception error) {
                Toast.makeText(this, "Open Security settings from the Android Settings app.", Toast.LENGTH_LONG).show();
            }
        });
        content.addView(openSecuritySettingsButton, buttonLayout());

        openHubButton = button("Open Compliance Hub", teal);
        openHubButton.setEnabled(false);
        openHubButton.setOnClickListener(view -> startBrowserVerification());
        content.addView(openHubButton, buttonLayout());

        openBrowserButton = button("Open in browser", navy);
        openBrowserButton.setVisibility(View.GONE);
        openBrowserButton.setOnClickListener(view -> openInBrowser());
        content.addView(openBrowserButton, buttonLayout());

        setContentView(scroll);
        refreshTrustStatus();
    }

    private void requestCertificateSave() {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/x-x509-ca-cert");
        intent.putExtra(Intent.EXTRA_TITLE, "Compliance-Hub-Root-CA.crt");
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
        Uri destination = data == null ? null : data.getData();
        if (resultCode != RESULT_OK || destination == null) {
            statusText.setText("Certificate save was canceled. Save the file before continuing.");
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
            statusText.setText("Certificate saved. Install it from Android Security settings, then return here.");
            certificateSaved = true;
        } catch (Exception error) {
            statusText.setText("The certificate could not be saved. Choose Downloads and try again.");
        }
        refreshTrustStatus();
    }

    private void refreshTrustStatus() {
        boolean trusted = isRootCaTrusted();
        openSecuritySettingsButton.setEnabled(!trusted && certificateSaved);
        openHubButton.setEnabled(trusted && !verificationInProgress);
        openHubButton.setText(verificationFailed && trusted ? "Retry full screen" : "Open Compliance Hub");
        openBrowserButton.setVisibility(verificationFailed && trusted && !verificationInProgress
                ? View.VISIBLE : View.GONE);

        if (!trusted) {
            statusText.setText(certificateSaved
                    ? "Install the saved certificate in Android Security settings, then return here."
                    : "Save the certificate first. Android requires you to confirm its installation in Settings.");
        } else if (verificationInProgress) {
            statusText.setText("Checking full-screen access with your browser…");
        } else if (verificationFailed) {
            statusText.setText("Full-screen access could not be verified. Check that you’re on the office network or VPN, then retry.");
        } else {
            statusText.setText("The Compliance Hub certificate is trusted on this device.");
        }
    }

    private void startBrowserVerification() {
        if (verificationInProgress || !resumed || !isRootCaTrusted()) return;
        verificationFailed = false;
        verificationInProgress = true;
        refreshTrustStatus();
        verifyBrowserAssociation(true);
    }

    private void verifyBrowserAssociation(boolean canRetry) {
        Uri launchUrl = Uri.parse(getString(R.string.hub_launch_url));
        Uri origin = new Uri.Builder().scheme(launchUrl.getScheme())
                .encodedAuthority(launchUrl.getEncodedAuthority()).build();
        TwaProviderPicker.Action browser = TwaProviderPicker.pickProvider(getPackageManager());
        if (browser.launchMode != TwaProviderPicker.LaunchMode.TRUSTED_WEB_ACTIVITY || browser.provider == null) {
            finishBrowserVerification(false, false);
            return;
        }

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
                                || !origin.getScheme().equals(requestedOrigin.getScheme())
                                || !origin.getEncodedAuthority().equals(requestedOrigin.getEncodedAuthority())) return;
                        finishBrowserVerification(verified, canRetry);
                    }
                });
                if (session == null || !session.validateRelationship(CustomTabsService.RELATION_HANDLE_ALL_URLS, origin, null)) {
                    finishBrowserVerification(false, canRetry);
                }
            }

            @Override
            public void onServiceDisconnected(android.content.ComponentName name) {
                if (browserConnection == this) finishBrowserVerification(false, canRetry);
            }
        };
        try {
            if (CustomTabsClient.bindCustomTabsService(this, browser.provider, connection)) {
                browserConnection = connection;
                browserHandler.postDelayed(() -> finishBrowserVerification(false, canRetry), VERIFICATION_TIMEOUT_MS);
                return;
            }
        } catch (SecurityException ignored) {
            // The selected browser can be disabled or changed while opening the app.
        }
        finishBrowserVerification(false, canRetry);
    }

    private void finishBrowserVerification(boolean verified, boolean canRetry) {
        cancelBrowserVerification();
        if (!resumed || isFinishing()) return;
        if (verified && isRootCaTrusted()) {
            openHub();
        } else if (canRetry && isRootCaTrusted()) {
            verificationInProgress = true;
            browserHandler.postDelayed(() -> verifyBrowserAssociation(false), VERIFICATION_RETRY_DELAY_MS);
        } else {
            verificationFailed = true;
            refreshTrustStatus();
        }
    }

    private void cancelBrowserVerification() {
        browserHandler.removeCallbacksAndMessages(null);
        if (browserConnection != null) {
            unbindService(browserConnection);
            browserConnection = null;
        }
        verificationInProgress = false;
    }

    private void openInBrowser() {
        if (!isRootCaTrusted()) {
            refreshTrustStatus();
            return;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(getString(R.string.hub_launch_url))));
        } catch (android.content.ActivityNotFoundException ignored) {
            statusText.setText("No browser is available. Enable Chrome, then retry.");
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

    private void openHub() {
        Intent launch = new Intent(this, com.google.androidbrowserhelper.trusted.LauncherActivity.class);
        // Browser Helper otherwise starts a second launcher while the first is still alive.
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(launch);
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
