export const captureScreenshot = async () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];

      if (!activeTab) {
        reject(new Error('No active tab found'));
        return;
      }

      try {
        const screenshotUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png'
        });

        const response = await fetch(screenshotUrl);
        const blob = await response.blob();

        resolve({
          blob,
          url: screenshotUrl,
          title: activeTab.title,
          tabUrl: activeTab.url,
        });
      } catch (error) {
        reject(new Error('Failed to capture screenshot'));
      }
    });
  });
};
