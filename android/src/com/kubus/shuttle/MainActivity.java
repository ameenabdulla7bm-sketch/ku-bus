package com.kubus.shuttle;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public final class MainActivity extends Activity {
    private WebView web;
    private LinearLayout offlineBar;
    private ProgressBar progress;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean offline;
    private boolean loadingLive;
    private boolean clearHistoryAfterLoad;
    private final Runnable connectionTimeout = () -> showOffline();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(36, 16, 24));
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(root);
        offlineBar = new LinearLayout(this);
        offlineBar.setGravity(Gravity.CENTER_VERTICAL);
        offlineBar.setPadding(dp(12), 0, dp(8), 0);
        offlineBar.setBackgroundColor(Color.rgb(61, 40, 49));
        TextView offlineText = new TextView(this);
        offlineText.setText("Offline copy · 13 Sep 2026");
        offlineText.setTextColor(Color.WHITE);
        offlineText.setTextSize(12);
        offlineBar.addView(offlineText, new LinearLayout.LayoutParams(0, -2, 1));
        Button retry = new Button(this);
        retry.setText("Retry online");
        retry.setTextSize(11);
        retry.setAllCaps(false);
        retry.setOnClickListener(v -> loadLive());
        offlineBar.addView(retry, new LinearLayout.LayoutParams(-2, dp(44)));
        offlineBar.setVisibility(View.GONE);
        root.addView(offlineBar, new LinearLayout.LayoutParams(-1, -2));

        FrameLayout content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(36, 16, 24));
        content.addView(web, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        content.addView(progress, new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setUserAgentString(settings.getUserAgentString() + " KUBusAndroid/1.0");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value);
                progress.setVisibility(value < 100 ? View.VISIBLE : View.GONE);
            }
        });
        web.setWebViewClient(new ShuttleClient());
        web.setDownloadListener((url, userAgent, disposition, mime, length) -> openExternal(url));
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::navigateBack);
        }
        if (state != null && web.restoreState(state) != null) {
            offline = state.getBoolean("offline", false);
            offlineBar.setVisibility(offline ? View.VISIBLE : View.GONE);
        } else {
            loadLive();
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private void loadLive() {
        handler.removeCallbacks(connectionTimeout);
        web.stopLoading();
        offline = false;
        loadingLive = true;
        clearHistoryAfterLoad = true;
        offlineBar.setVisibility(View.GONE);
        web.loadUrl(UrlPolicy.LIVE + "index.html#home");
        handler.postDelayed(connectionTimeout, 12000);
    }

    private void showOffline() {
        if (offline || isFinishing() || !loadingLive) return;
        handler.removeCallbacks(connectionTimeout);
        offline = true;
        loadingLive = false;
        clearHistoryAfterLoad = true;
        web.stopLoading();
        offlineBar.setVisibility(View.VISIBLE);
        web.loadUrl(UrlPolicy.LOCAL + "index.html#home");
    }

    private void openExternal(String url) {
        String safeUrl = UrlPolicy.externalUrl(url);
        if (safeUrl == null) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(safeUrl))); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Install a browser to open this link.", Toast.LENGTH_SHORT).show();
        }
    }

    private void navigateBack() {
        if (web.canGoBack()) web.goBack();
        else finish();
    }

    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { navigateBack(); }
    @Override protected void onSaveInstanceState(Bundle state) {
        web.saveState(state);
        state.putBoolean("offline", offline);
        super.onSaveInstanceState(state);
    }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        web.stopLoading();
        web.destroy();
        super.onDestroy();
    }

    private final class ShuttleClient extends WebViewClient {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (UrlPolicy.isDocument(url)) { if (request.hasGesture()) openExternal(url); return true; }
            if (UrlPolicy.isLive(url) || UrlPolicy.assetPath(url) != null) return false;
            if (request.isForMainFrame() && request.hasGesture()) openExternal(url);
            return true;
        }

        @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String asset = UrlPolicy.assetPath(request.getUrl().toString());
            if (asset == null) return null;
            try {
                return new WebResourceResponse(mimeType(asset), "UTF-8", getAssets().open("site/" + asset));
            } catch (IOException e) {
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-store");
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", headers,
                    new ByteArrayInputStream(new byte[0]));
            }
        }

        @Override public void onPageCommitVisible(WebView view, String url) {
            if (UrlPolicy.isLive(url)) {
                loadingLive = false;
                handler.removeCallbacks(connectionTimeout);
            }
        }

        @Override public void onPageFinished(WebView view, String url) {
            if (clearHistoryAfterLoad && (offline ? UrlPolicy.assetPath(url) != null : UrlPolicy.isLive(url))) {
                web.clearHistory();
                clearHistoryAfterLoad = false;
            }
        }

        @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame() && UrlPolicy.isLive(request.getUrl().toString())) {
                loadingLive = true;
                showOffline();
            }
        }

        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame() && response.getStatusCode() >= 400 && UrlPolicy.isLive(request.getUrl().toString())) {
                loadingLive = true;
                showOffline();
            }
        }
    }

    private static String mimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".webmanifest")) return "application/manifest+json";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".pdf")) return "application/pdf";
        return "application/octet-stream";
    }
}
