package com.tiktoklivewrapper;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import java.util.Timer;
import java.util.TimerTask;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class BackgroundService extends Service {

    private static final int NOTIFICATION_ID = 1;
    private static final String CHANNEL_ID = "TikTokLiveChannel";
    // Use the deployed server URL
    private static final String SERVER_URL = "https://8080-i8028sn6zwxtf5i8y2u97-a704d29f.manus.computer";
    private static final String HEALTH_CHECK_URL = SERVER_URL + "/api/health";
    
    private Timer timer;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification("TikTok Live is running in background"));
        
        if (!isRunning) {
            isRunning = true;
            startBackgroundTask();
        }
        
        // If service is killed, restart it
        return START_STICKY;
    }

    private void startBackgroundTask() {
        timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                // Perform health check to keep connection alive
                performHealthCheck();
            }
        }, 0, 30000); // Check every 30 seconds
    }
    
    private void performHealthCheck() {
        try {
            URL url = new URL(HEALTH_CHECK_URL);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            
            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                // Server is alive, read response
                BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                String inputLine;
                StringBuilder response = new StringBuilder();
                
                while ((inputLine = in.readLine()) != null) {
                    response.append(inputLine);
                }
                in.close();
                
                // Update notification with status
                updateNotification("TikTok Live is active: " + response.toString());
            } else {
                // Server error
                updateNotification("TikTok Live server error: " + responseCode);
            }
            
        } catch (Exception e) {
            updateNotification("Connection error: " + e.getMessage());
        }
    }
    
    private void updateNotification(String content) {
        NotificationManager notificationManager = getSystemService(NotificationManager.class);
        notificationManager.notify(NOTIFICATION_ID, createNotification(content));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "TikTok Live Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps TikTok Live connection active");
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification(String content) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("TikTok Live")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent)
                .build();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (timer != null) {
            timer.cancel();
            timer = null;
        }
        isRunning = false;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
