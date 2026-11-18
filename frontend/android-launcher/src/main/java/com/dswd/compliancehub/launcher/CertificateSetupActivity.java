package com.dswd.compliancehub.launcher;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

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
    private Button saveCertificateButton;
    private Button openSecuritySettingsButton;
    private Button openHubButton;
    private TextView statusText;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (isRootCaTrusted()) {
            openHub();
            return;
        }
        showSetupScreen();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (openHubButton != null) {
            refreshTrustStatus();
        }
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
        openHubButton.setOnClickListener(view -> {
            if (isRootCaTrusted()) {
                openHub();
            } else {
                refreshTrustStatus();
            }
        });
        content.addView(openHubButton, buttonLayout());

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
            openSecuritySettingsButton.setEnabled(true);
        } catch (Exception error) {
            statusText.setText("The certificate could not be saved. Choose Downloads and try again.");
        }
        refreshTrustStatus();
    }

    private void refreshTrustStatus() {
        if (statusText == null || openHubButton == null) return;
        if (isRootCaTrusted()) {
            statusText.setText("The Compliance Hub certificate is trusted on this device.");
            openHubButton.setEnabled(true);
            openSecuritySettingsButton.setEnabled(false);
        } else if (openSecuritySettingsButton.isEnabled()) {
            statusText.setText("Install the saved certificate in Android Security settings, then return here.");
            openHubButton.setEnabled(false);
        } else {
            statusText.setText("Save the certificate first. Android requires you to confirm its installation in Settings.");
            openHubButton.setEnabled(false);
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
        startActivity(new Intent(this, com.google.androidbrowserhelper.trusted.LauncherActivity.class));
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
