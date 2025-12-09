import React, { useState, useEffect } from 'react';
import TagSelector from './TagSelector';
import StatusToast from './StatusToast';
import { captureScreenshot } from '../utils/screenshot';
import { uploadScreenshot, saveCapture } from '../utils/api';
import { clearToken } from '../utils/auth';

const SECTOR_OPTIONS = [
  'Fintech',
  'FMCG',
  'Healthtech',
  'API/Platforms',
  'Enterprise Software',
  'Other'
];

const THEME_OPTIONS = [
  'Competitive Move',
  'Customer Insight',
  'Regulation',
  'Market Shift',
  'Technology Trend',
  'Partnership',
  'Other'
];

const TYPE_OPTIONS = [
  'Finding',
  'Question',
  'Data Point',
  'Interview Note',
  'News/Signal',
  'Other'
];

export default function CaptureForm({ onLogout }) {
  const [formData, setFormData] = useState({
    prompt: '',
    notes: '',
    sector: '',
    theme: '',
    findingType: '',
  });

  const [screenshot, setScreenshot] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceTabTitle, setSourceTabTitle] = useState('');

  useEffect(() => {
    captureCurrentTab();
  }, []);

  const captureCurrentTab = async () => {
    try {
      const data = await captureScreenshot();
      setScreenshot(data.blob);
      setSourceUrl(data.tabUrl);
      setSourceTabTitle(data.title);
      showToast('✓ Screenshot captured', 'success');
    } catch (error) {
      console.error('Screenshot error:', error);
      showToast('⚠️ Could not capture screenshot', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    if (!formData.prompt.trim()) {
      showToast('❌ Prompt is required', 'error');
      return false;
    }
    if (!formData.sector) {
      showToast('❌ Sector is required', 'error');
      return false;
    }
    if (!formData.theme) {
      showToast('❌ Theme is required', 'error');
      return false;
    }
    if (!formData.findingType) {
      showToast('❌ Finding Type is required', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    showToast('Saving...', 'loading');

    try {
      let uploadedScreenshotUrl = screenshotUrl;

      // Upload screenshot if we have one and haven't uploaded it yet
      if (screenshot && !screenshotUrl) {
        const uploadResponse = await uploadScreenshot(screenshot);
        uploadedScreenshotUrl = uploadResponse.url;
        setScreenshotUrl(uploadResponse.url);
      }

      // Save capture
      await saveCapture({
        prompt: formData.prompt,
        notes: formData.notes,
        sector: formData.sector,
        theme: formData.theme,
        findingType: formData.findingType,
        screenshotUrl: uploadedScreenshotUrl,
        sourceUrl,
        sourceTabTitle,
      });

      showToast('✓ Saved successfully', 'success');

      // Reset form
      setFormData({
        prompt: '',
        notes: '',
        sector: '',
        theme: '',
        findingType: '',
      });
      setScreenshot(null);
      setScreenshotUrl('');

      // Capture new screenshot for next entry
      setTimeout(() => {
        captureCurrentTab();
      }, 500);
    } catch (error) {
      console.error('Save error:', error);
      showToast(`❌ ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      prompt: '',
      notes: '',
      sector: '',
      theme: '',
      findingType: '',
    });
    setScreenshot(null);
    setScreenshotUrl('');
    captureCurrentTab();
  };

  const handleLogout = async () => {
    await clearToken();
    onLogout();
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>MRM Research Capture</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">📝 Prompt</label>
        <textarea
          className="form-textarea"
          name="prompt"
          placeholder="What did you research?"
          value={formData.prompt}
          onChange={handleInputChange}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">📸 Screenshot</label>
        <div
          className={`screenshot-status ${
            screenshot || screenshotUrl ? 'success' : ''
          }`}
        >
          {screenshot || screenshotUrl ? '✓ Captured' : '⚠️ Not captured'}
        </div>
        <button
          className="button button-secondary"
          onClick={captureCurrentTab}
          style={{ marginTop: '8px', width: '100%' }}
        >
          🔄 Recapture
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">📌 Notes</label>
        <textarea
          className="form-textarea"
          name="notes"
          placeholder="Your observations..."
          value={formData.notes}
          onChange={handleInputChange}
        />
      </div>

      <TagSelector
        label="Sector"
        options={SECTOR_OPTIONS}
        value={formData.sector}
        onChange={(value) => setFormData((prev) => ({ ...prev, sector: value }))}
      />

      <TagSelector
        label="Theme"
        options={THEME_OPTIONS}
        value={formData.theme}
        onChange={(value) => setFormData((prev) => ({ ...prev, theme: value }))}
      />

      <TagSelector
        label="Finding Type"
        options={TYPE_OPTIONS}
        value={formData.findingType}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, findingType: value }))
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginTop: '16px',
        }}
      >
        <button
          className="button button-primary"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '⏳ Saving...' : '✓ SAVE'}
        </button>
        <button
          className="button button-secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {toast && <StatusToast message={toast.message} type={toast.type} />}
    </div>
  );
}
