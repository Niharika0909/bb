export const getFromStorage = (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
};

export const setInStorage = (key, value) => {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
};

export const removeFromStorage = (key) => {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
};
