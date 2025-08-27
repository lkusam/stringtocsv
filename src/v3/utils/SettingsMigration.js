/**
 * SettingsMigration - Minimal implementation for v3 settings migration
 */

export class SettingsMigration {
  constructor(options = {}) {
    this.currentVersion = "3.0.0";
    this.supportedVersions = ["2.5", "2.4", "2.3", "2.2", "2.1", "2.0"];
    this.onMigrationStart = options.onMigrationStart || (() => {});
    this.onMigrationComplete = options.onMigrationComplete || (() => {});
    this.onMigrationError = options.onMigrationError || (() => {});
    this.onBackupCreated = options.onBackupCreated || (() => {});
  }

  needsMigration(settings) {
    if (!settings || !settings.version) {
      return true; // No version means needs migration
    }
    return settings.version !== this.currentVersion;
  }

  async migrateSettings(oldSettings) {
    try {
      this.onMigrationStart(oldSettings);

      // Simple migration - just ensure we have the right structure
      const migratedSettings = {
        version: this.currentVersion,
        ui: {
          theme: oldSettings.ui?.theme || "classic",
          darkMode: oldSettings.ui?.darkMode || false,
          activeTab: oldSettings.ui?.activeTab || "simple",
          ...oldSettings.ui,
        },
        defaults: {
          simple: {
            separator: "newline",
            quoting: "double",
            trim: true,
            ...oldSettings.defaults?.simple,
          },
          ...oldSettings.defaults,
        },
        templates: oldSettings.templates || [],
        performance: {
          workerCount: 2,
          streamingThreshold: 1048576,
          previewLimit: 1000,
          ...oldSettings.performance,
        },
      };

      this.onMigrationComplete(migratedSettings, oldSettings.version || "unknown");
      return migratedSettings;
    } catch (error) {
      this.onMigrationError(error);
      throw error;
    }
  }

  createBackup(settings) {
    const backupKey = `settings_backup_${Date.now()}`;
    try {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.set({ [backupKey]: settings });
      } else {
        localStorage.setItem(backupKey, JSON.stringify(settings));
      }
      this.onBackupCreated(backupKey);
      return backupKey;
    } catch (error) {
      console.warn("Failed to create settings backup:", error);
      return null;
    }
  }
}
