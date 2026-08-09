import re

filepath = 'src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add LocalNotifications import
import_statement = "import { LocalNotifications } from '@capacitor/local-notifications';\n"
if "import { LocalNotifications }" not in content:
    content = content.replace("import { Capacitor } from '@capacitor/core';", "import { Capacitor } from '@capacitor/core';\n" + import_statement)

# 2. Add scheduling logic inside the main App component, probably in a useEffect
notification_logic = """
  // Daily Study Notification Logic
  useEffect(() => {
    const scheduleDailyStudyReminder = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const permStatus = await LocalNotifications.requestPermissions();
          if (permStatus.display === 'granted') {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: "Consistent Study Plan",
                  body: "Time for your daily study plan! Continue reading where you left off.",
                  id: 1,
                  schedule: { at: new Date(Date.now() + 1000 * 60 * 60 * 24), repeats: true, every: 'day' },
                  smallIcon: "ic_stat_icon_config_sample",
                  iconColor: "#488AFF"
                }
              ]
            });
          }
        }
      } catch (err) {
        console.warn("Failed to schedule daily notification", err);
      }
    };
    
    scheduleDailyStudyReminder();
  }, []);
"""

# Inject this just before `return (` in the App component, or right after another useEffect.
# We will inject it after `const isOfflineMode = !isNetworkConnected;`
if "scheduleDailyStudyReminder" not in content:
    content = content.replace("const isOfflineMode = !isNetworkConnected;", "const isOfflineMode = !isNetworkConnected;\n" + notification_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Notifications patch applied.")
